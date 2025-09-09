/*
  Centralized economics calculator for payout/charge amounts.
  - Derives ETH amounts from a USD target using getEthPrice()
  - Applies a margin/rake via MARGIN_BPS
  - Respects safety clamps and env overrides
*/

import { getEthPrice } from './price';

type EconomicsConfig = {
  targetRewardUsd: number; // USD value we aim to pay out on win
  marginBps: number; // rake/spread applied to charge over payout
  maxPayoutEth: number; // safety cap
  minPayoutEth: number; // safety floor
  // Optional hard overrides (force fixed ETH values)
  overridePayoutEth?: number;
  overrideChargeEth?: number;
};

export type EconomicsResult = {
  payoutEth: number; // decimal ETH amount to pay on win
  chargeEth: number; // decimal ETH amount to charge on loss
  priceUsd: number; // current ETH/USD price
  targetRewardUsd: number;
  marginBps: number;
};

function readConfigFromEnv(): EconomicsConfig {
  const targetUsd = Number(process.env.TARGET_REWARD_USD || '0');
  const marginBps = Number(process.env.MARGIN_BPS || '400');
  const maxPayoutEth = Number(process.env.MAX_PAYOUT_ETH || '0.001');
  const minPayoutEth = Number(process.env.MIN_PAYOUT_ETH || '0.000005');

  // Optional fixed overrides for emergency/manual control
  const overridePayoutEth = process.env.PAYOUT_AMOUNT_ETH
    ? Number(process.env.PAYOUT_AMOUNT_ETH)
    : undefined;
  const overrideChargeEth = process.env.CHARGE_AMOUNT_ETH
    ? Number(process.env.CHARGE_AMOUNT_ETH)
    : undefined;

  return {
    targetRewardUsd: Number.isFinite(targetUsd) && targetUsd > 0 ? targetUsd : 0,
    marginBps: Number.isFinite(marginBps) && marginBps >= 0 ? marginBps : 0,
    maxPayoutEth: Number.isFinite(maxPayoutEth) && maxPayoutEth > 0 ? maxPayoutEth : 0.001,
    minPayoutEth: Number.isFinite(minPayoutEth) && minPayoutEth > 0 ? minPayoutEth : 0.000005,
    overridePayoutEth,
    overrideChargeEth,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function roundEth(amount: number): number {
  // Quantize to 8 decimals for clean UX and reliable parseEther downstream
  return Math.round(amount * 1e8) / 1e8;
}

/**
 * Compute economics with the following priority:
 * 1) If override envs are present (PAYOUT_AMOUNT_ETH / CHARGE_AMOUNT_ETH), use them directly
 * 2) Else, if TARGET_REWARD_USD is set, compute payout from price and apply margin
 * 3) Else, fallback to legacy default 0.00002 ETH for payout and same for charge plus margin
 */
export async function getEconomics(): Promise<EconomicsResult> {
  const cfg = readConfigFromEnv();
  const priceUsd = await getEthPrice();

  // 1) Overrides
  if (typeof cfg.overridePayoutEth === 'number' && typeof cfg.overrideChargeEth === 'number') {
    return {
      payoutEth: roundEth(cfg.overridePayoutEth),
      chargeEth: roundEth(cfg.overrideChargeEth),
      priceUsd,
      targetRewardUsd: cfg.targetRewardUsd,
      marginBps: cfg.marginBps,
    };
  }

  // 2) USD-pegged if configured
  if (cfg.targetRewardUsd > 0 && priceUsd > 0) {
    const rawPayoutEth = cfg.targetRewardUsd / priceUsd;
    const payoutEth = roundEth(clamp(rawPayoutEth, cfg.minPayoutEth, cfg.maxPayoutEth));
    const chargeEth = roundEth(payoutEth * (1 + cfg.marginBps / 10000));
    return { payoutEth, chargeEth, priceUsd, targetRewardUsd: cfg.targetRewardUsd, marginBps: cfg.marginBps };
  }

  // 3) Legacy fallback
  const fallbackPayout = typeof cfg.overridePayoutEth === 'number' ? cfg.overridePayoutEth : 0.00002;
  const payoutEth = roundEth(clamp(fallbackPayout, cfg.minPayoutEth, cfg.maxPayoutEth));
  const chargeEth = roundEth(
    typeof cfg.overrideChargeEth === 'number' ? cfg.overrideChargeEth : payoutEth * (1 + cfg.marginBps / 10000)
  );
  return { payoutEth, chargeEth, priceUsd, targetRewardUsd: cfg.targetRewardUsd, marginBps: cfg.marginBps };
}


