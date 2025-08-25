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
    const { context, isFrameReady, setFrameReady } = useMiniKit();
    const { composeCast } = useComposeCast();

    const [matchId, setMatchId] = useState<string | null>(null);
    const [match, setMatch] = useState<PvpMatch | null>(null);
    const [busy, setBusy] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const me = (address || '').toLowerCase();
    const youAreX = useMemo(() => !!(match?.player_x && match.player_x.toLowerCase() === me), [match, me]);
    const youAreO = useMemo(() => !!(match?.player_o && match.player_o.toLowerCase() === me), [match, me]);
    const mySymbol: 'X' | 'O' | null = youAreX ? 'X' : youAreO ? 'O' : null;

    // Ensure Farcaster frame is ready for context usage
    useEffect(() => {
        if (!isFrameReady) {
            setFrameReady();
        }
    }, [isFrameReady, setFrameReady]);

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
            } catch { }
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
            } catch { }
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
        try { await composeCast({ text: `Play ZeroX with me! ${url}`, embeds: [url] }); return; } catch { }
        try { await navigator.clipboard.writeText(url); } catch { }
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
        } catch { } finally { setBusy(false); }
    }, [match, address, isMyTurn, boardArr, matchId, mySymbol]);

    // Current user (host) Farcaster profile
    const hostProfile = useMemo(() => {
        const u = context?.user as unknown as { fid?: number; username?: string; displayName?: string; pfpUrl?: unknown; pfp?: unknown; profile?: { username?: unknown; displayName?: unknown; name?: unknown; pfp?: unknown; picture?: unknown } } | undefined;
        if (!u) return null;
        const username = typeof u.username === 'string' ? u.username : (typeof u.profile?.username === 'string' ? (u.profile?.username as string) : undefined);
        const displayName = typeof u.displayName === 'string' ? u.displayName : (typeof u.profile?.displayName === 'string' ? (u.profile?.displayName as string) : (typeof u.profile?.name === 'string' ? (u.profile?.name as string) : undefined));
        const maybePfp = (u?.pfpUrl ?? u?.pfp ?? u.profile?.pfp ?? u.profile?.picture) as unknown;
        let pfpUrl: string | undefined;
        if (typeof maybePfp === 'string') {
            pfpUrl = maybePfp;
        } else if (maybePfp && typeof maybePfp === 'object') {
            const candidates = ['url','src','srcUrl','original','default','small','medium','large'] as const;
            for (const k of candidates) {
                const v = (maybePfp as Record<string, unknown>)[k];
                if (typeof v === 'string') { pfpUrl = v; break; }
            }
        }
        const fallbackSeed = username || (u?.fid != null ? `fid-${u.fid}` : address || 'you');
        const src = pfpUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(fallbackSeed)}`;
        return { username, displayName, src };
    }, [context, address]);

    // Opponent derived from match addresses (no Farcaster context available)
    const opponentAddress = useMemo(() => {
        const addrX = match?.player_x?.toLowerCase();
        const addrO = match?.player_o?.toLowerCase();
        if (addrX && addrX !== me) return addrX;
        if (addrO && addrO !== me) return addrO;
        return null;
    }, [match, me]);

    const [opponentProfile, setOpponentProfile] = useState<{ username?: string; pfpUrl?: string } | null>(null);
    // When a player joins, ask their client to publish their Farcaster username/pfp to the backend so the opponent can see it
    useEffect(() => {
        (async () => {
            try {
                const u = context?.user as unknown as { username?: string; displayName?: string; pfpUrl?: unknown; pfp?: unknown; profile?: { username?: unknown; pfp?: unknown; picture?: unknown } } | undefined;
                if (!u || !address) return;
                const username = typeof u.username === 'string' ? u.username : (typeof u.profile?.username === 'string' ? (u.profile?.username as string) : undefined);
                const maybePfp = (u?.pfpUrl ?? u?.pfp ?? u.profile?.pfp ?? u.profile?.picture) as unknown;
                let pfpUrl: string | undefined;
                if (typeof maybePfp === 'string') pfpUrl = maybePfp;
                else if (maybePfp && typeof maybePfp === 'object') {
                    for (const k of ['url','src','srcUrl','original','default','small','medium','large'] as const) {
                        const v = (maybePfp as Record<string, unknown>)[k];
                        if (typeof v === 'string') { pfpUrl = v; break; }
                    }
                }
                await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address, username, pfpUrl }) });
            } catch {}
        })();
    }, [context, address]);

    // For displaying the opponent, try reading from our backend cache by their address
    useEffect(() => {
        let ignore = false;
        (async () => {
            try {
                if (!opponentAddress) { setOpponentProfile(null); return; }
                const res = await fetch(`/api/profile?address=${opponentAddress}`);
                const j = await res.json();
                if (!ignore) setOpponentProfile((j && j.profile) ? j.profile as { username?: string; pfpUrl?: string } : null);
            } catch { if (!ignore) setOpponentProfile(null); }
        })();
        return () => { ignore = true; };
    }, [opponentAddress]);

    const opponentAvatar = useMemo(() => {
        const seed = opponentAddress || 'opponent';
        return opponentProfile?.pfpUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(seed)}`;
    }, [opponentAddress, opponentProfile]);

    return (
        <>
            <div className="min-h-[100svh] relative bg-white">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -left-10 -top-3 text-[320px] font-bold leading-none text-black/5 select-none">X</div>
                    <div className="absolute -right-8 bottom-10 text-[220px] font-bold leading-none text-black/5 select-none">O</div>
                </div>
                <div className="relative max-w-md mx-auto px-4 pt-2 pb-24 min-h-[100svh] flex flex-col">
                    <div className="flex items-center justify-between mb-10">
                        <div className="text-sm font-semibold text-black">Play with Friends</div>
                        <button className="px-3 py-1.5 rounded-lg bg-[#70FF5A] text-black text-xs" onClick={handleInvite} disabled={!matchId}>Invite</button>
                    </div>

                    <div className="grid grid-cols-2 mt-10 gap-4 mb-2">
                        <div className="relative p-4 pt-10 rounded-2xl bg-white text-center">
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                                <div className="relative w-14 h-14 rounded-full ring-2 ring-white shadow-md overflow-hidden">
                                    <Image src={hostProfile?.src || `https://api.dicebear.com/7.x/identicon/svg?seed=you`} alt="you" fill className="object-cover" sizes="56px" unoptimized />
                                </div>
                            </div>
                            <div className="text-xs text-black font-semibold">{hostProfile?.username ? `@${hostProfile.username}` : 'You'}</div>
                            <button className="mt-2 w-full h-12 bg-black text-white text-2xl font-bold rounded-lg" disabled={!youAreX}>X</button>
                        </div>
                        <div className="relative p-4 pt-10 rounded-2xl bg-white text-center">
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                                <div className="relative w-14 h-14 rounded-full ring-2 ring-white shadow-md overflow-hidden">
                                    <Image src={opponentAvatar} alt="opponent" fill className="object-cover" sizes="56px" unoptimized />
                                </div>
                            </div>
                            <div className="text-xs text-black font-semibold">{opponentProfile?.username ? `@${opponentProfile.username}` : opponentAddress ? `${opponentAddress.slice(0,6)}…${opponentAddress.slice(-4)}` : (waitingForOpponent ? 'Waiting…' : 'Opponent')}</div>
                            <button className="mt-2 w-full h-12 bg-[#70FF5A] text-black text-2xl font-bold rounded-lg" disabled={!youAreO}>O</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 -mt-1">
                        <div className="flex justify-center">
                            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-black text-white text-[11px]">
                                <span>👑</span>
                                <span>Won · 0</span>
                            </div>
                        </div>
                        <div className="flex justify-center">
                            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-black text-white text-[11px]">
                                <span>👑</span>
                                <span>Won · 0</span>
                            </div>
                        </div>
                    </div>

                    <div className="mb-2 text-center text-xs text-black/60">
                        {waitingForOpponent ? 'Share the invite to start' : match?.status === 'done' ? (match?.winner ? (match.winner === mySymbol ? 'You win!' : 'You lose') : 'Draw') : (isMyTurn ? 'Your turn' : "Opponent's turn")}
                    </div>

                    <div className="flex-1 flex items-center justify-center">
                        <GameBoard
                            board={boardArr}
                            onCellClick={handleCellClick}
                            isPlayerTurn={Boolean(isMyTurn) && !busy && match?.status !== 'done'}
                            winningLine={null}
                            size={size}
                        />
                    </div>
                </div>
            </div>
            <BottomNav />
        </>
    );
}