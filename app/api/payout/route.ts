/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http, parseEther, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { supabase } from '@/lib/supabase';
import { getEconomics } from '@/lib/economics';

const CHAIN_ENV = process.env.NEXT_PUBLIC_CHAIN || 'base-sepolia';
const CHAIN = CHAIN_ENV === 'base' ? base : baseSepolia;

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || (CHAIN.id === base.id ? 'https://mainnet.base.org' : 'https://sepolia.base.org');
const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY;
const PAYOUT_AMOUNT_ETH = process.env.PAYOUT_AMOUNT_ETH || undefined;

export async function POST(req: NextRequest) {
  try {
    if (!RPC_URL || !TREASURY_PRIVATE_KEY) {
      return NextResponse.json({ error: 'Server wallet not configured' }, { status: 500 });
    }

    const body = await req.json();
    const toAddress: string | undefined = body?.address;
    const sessionId: string | undefined = body?.sessionId;

    if (!toAddress || !isAddress(toAddress)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    // Require a valid recent win session and deny payouts if unpaid losses exist
    if (supabase) {
      const addr = toAddress.toLowerCase();
      // Deny if any unpaid loss exists
      const { data: unpaid } = await supabase
        .from('game_sessions')
        .select('id')
        .eq('address', addr)
        .eq('requires_settlement', true)
        .eq('settled', false)
        .limit(1);
      if (unpaid && unpaid.length > 0) {
        return NextResponse.json({ error: 'Unpaid loss exists. Please settle first.' }, { status: 402 });
      }

      if (!sessionId) {
        return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
      }
      type WinSession = { id: string; address: string; result: 'win' | 'loss' | 'draw' | null; settled: boolean };
      const { data: sessions } = await supabase
        .from('game_sessions')
        .select('id,address,result,settled,created_at')
        .eq('id', sessionId)
        .limit(1);
      const s: WinSession | undefined = sessions && sessions.length ? (sessions[0] as WinSession) : undefined;
      if (!s || String(s.address).toLowerCase() !== addr) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
      }
      if (s.result !== 'win') {
        return NextResponse.json({ error: 'Session is not a win' }, { status: 400 });
      }
      if (s.settled === true) {
        // Idempotent: already paid
        return NextResponse.json({ ok: true, alreadyPaid: true });
      }
      // Optional: recent window check could be added if created_at is available in selection
    }

    // Faucet daily cap (per address): default 3 payouts/day unless overridden
    const dailyCap = Number(process.env.FAUCET_DAILY_CAP || '5');
    const today = new Date().toISOString().slice(0,10);
    if (supabase) {
      const { data: row } = await supabase
        .from('payout_logs')
        .select('*')
        .eq('address', toAddress.toLowerCase())
        .eq('day', today)
        .limit(1)
        .maybeSingle();
      const used = row?.count ? Number(row.count) : 0;
      if (used >= dailyCap) {
        return NextResponse.json({ error: 'Daily faucet cap reached' }, { status: 429 });
      }

      // Per-minute rate limit removed to avoid bad UX; rely on daily cap and session checks
    }

    // Compute economics; respect env override if present
    const econ = await getEconomics();
    const amountEth = typeof PAYOUT_AMOUNT_ETH === 'string' ? PAYOUT_AMOUNT_ETH : econ.payoutEth.toString();
    const valueWei = parseEther(amountEth);

    const account = privateKeyToAccount(`0x${TREASURY_PRIVATE_KEY.replace(/^0x/, '')}`);
    const wallet = createWalletClient({ account, chain: CHAIN, transport: http(RPC_URL) });

    const hash = await wallet.sendTransaction({ to: toAddress as `0x${string}`, value: valueWei });

    // Record payout usage
    if (supabase) {
      const amount = Number(PAYOUT_AMOUNT_ETH || '0');
      const { data: row } = await supabase
        .from('payout_logs')
        .select('*')
        .eq('address', toAddress.toLowerCase())
        .eq('day', today)
        .limit(1)
        .maybeSingle();
      if (!row) {
        await supabase.from('payout_logs').insert({ address: toAddress.toLowerCase(), day: today, count: 1, total_amount: amount });
      } else {
        await supabase.from('payout_logs').update({ count: (Number(row.count) + 1), total_amount: (Number(row.total_amount) + amount) }).eq('address', toAddress.toLowerCase()).eq('day', today);
      }
      // Mark session as settled/paid if provided
      if (sessionId) {
        await supabase
          .from('game_sessions')
          .update({ settled: true, tx_hash: hash })
          .eq('id', sessionId);
      }
    }

    return NextResponse.json({ hash });
  } catch (error) {
    // Do not leak sensitive error details
    return NextResponse.json({ error: 'Payout failed' }, { status: 500 });
  }
}


