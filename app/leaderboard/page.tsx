'use client';
import React, { useEffect } from 'react';
import Image from 'next/image';
import BottomNav from '../components/BottomNav';

export default function LeaderboardPage() {
  return (
    <>
      <div className="min-h-screen pt-10" style={{ backgroundColor: '#ffffff' }}>
        <LeaderboardTab />
        <SprintSection />
      </div>
      <BottomNav />
    </>
  );
}

type TopRow = { rank: number; address: string; alias?: string; pfpUrl?: string; wins: number; draws: number; losses: number; points: number };

function LeaderboardTab() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [season, setSeason] = React.useState<{ start: string; end: string } | null>(null);
  const [rows, setRows] = React.useState<Array<TopRow>>([]);
  const [countdown, setCountdown] = React.useState<string>('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/leaderboard');
        const data = await res.json();
        setSeason(data?.season ?? null);
        const rowsFromApi = (Array.isArray(data?.top) ? data.top : []) as Array<TopRow>;
        setRows(rowsFromApi);
      } catch {
        setError('Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!season?.end) return;
    const end = new Date(`${season.end}T00:00:00.000Z`).getTime();
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, end - now);
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${d}d ${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [season]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="p-4 rounded-xl border border-[#e5e7eb] bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-[#0a0a0a]">Top 10</div>
          {season && (
            <div className="text-xs text-[#4b4b4f]">Season: {season.start} → {season.end}</div>
          )}
        </div>
        {season && (
          <div className="text-xs mb-3 text-[#4b4b4f]">Ends in <span className="font-semibold text-[#70FF5A]">{countdown}</span></div>
        )}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-[#f6f7f6] animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-sm text-red-500">{error}</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-[#4b4b4f]">No entries yet.</div>
        ) : (
          <div className="divide-y divide-[#e5e7eb]">
            {rows.map((r) => {
              const rr = r as unknown as { pfpUrl?: string };
              const fallback = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent((r as any).alias || r.address)}`;
              const src = rr.pfpUrl && typeof rr.pfpUrl === 'string' ? rr.pfpUrl : fallback;
              return (
                <div key={r.rank} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-6 text-center font-bold text-[#70FF5A]">{r.rank}</div>
                    <Image src={src} alt={(r as any).alias || 'pfp'} width={42} height={42} className="rounded-md object-cover" />
                    <div className="font-semibold text-[#0a0a0a]">{(r as any).alias ? `@${(r as any).alias}` : `${r.address.slice(0,6)}…${r.address.slice(-4)}`}</div>
                  </div>
                  <div className="text-xs text-right">
                    <div className="font-semibold text-[#0a0a0a]">{r.points} pts</div>
                    <div className="text-[#4b4b4f]">W‑D‑L {r.wins}-{r.draws}-{r.losses}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SprintSection() {
  const [rows, setRows] = React.useState<Array<{ rank: number; address: string; wins: number }>>([]);
  const [endsIn, setEndsIn] = React.useState<string>('');

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const load = async () => {
      try {
        const res = await fetch('/api/sprint');
        const data = await res.json();
        if (Array.isArray(data?.top)) setRows(data.top);
        const endIso = data?.window?.end;
        if (endIso) {
          const end = new Date(endIso).getTime();
          const tick = () => {
            const diff = Math.max(0, end - Date.now());
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setEndsIn(`${m}m ${s}s`);
          };
          tick();
          if (timer) clearInterval(timer);
          timer = setInterval(tick, 1000);
        }
      } catch {}
    };
    load();
    const poll = setInterval(load, 5000);
    return () => { clearInterval(poll); if (timer) clearInterval(timer); };
  }, []);

  return (
    <div className="w-full max-w-md mx-auto mt-4">
      <div className="p-4 rounded-xl border border-[#e5e7eb] bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-[#0a0a0a]">Sprint (10 min)</div>
          <div className="text-xs text-[#4b4b4f]">Ends in <span className="font-semibold text-[#70FF5A]">{endsIn}</span></div>
        </div>
        {rows.length === 0 ? (
          <div className="text-sm text-[#4b4b4f]">No wins yet in this window.</div>
        ) : (
          <div className="divide-y divide-[#e5e7eb]">
            {rows.map((r) => (
              <div key={r.rank} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 text-center font-bold text-[#70FF5A]">{r.rank}</div>
                  <div className="font-semibold text-[#0a0a0a]">{`${r.address.slice(0,6)}…${r.address.slice(-4)}`}</div>
                </div>
                <div className="text-xs text-[#4b4b4f]">{r.wins} wins</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



