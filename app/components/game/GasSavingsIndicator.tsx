import React, { useEffect, useState } from 'react';
import { useGameSubAccount } from '@/lib/useGameSubAccount';

interface GasSavingsIndicatorProps {
  className?: string;
  showDetailed?: boolean;
}

export function GasSavingsIndicator({ className = '', showDetailed = false }: GasSavingsIndicatorProps) {
  const { gasEstimate, resultQueue } = useGameSubAccount();
  const [ethPrice, setEthPrice] = useState<number | null>(null);

  // Fetch real-time ETH price
  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        setEthPrice(data.ethereum.usd);
      } catch (error) {
        console.error('Failed to fetch ETH price:', error);
      }
    };

    fetchEthPrice();
    const interval = setInterval(fetchEthPrice, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  if (!gasEstimate || !ethPrice) return null;

  // Calculate costs
  const singleTxCost = gasEstimate.totalCostUSD / resultQueue.length;
  const batchTxCost = gasEstimate.totalCostUSD;
  const savings = singleTxCost * (resultQueue.length - 1);
  const ethAmount = Number(gasEstimate.totalCost) / 1e18;

  // Format currency
  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Format ETH
  const formatETH = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    }).format(value);
  };

  return (
    <div className={`rounded-xl border border-[#70FF5A] overflow-hidden ${className}`}>
      {/* Summary View */}
      <div className="bg-[#F1FFE8] p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-black/60">Gas Cost</div>
            <div className="text-lg font-bold text-black">
              {formatUSD(batchTxCost)}
            </div>
            <div className="text-xs text-black/40">
              {formatETH(ethAmount)} ETH
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-black/60">Savings</div>
            <div className="text-lg font-bold text-[#00A71C]">
              {formatUSD(savings)}
            </div>
            <div className="text-xs text-[#00A71C]">
              {gasEstimate.savingsPercent.toFixed(1)}% less
            </div>
          </div>
        </div>
      </div>

      {/* Detailed View */}
      {showDetailed && (
        <div className="p-4 bg-white">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-black/60">Single TX Cost</span>
              <span className="font-mono">{formatUSD(singleTxCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-black/60">Number of Results</span>
              <span className="font-mono">{resultQueue.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-black/60">Gas Price</span>
              <span className="font-mono">
                {(Number(gasEstimate.gasPrice) / 1e9).toFixed(1)} Gwei
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-black/60">ETH Price</span>
              <span className="font-mono">{formatUSD(ethPrice)}</span>
            </div>
          </div>

          <div className="mt-4 text-xs text-center text-black/40">
            Gas prices update in real-time
          </div>
        </div>
      )}
    </div>
  );
}
