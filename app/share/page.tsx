'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { GameResultCard } from '@/app/components/game/GameResultCard';
import { decodeShareData, type GameShareData } from '@/lib/farcaster-share';

function ShareContent() {
  const searchParams = useSearchParams();
  const [shareData, setShareData] = useState<GameShareData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const data = searchParams.get('data');
      if (!data) {
        setError('No share data found');
        return;
      }
      const decoded = decodeShareData(data);
      setShareData(decoded);
    } catch {
      setError('Invalid share data');
    }
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-black mb-4">Oops! Something went wrong</h1>
        <p className="text-gray-600 mb-8">{error}</p>
        <Link
          href="/"
          className="px-6 py-3 bg-[#00FF1A] text-black font-bold rounded-full hover:bg-[#00DD17] transition-colors"
        >
          Play ZeroX
        </Link>
      </div>
    );
  }

  if (!shareData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#00FF1A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-8">
      <div className="w-full max-w-md">
        <GameResultCard {...shareData} />
      </div>

      <div className="flex flex-col items-center gap-4">
        <h2 className="text-xl font-bold text-black text-center">
          Want to play ZeroX?
        </h2>
        <Link
          href="/"
          className="px-6 py-3 bg-[#00FF1A] text-black font-bold rounded-full hover:bg-[#00DD17] transition-colors"
        >
          Play Now
        </Link>
      </div>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#00FF1A] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ShareContent />
    </Suspense>
  );
}
