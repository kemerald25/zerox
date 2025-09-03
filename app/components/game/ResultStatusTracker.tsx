import React from 'react';
import { useGameSubAccount } from '@/lib/useGameSubAccount';
import { GasSavingsIndicator } from './GasSavingsIndicator';
import { BatchProgressDisplay } from './BatchProgressDisplay';

interface ResultStatusTrackerProps {
  className?: string;
}

export function ResultStatusTracker({ className = '' }: ResultStatusTrackerProps) {
  const { resultQueue, gasEstimate, isLoading } = useGameSubAccount();

  // Format currency with 2 decimal places
  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Format result for display
  const formatResult = (result: 'win' | 'loss' | 'draw') => {
    switch (result) {
      case 'win': return '🏆 Won';
      case 'loss': return '😔 Lost';
      case 'draw': return '🤝 Draw';
    }
  };

  if (resultQueue.length === 0) return null;

  return (
    <div className={`bg-white rounded-xl border border-[#70FF5A] p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-black">Queued Results</h3>
        <div className="flex items-center gap-2">
          <div className="text-sm text-black/60">
            {resultQueue.length} result{resultQueue.length !== 1 ? 's' : ''}
          </div>
          {isLoading && (
            <div className="w-4 h-4 border-2 border-[#70FF5A] border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-2 mb-4">
        {resultQueue.map((result, index) => (
          <div
            key={`${result.roomCode}-${result.timestamp}`}
            className="flex items-center justify-between p-2 rounded-lg bg-black/5"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {formatResult(result.result)}
              </span>
              <span className="text-xs text-black/60">
                vs {result.opponent.slice(0, 6)}...
              </span>
            </div>
            <div className="text-xs font-mono">
              Room: {result.roomCode}
            </div>
          </div>
        ))}
      </div>

      {/* Progress and Gas Info */}
      <div className="border-t border-black/10 pt-4 space-y-4">
        {/* Batch Progress */}
        <BatchProgressDisplay />

        {/* Gas Savings */}
        {gasEstimate && (
          <GasSavingsIndicator 
            showDetailed={resultQueue.length > 1}
          />
        )}

        <div className="text-xs text-black/40 text-center">
          Results will be processed automatically when batch is full
        </div>
      </div>
    </div>
  );
}
