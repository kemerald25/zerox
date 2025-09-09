import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createPublicClient, http, parseEther, formatEther } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { getEconomics } from '@/lib/economics';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address: string | undefined = body?.address;
    const sessionIds: string[] | undefined = Array.isArray(body?.sessionIds) ? body.sessionIds : undefined;
    const txHash: string | undefined = body?.txHash;
    if (!address || !sessionIds || sessionIds.length === 0 || !txHash) {
      return NextResponse.json({ error: 'address, sessionIds, txHash required' }, { status: 400 });
    }
    if (!supabase) return NextResponse.json({ ok: true });

    const CHAIN_ENV = process.env.NEXT_PUBLIC_CHAIN || 'base-sepolia';
    const CHAIN = CHAIN_ENV === 'base' ? base : baseSepolia;
    const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || (CHAIN.id === base.id ? 'https://mainnet.base.org' : 'https://sepolia.base.org');
    const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS as `0x${string}` | undefined;
    if (!TREASURY_ADDRESS) return NextResponse.json({ error: 'treasury not configured' }, { status: 500 });

    const publicClient = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) });
    const [econ, tx, receipt] = await Promise.all([
      getEconomics(),
      publicClient.getTransaction({ hash: txHash as `0x${string}` }),
      publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` }).catch(() => null),
    ]);

    const expectedPerWei = parseEther(econ.chargeEth.toString());
    const expectedTotalWei = expectedPerWei * BigInt(sessionIds.length);

    const toOk = tx.to && tx.to.toLowerCase() === TREASURY_ADDRESS.toLowerCase();
    const fromOk = tx.from && tx.from.toLowerCase() === address.toLowerCase();
    const valueOk = typeof tx.value === 'bigint' && tx.value >= expectedTotalWei;
    const successOk = receipt ? receipt.status === 'success' : true;
    if (!toOk || !fromOk || !valueOk || !successOk) {
      return NextResponse.json({ error: 'tx_verification_failed' }, { status: 400 });
    }

    // Mark all sessions as settled with the shared tx hash
    const { error } = await supabase
      .from('game_sessions')
      .update({ settled: true, tx_hash: txHash })
      .in('id', sessionIds);
    if (error) return NextResponse.json({ ok: false });

    // Update charge logs (per day per address)
    const today = new Date().toISOString().slice(0,10);
    const amountEth = Number(formatEther(tx.value));
    const { data: row } = await supabase
      .from('charge_logs')
      .select('*')
      .eq('address', address.toLowerCase())
      .eq('day', today)
      .limit(1)
      .maybeSingle();
    if (!row) {
      await supabase.from('charge_logs').insert({ address: address.toLowerCase(), day: today, count: sessionIds.length, total_amount: amountEth });
    } else {
      await supabase.from('charge_logs').update({ count: (Number(row.count) + sessionIds.length), total_amount: (Number(row.total_amount) + amountEth) }).eq('address', address.toLowerCase()).eq('day', today);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}


