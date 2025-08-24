import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';

function today(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// Deterministic daily seed
function dailySeedString(): string {
  return today();
}

export async function GET() {
  const seed = dailySeedString();
  // Fixed challenge: X hard by default
  return NextResponse.json({ seed, symbol: 'X', difficulty: 'hard' });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address: string | undefined = body?.address;
    const completed: boolean | undefined = body?.completed;
    const seed: string | undefined = body?.seed;
    const symbol: 'X' | 'O' | undefined = body?.symbol;
    const difficulty: 'easy' | 'hard' | undefined = body?.difficulty;
    const result: 'win' | 'loss' | 'draw' | undefined = body?.result;
    if (!address || !completed) return NextResponse.json({ error: 'address and completed required' }, { status: 400 });
    const todayStr = today();
    const key = `daily:${address.toLowerCase()}:${todayStr}`;
    // Always record attempt
    if (redis) await redis.set(key, completed ? '1' : '0', { ex: 86400 });

    // Verify eligibility: must be today's seed, hard, X, and result win
    const isEligible = completed && seed === dailySeedString() && symbol === 'X' && difficulty === 'hard' && result === 'win';
    if (!isEligible) return NextResponse.json({ ok: true, eligible: false });

    if (!redis) return NextResponse.json({ ok: true, eligible: true, paid: false });

    // Prevent double payout per day
    const paidKey = `daily_paid:${address.toLowerCase()}:${todayStr}`;
    const already = await redis.get<string>(paidKey);
    if (already === '1') return NextResponse.json({ ok: true, eligible: true, paid: false });

    // Payout from treasury
    const CHAIN_ENV = process.env.NEXT_PUBLIC_CHAIN || 'base-sepolia';
    const CHAIN = CHAIN_ENV === 'base' ? base : baseSepolia;
    const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || (CHAIN.id === base.id ? 'https://mainnet.base.org' : 'https://sepolia.base.org');
    const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY;
    const BONUS = process.env.DAILY_BONUS_ETH || process.env.PAYOUT_AMOUNT_ETH || '0.00002';
    if (!TREASURY_PRIVATE_KEY) return NextResponse.json({ error: 'treasury not configured' }, { status: 500 });

    const account = privateKeyToAccount(`0x${TREASURY_PRIVATE_KEY.replace(/^0x/, '')}`);
    const wallet = createWalletClient({ account, chain: CHAIN, transport: http(RPC_URL) });
    const hash = await wallet.sendTransaction({ to: address as `0x${string}`, value: parseEther(BONUS) });
    await redis.set(paidKey, '1', { ex: 86400 });
    return NextResponse.json({ ok: true, eligible: true, paid: true, hash });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}


