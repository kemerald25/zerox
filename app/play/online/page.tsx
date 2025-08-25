'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useAccount } from 'wagmi';
import { useMiniKit, useComposeCast } from '@coinbase/onchainkit/minikit';
import GameBoard from '@/app/components/game/GameBoard';
import BottomNav from '@/app/components/BottomNav';

type PvpMatch = {
  id: string;
  player_x?: string | null;
  player_o?: string | null;
  invited_by?: string | null;
  board: string; // JSON string
  next_turn: 'X' | 'O';
  size: number;
  misere: boolean;
  blitz: 'off' | '7s' | '5s';
  status: 'open' | 'active' | 'done';
  winner?: string | null;
};

export default function OnlinePlayPage() {
  const { address } = useAccount();
  const { context } = useMiniKit();
  const { composeCast } = useComposeCast();

  const [matchId, setMatchId] = useState<string | null>(null);
  const [match, setMatch] = useState<PvpMatch | null>(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const me = (address || '').toLowerCase();
  const youAreX = useMemo(() => !!(match?.player_x && match.player_x.toLowerCase() === me), [match, me]);
  const youAreO = useMemo(() => !!(match?.player_o && match.player_o.toLowerCase() === me), [match, me]);
  const mySymbol: 'X' | 'O' | null = youAreX ? 'X' : youAreO ? 'O' : null;

  // Create or join
  useEffect(() => {
    if (!address) return;
    (async () => {
      try {
        const url = new URL(window.location.href);
        const existing = url.searchParams.get('match_id');
        const wantJoin = url.searchParams.get('join');
        if (existing && (wantJoin === '1' || wantJoin === 'true')) {
          await fetch('/api/pvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'join', id: existing, address }) });
          setMatchId(existing);
        } else {
          const res = await fetch('/api/pvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', invited_by: address, size: 3, misere: false, blitz: 'off' }) });
          const j = await res.json();
          if (j?.match?.id) setMatchId(j.match.id as string);
        }
      } catch {}
    })();
  }, [address]);

  // Polling
  useEffect(() => {
    if (!matchId) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/pvp?id=${matchId}`);
        const j = await res.json();
        if (j?.match) setMatch(j.match as PvpMatch);
      } catch {}
    };
    load();
    pollRef.current = setInterval(load, 1200);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [matchId]);

  const boardArr: Array<string | null> = useMemo(() => {
    try { return (match?.board ? JSON.parse(match.board) : Array(9).fill(null)) as Array<string | null>; } catch { return Array(9).fill(null); }
  }, [match]);

  const size = match?.size ?? 3;
  const isMyTurn = mySymbol ? match?.next_turn === mySymbol : false;
  const waitingForOpponent = useMemo(() => Boolean(matchId && match && (!match.player_x || !match.player_o)), [matchId, match]);

  const handleInvite = async () => {
    if (!matchId) return;
    const base = process.env.NEXT_PUBLIC_URL || window.location.origin;
    const url = `${base}/play/online?match_id=${matchId}&join=1`;
    try { await composeCast({ text: `Play ZeroX with me! ${url}`, embeds: [url] }); return; } catch {}
    try { await navigator.clipboard.writeText(url); } catch {}
  };

  const handleCellClick = useCallback(async (index: number) => {
    if (!match || !address) return;
    if (!isMyTurn) return;
    if (boardArr[index] !== null) return;
    if (!matchId) return;
    if (!mySymbol) return;
    try {
      setBusy(true);
      await fetch('/api/pvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'move', id: matchId, address, index }) });
    } catch {} finally { setBusy(false); }
  }, [match, address, isMyTurn, boardArr, matchId, mySymbol]);

  const hostAvatar = useMemo(() => {
    try {
      return 'https://api.dicebear.com/7.x/identicon/svg?seed=De1Develbase_eth'; // Adjusted seed to match username
    } catch {
      return '/fallback-avatar.png'; // Fallback image if API fails
    }
  }, []);

  const opponentAvatar = useMemo(() => {
    try {
      return 'https://api.dicebear.com/7.x/identicon/svg?seed=Ovittobase_eth'; // Adjusted seed to match username
    } catch {
      return '/fallback-avatar.png'; // Fallback image if API fails
    }
  }, []);

  return (
    <>
      <div className="min-h-screen relative bg-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-10 -top-6 text-[520px] font-bold leading-none text-[#464545]/50 select-none">X</div>
          <div className="absolute -right-8 bottom-10 text-[220px] font-bold leading-none text-black/5 select-none">O</div>
        </div>
        <div className="relative max-w-md mx-auto px-4 pt-8 pb-24">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-black">Play Online</div>
            <button className="px-3 py-1.5 rounded-lg bg-[#70FF5A] text-black text-xs" onClick={handleInvite} disabled={!matchId}>Invite</button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 rounded-xl bg-white text-center">
              <Image src={hostAvatar} alt="you" width={44} height={44} className="rounded-full object-cover mx-auto mb-2" unoptimized />
              <div className="text-xs text-black font-semibold">@De1Develbase_eth</div>
              <button className="mt-2 w-full h-12 bg-black text-white text-2xl font-bold rounded-lg" disabled={!youAreX}>X</button>
            </div>
            <div className="p-3 rounded-xl bg-white text-center">
              <Image src={opponentAvatar} alt="opponent" width={44} height={44} className="rounded-full object-cover mx-auto mb-2" unoptimized />
              <div className="text-xs text-black font-semibold">@Ovittobase_eth</div>
              <button className="mt-2 w-full h-12 bg-[#70FF5A] text-black text-2xl font-bold rounded-lg" disabled={!youAreO}>O</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 -mt-1">
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-black text-white text-[11px]">
                <span>👑</span>
                <span>Won · 21</span>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-black text-white text-[11px]">
                <span>👑</span>
                <span>Won · 15</span>
              </div>
            </div>
          </div>

          <div className="mb-2 text-center text-xs text-black/60">
            {waitingForOpponent ? 'Share the invite to start' : match?.status === 'done' ? (match?.winner ? (match.winner === mySymbol ? 'You win!' : 'You lose') : 'Draw') : (isMyTurn ? 'Your turn' : "Opponent's turn")}
          </div>

          <GameBoard
            board={boardArr}
            onCellClick={handleCellClick}
            isPlayerTurn={Boolean(isMyTurn) && !busy && match?.status !== 'done'}
            winningLine={null}
            size={size}
          />
        </div>
      </div>
      <BottomNav />
    </>
  );
}