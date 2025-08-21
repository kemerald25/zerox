/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http, parseEther, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia, mainnet } from 'viem/chains';

const CHAIN_ENV = process.env.NEXT_PUBLIC_CHAIN || 'base-sepolia';
const CHAIN = CHAIN_ENV === 'base' ? base : CHAIN_ENV === 'mainnet' ? mainnet : baseSepolia;

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
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

    // Optional: cap payout to a safe maximum (prevent misconfiguration)
    const amountEth = PAYOUT_AMOUNT_ETH;
    const valueWei = parseEther(amountEth);

    const account = privateKeyToAccount(`0x${TREASURY_PRIVATE_KEY.replace(/^0x/, '')}`);
    const wallet = createWalletClient({ account, chain: CHAIN, transport: http(RPC_URL) });

    const hash = await wallet.sendTransaction({ to: toAddress as `0x${string}`, value: valueWei });

    return NextResponse.json({ hash });
  } catch (error) {
    // Do not leak sensitive error details
    return NextResponse.json({ error: 'Payout failed' }, { status: 500 });
  }
}


