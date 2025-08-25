'use client';
import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import BottomNav from '../components/BottomNav';

export default function DailyPage() {
  const [dailySeed, setDailySeed] = useState<string | null>(null);
  const { address } = useAccount();
  useEffect(() => { (async () => { try { const r = await fetch('/api/daily'); const j = await r.json(); if (typeof j?.seed === 'string') setDailySeed(j.seed); } catch {} })(); }, []);
  return (
    <>
      <div className="w-full max-w-md mx-auto pt-10 text-center">
        <div className="p-4 rounded-lg border border-[#e5e7eb] bg-white">
          <div className="text-xl font-bold mb-2 text-[#0a0a0a]">Daily Challenge</div>
          <div className="text-sm mb-2 text-[#4b4b4f]">Beat the AI on hard mode with today’s seed to earn bonus faucet and XP.</div>
          <details className="text-xs opacity-90 mb-3">
            <summary className="cursor-pointer">How it works</summary>
            <div className="mt-2 text-left text-[#4b4b4f]">
              - You must play with symbol X and difficulty Hard using today’s seed.<br/>
              - Winning auto-claims a one-time bonus to your wallet (rate-limited daily).<br/>
              - Draws/losses do not qualify, but still count for XP and streaks.
            </div>
          </details>
          <button
            className="px-5 py-3 rounded-lg bg-[#70FF5A] text-white w-full"
            disabled={!dailySeed}
            onClick={() => {
              const base = process.env.NEXT_PUBLIC_URL || window.location.origin;
              const url = `${base}/play?seed=${dailySeed}&symbol=X&difficulty=hard`;
              window.location.href = url;
            }}
          >
            {dailySeed ? 'Play Today’s Challenge' : 'Loading…'}
          </button>
          <div className="mt-4 text-sm text-[#4b4b4f]">{address ? 'Connected' : 'Connect wallet'} to track streak</div>
        </div>
      </div>
      <BottomNav />
    </>
  );
}


