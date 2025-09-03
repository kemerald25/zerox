import React, { useMemo } from 'react';
import { useGameSubAccount } from '@/lib/useGameSubAccount';

interface BatchProgressDisplayProps {
  className?: string;
  batchSize?: number;
}

export function BatchProgressDisplay({ 
  className = '', 
  batchSize = 5 // Default batch size
}: BatchProgressDisplayProps) {
  const { resultQueue, isLoading } = useGameSubAccount();

  // Calculate progress percentage
  const progress = useMemo(() => {
    return (resultQueue.length / batchSize) * 100;
  }, [resultQueue.length, batchSize]);

  // Estimate time until processing
  const estimateTimeRemaining = useMemo(() => {
    const remainingResults = batchSize - resultQueue.length;
    if (remainingResults <= 0) return 'Processing...';
    
    // Assume average of 3 minutes between games
    const estimatedMinutes = remainingResults * 3;
    if (estimatedMinutes < 60) {
      return `~${estimatedMinutes} min`;
    }
    return `~${Math.round(estimatedMinutes / 60)} hr`;
  }, [resultQueue.length, batchSize]);

  return (
    <div className={`rounded-xl border border-black/10 p-4 ${className}`}>
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-black">
            Batch Progress
          </div>
          {isLoading && (
            <div className="w-4 h-4 border-2 border-[#70FF5A] border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        <div className="text-sm text-black/60">
          {resultQueue.length} / {batchSize}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-black/5 rounded-full overflow-hidden mb-3">
        <div 
          className="absolute left-0 top-0 h-full bg-[#70FF5A] transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Status Info */}
      <div className="flex items-center justify-between text-xs">
        <div className="text-black/60">
          {resultQueue.length >= batchSize ? (
            <span className="text-[#00A71C] font-medium">Ready to process</span>
          ) : (
            <>
              {batchSize - resultQueue.length} more result{batchSize - resultQueue.length !== 1 ? 's' : ''} needed
            </>
          )}
        </div>
        <div className="text-black/40">
          {resultQueue.length < batchSize && (
            <>Est. {estimateTimeRemaining}</>
          )}
        </div>
      </div>

      {/* Batch Size Info */}
      <div className="mt-4 pt-4 border-t border-black/10">
        <div className="flex items-center justify-between text-sm">
          <div className="text-black/60">
            Optimal batch size
          </div>
          <div className="font-medium text-black">
            {batchSize} results
          </div>
        </div>
        <div className="mt-1 text-xs text-black/40">
          Batching {batchSize} results together for maximum gas savings
        </div>
      </div>
    </div>
  );
}
