/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseEther, isAddress } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { getEconomics } from '@/lib/economics';

const CHAIN_ENV = process.env.NEXT_PUBLIC_CHAIN || 'base-sepolia';
const CHAIN = CHAIN_ENV === 'base' ? base : baseSepolia;

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || (CHAIN.id === base.id ? 'https://mainnet.base.org' : 'https://sepolia.base.org');
const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS as `0x${string}` | undefined;

// For security reasons, we don't initiate a transfer FROM the user's wallet via server.
// Instead, we return payment details so the client can request wallet to send funds to the treasury.

export async function POST(req: NextRequest) {
  try {
    if (!RPC_URL || !TREASURY_ADDRESS) {
      return NextResponse.json({ error: 'Treasury not configured' }, { status: 500 });
    }

    const body = await req.json();
    const fromAddress: string | undefined = body?.address;
    const sessionId: string | undefined = body?.sessionId;
    if (!fromAddress || !isAddress(fromAddress)) {
      return NextResponse.json({ error: 'Invalid from address' }, { status: 400 });
    }

    // Per-minute rate limit removed to avoid bad UX; rely on session gating and user wallet confirmations

    // Use centralized economics for amount
    const econ = await getEconomics();
    const amountWei = parseEther(econ.chargeEth.toString());

    // Optional: verify chain is reachable
    const publicClient = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) });
    await publicClient.getChainId();

    return NextResponse.json({
      to: TREASURY_ADDRESS,
      value: amountWei.toString(),
      chainId: CHAIN.id,
      sessionId: sessionId || null,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Charge setup failed' }, { status: 500 });
  }
}


