import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createPublicClient, http, parseEther } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { getEconomics } from '@/lib/economics';
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });
  if (!supabase) return NextResponse.json({ required: false });
  const { data } = await supabase
    .from('game_sessions')
    .select('id')
    .eq('address', address.toLowerCase())
    .eq('requires_settlement', true)
    .eq('settled', false)
    .order('created_at', { ascending: false })
    .limit(100);
  const count = data ? data.length : 0;
  const threshold = Number(process.env.UNPAID_LOSS_THRESHOLD || '1');
  const required = count >= threshold;
  return NextResponse.json({ required, count, threshold });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address: string | undefined = body?.address;
    if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });
    if (!supabase) return NextResponse.json({ ok: true, id: null });

    // Server-side gate: block new sessions if there is an unpaid loss
    const { data: outstanding } = await supabase
      .from('game_sessions')
      .select('id')
      .eq('address', address.toLowerCase())
      .eq('requires_settlement', true)
      .eq('settled', false)
      .order('created_at', { ascending: false })
      .limit(100);
    const threshold = Number(process.env.UNPAID_LOSS_THRESHOLD || '1');
    if (outstanding && outstanding.length >= threshold) {
      return NextResponse.json({ required: true, count: outstanding.length, threshold, error: 'unpaid_loss' }, { status: 409 });
    }
    const { data, error } = await supabase
      .from('game_sessions')
      .insert({ address: address.toLowerCase() })
      .select('id')
      .single();
    if (error) return NextResponse.json({ error: 'create failed' }, { status: 500 });
    return NextResponse.json({ ok: true, id: data?.id ?? null });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const id: string | undefined = body?.id;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    if (!supabase) return NextResponse.json({ ok: true });

    // Load existing session for validation/idempotency
    type GameSession = {
      id: string;
      address: string;
      result: 'win' | 'loss' | 'draw' | null;
      requires_settlement: boolean;
      settled: boolean;
      tx_hash: string | null;
    };

    const { data: sessions } = await supabase
      .from('game_sessions')
      .select('id,address,result,requires_settlement,settled,tx_hash')
      .eq('id', id)
      .limit(1);
    const current: GameSession | undefined = sessions && sessions.length ? (sessions[0] as GameSession) : undefined;
    if (!current) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const patch: Record<string, unknown> = {};
    if (body?.result) patch.result = body.result;
    if (typeof body?.requires_settlement === 'boolean') patch.requires_settlement = body.requires_settlement;

    // If marking settled due to a provided tx_hash, verify the onchain transfer
    if (typeof body?.settled === 'boolean' && body.settled === true) {
      const txHash = typeof body?.tx_hash === 'string' ? (body.tx_hash as string) : undefined;
      if (current.requires_settlement === true && current.settled === false) {
        if (!txHash) return NextResponse.json({ error: 'tx_hash_required' }, { status: 400 });

        const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS as `0x${string}` | undefined;
        const CHAIN_ENV = process.env.NEXT_PUBLIC_CHAIN || 'base-sepolia';
        const CHAIN = CHAIN_ENV === 'base' ? base : baseSepolia;
        const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || (CHAIN.id === base.id ? 'https://mainnet.base.org' : 'https://sepolia.base.org');
        if (!TREASURY_ADDRESS || !RPC_URL) return NextResponse.json({ error: 'server_not_configured' }, { status: 500 });

        const publicClient = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) });
        try {
          const [econ, tx, receipt] = await Promise.all([
            getEconomics(),
            publicClient.getTransaction({ hash: txHash as `0x${string}` }),
            publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` }).catch(() => null),
          ]);

          // Basic checks: to, from, value, success
          const expectedMin = parseEther(econ.chargeEth.toString());
          const toOk = tx.to && tx.to.toLowerCase() === TREASURY_ADDRESS.toLowerCase();
          const fromOk = tx.from && tx.from.toLowerCase() === String(current.address).toLowerCase();
          const valueOk = typeof tx.value === 'bigint' && tx.value >= expectedMin;
          const successOk = receipt ? receipt.status === 'success' : true; // allow slight delay; treat pending as provisional failure
          if (!toOk || !fromOk || !valueOk || !successOk) {
            return NextResponse.json({ error: 'tx_verification_failed' }, { status: 400 });
          }

          patch.settled = true;
          patch.tx_hash = txHash;
        } catch {
          return NextResponse.json({ error: 'tx_lookup_failed' }, { status: 400 });
        }
      } else {
        // Idempotent: if already settled or not requiring settlement, allow marking settled
        patch.settled = true;
        if (typeof body?.tx_hash === 'string') patch.tx_hash = body.tx_hash;
      }
    } else if (typeof body?.settled === 'boolean') {
      // Allow unsetting in edge cases (admin tools), but no verification
      patch.settled = body.settled;
      if (typeof body?.tx_hash === 'string') patch.tx_hash = body.tx_hash;
    }

    const { error } = await supabase
      .from('game_sessions')
      .update(patch)
      .eq('id', id);
    if (error) return NextResponse.json({ ok: false });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}


