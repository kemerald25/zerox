/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server';
import { getEconomics } from '@/lib/economics';

export async function GET() {
  try {
    const econ = await getEconomics();
    return NextResponse.json({
      payoutEth: econ.payoutEth,
      chargeEth: econ.chargeEth,
      priceUsd: econ.priceUsd,
      targetRewardUsd: econ.targetRewardUsd,
      marginBps: econ.marginBps,
      // Stringified helpers for UI copy
      payoutEthStr: econ.payoutEth.toFixed(6),
      chargeEthStr: econ.chargeEth.toFixed(6),
      priceUsdStr: `$${econ.priceUsd.toFixed(2)}`,
    });
  } catch (error) {
    return NextResponse.json({ error: 'config_unavailable' }, { status: 500 });
  }
}


