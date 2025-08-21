/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, parseEther, isAddress } from 'viem';
import { base, baseSepolia, mainnet } from 'viem/chains';

const CHAIN_ENV = process.env.NEXT_PUBLIC_CHAIN || 'base-sepolia';
const CHAIN = CHAIN_ENV === 'base' ? base : CHAIN_ENV === 'mainnet' ? mainnet : baseSepolia;

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS as `0x${string}` | undefined;
const CHARGE_AMOUNT_ETH = process.env.CHARGE_AMOUNT_ETH || process.env.PAYOUT_AMOUNT_ETH || '0.00002';

// For security reasons, we don't initiate a transfer FROM the user's wallet via server.
// Instead, we return payment details so the client can request wallet to send funds to the treasury.

export async function POST(req: NextRequest) {
  try {
    if (!RPC_URL || !TREASURY_ADDRESS) {
      return NextResponse.json({ error: 'Treasury not configured' }, { status: 500 });
    }

    const body = await req.json();
    const fromAddress: string | undefined = body?.address;
    if (!fromAddress || !isAddress(fromAddress)) {
      return NextResponse.json({ error: 'Invalid from address' }, { status: 400 });
    }

    const amountWei = parseEther(CHARGE_AMOUNT_ETH);

    // Optional: verify chain is reachable
    const publicClient = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) });
    await publicClient.getChainId();

    return NextResponse.json({
      to: TREASURY_ADDRESS,
      value: amountWei.toString(),
      chainId: CHAIN.id,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Charge setup failed' }, { status: 500 });
  }
}


