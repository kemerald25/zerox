/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http, parseEther, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { supabase } from '@/lib/supabase';

const CHAIN_ENV = process.env.NEXT_PUBLIC_CHAIN || 'base-sepolia';
const CHAIN = CHAIN_ENV === 'base' ? base : baseSepolia;

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || (CHAIN.id === base.id ? 'https://mainnet.base.org' : 'https://sepolia.base.org');
const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY;
const PAYOUT_AMOUNT_ETH = process.env.PAYOUT_AMOUNT_ETH || '0.00002';

export async function POST(req: NextRequest) {
  try {
    if (!RPC_URL || !TREASURY_PRIVATE_KEY) {
      return NextResponse.json({ error: 'Server wallet not configured' }, { status: 500 });
    }

    const body = await req.json();
    const toAddress: string | undefined = body?.address;

    if (!toAddress || !isAddress(toAddress)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    // Faucet daily cap (per address): default 3 payouts/day unless overridden
    const dailyCap = Number(process.env.FAUCET_DAILY_CAP || '3');
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
    }

    // Optional: cap payout to a safe maximum (prevent misconfiguration)
    const amountEth = PAYOUT_AMOUNT_ETH;
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
    }

    return NextResponse.json({ hash });
  } catch (error) {
    // Do not leak sensitive error details
    return NextResponse.json({ error: 'Payout failed' }, { status: 500 });
  }
}


