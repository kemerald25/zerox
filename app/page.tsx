'use client';

import { useScoreboard } from '@/lib/useScoreboard';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { sdk } from '@farcaster/miniapp-sdk';
import Link from 'next/link';
import GameBoard from './components/game/GameBoard';
import BottomNav from './components/BottomNav';
import GameControls from './components/game/GameControls';
import GameStatus from './components/game/GameStatus';
import { WalletCheck } from './components/WalletCheck';
import { playMove, playAIMove, playWin, playLoss, playDraw, resumeAudio, playWarning } from '@/lib/sound';
import { hapticTap, hapticWin, hapticLoss } from '@/lib/haptics';
import { useAccount, useSendTransaction } from 'wagmi';
import { useMiniKit, useIsInMiniApp, useComposeCast, useViewProfile } from '@coinbase/onchainkit/minikit';

export default function Home() {
  useEffect(() => {
    sdk.actions.ready();
  }, []);
  const [boardSize, setBoardSize] = useState<3 | 4 | 5>(3);
  const [board, setBoard] = useState<Array<string | null>>(Array(3 * 3).fill(null));
  const [playerSymbol, setPlayerSymbol] = useState<'X' | 'O' | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'hard' | null>(null);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost' | 'draw'>('playing');
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [outcomeHandled, setOutcomeHandled] = useState(false);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [misere, setMisere] = useState(false);
  const [blitzPreset, setBlitzPreset] = useState<'off' | '7s' | '5s'>('off');
  const [nextStarter, setNextStarter] = useState<'player' | 'ai'>('player');
  const computeTurnLimit = useCallback(() => (blitzPreset === '5s' ? 5 : blitzPreset === '7s' ? 7 : 15), [blitzPreset]);
  // series state removed
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [dailySeed, setDailySeed] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  // Power-ups state
  const [hintIndex, setHintIndex] = useState<number | null>(null);
  const [blockedCellIndex, setBlockedCellIndex] = useState<number | null>(null);
  const [selectingBlock, setSelectingBlock] = useState(false);
  const [doubleActive, setDoubleActive] = useState(false);
  const [doublePendingSecond, setDoublePendingSecond] = useState(false);
  const [usedBlock, setUsedBlock] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [usedDouble, setUsedDouble] = useState(false);
  // Play page only (tabs split into routes)

  const startNewGameRound = useCallback(() => {
    const n = boardSize;
    setBoard(Array(n * n).fill(null));
    setWinningLine(null);
    setGameStatus('playing');
    setIsPlayerTurn(nextStarter === 'player');
    setSecondsLeft(computeTurnLimit());
    setOutcomeHandled(false);
    setSessionId(null);
    // reset power-ups
    setHintIndex(null);
    setBlockedCellIndex(null);
    setSelectingBlock(false);
    setDoubleActive(false);
    setDoublePendingSecond(false);
    setUsedBlock(false);
    setUsedHint(false);
    setUsedDouble(false);
    // alternate who starts next round
    setNextStarter((s) => (s === 'player' ? 'ai' : 'player'));
  }, [boardSize, computeTurnLimit, nextStarter]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const { context, isFrameReady, setFrameReady } = useMiniKit();
  const { isInMiniApp } = useIsInMiniApp();
  const { composeCast } = useComposeCast();
  const viewProfile = useViewProfile();
  // Simple toast
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2000); }, []);

  // Farcaster user profile (robust extraction similar to Navbar)
  const fcProfile = useMemo(() => {
    const u = context?.user as unknown as { fid?: number; username?: unknown; displayName?: unknown; pfpUrl?: unknown; pfp?: unknown; profile?: Record<string, unknown> } | undefined;
    if (!u) return null;
    const username = typeof u.username === 'string' ? u.username : (typeof u.profile?.username === 'string' ? (u.profile?.username as string) : undefined);
    const displayName = typeof u.displayName === 'string' ? u.displayName : (typeof u.profile?.displayName === 'string' ? (u.profile?.displayName as string) : (typeof u.profile?.name === 'string' ? (u.profile?.name as string) : undefined));
    const maybePfp = (u as any)?.pfpUrl ?? (u as any)?.pfp ?? u.profile?.pfp ?? u.profile?.picture;
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
    const fallbackSeed = username || (u.fid != null ? `fid-${u.fid}` : address || 'player');
    const src = pfpUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(fallbackSeed)}`;
    return { username, displayName, src };
  }, [context, address]);

  useEffect(() => {
    if (!isFrameReady) setFrameReady();
  }, [isFrameReady, setFrameReady]);

  // Prompt to add Mini App after ~5s if not already added
  const [showAddPrompt, setShowAddPrompt] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isInMiniApp && context?.client && context.client.added === false) {
      timer = setTimeout(() => setShowAddPrompt(true), 5000);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [isInMiniApp, context]);

  // Share handlers reused in main UI and modal
  const handleShareResult = useCallback(async () => {
    const appUrl = process.env.NEXT_PUBLIC_URL || window.location.origin;
    const resultText = gameStatus === 'won' ? 'I won!' : gameStatus === 'lost' ? 'I lost!' : "It's a draw!";
    const text = `${resultText} ZeroX vs AI (${difficulty}). Play here: ${appUrl}`;
    const payload: { text: string; embeds?: [string] } = { text, embeds: [appUrl] as [string] };
    try {
      await composeCast(payload);
      return;
    } catch {}
    try {
      await (sdk as unknown as { actions?: { composeCast?: (p: { text: string; embeds?: [string] }) => Promise<void> } }).actions?.composeCast?.(payload);
      return;
    } catch {}
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  }, [composeCast, gameStatus, difficulty]);

  const handleShareChallenge = useCallback(async () => {
    const base = process.env.NEXT_PUBLIC_URL || window.location.origin;
    const seed = `${Date.now()}`;
    const url = `${base}?seed=${seed}&symbol=${playerSymbol}&difficulty=${difficulty}`;
    const payload: { text: string; embeds?: [string] } = { text: `Challenge me in ZeroX! ${url}`, embeds: [url] as [string] };
    try { await composeCast(payload); return; } catch {}
    try { await (sdk as unknown as { actions?: { composeCast?: (p: { text: string; embeds?: [string] }) => Promise<void> } }).actions?.composeCast?.(payload); return; } catch {}
    try { await navigator.clipboard.writeText(url); } catch {}
  }, [composeCast, playerSymbol, difficulty]);

  // Post results to leaderboard
  useEffect(() => {
    const post = async () => {
      if (!address) return;
      if (!(gameStatus === 'won' || gameStatus === 'lost' || gameStatus === 'draw')) return;
      try {
        const alias = context?.user && typeof context.user.username === 'string' ? context.user.username : undefined;
        // Derive pfpUrl from context like in Navbar
        let pfpUrl: string | undefined;
        const u = context?.user as unknown as { pfpUrl?: unknown; pfp?: unknown; profile?: { pfp?: unknown; picture?: unknown } } | undefined;
        const maybePfp = u?.pfpUrl ?? u?.pfp ?? u?.profile?.pfp ?? u?.profile?.picture;
        if (typeof maybePfp === 'string') pfpUrl = maybePfp;
        else if (maybePfp && typeof maybePfp === 'object') {
          const cand = (['url','src','original','default','small','medium','large'] as const)
            .map((k) => (maybePfp as Record<string, unknown>)[k])
            .find((v) => typeof v === 'string');
          if (typeof cand === 'string') pfpUrl = cand;
        }
        await fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, result: gameStatus === 'won' ? 'win' : gameStatus === 'lost' ? 'loss' : 'draw', alias, pfpUrl })
        });
      } catch {}
    };
    post();
  }, [address, gameStatus, context]);

  // Post wins to sprint window
  useEffect(() => {
    const post = async () => {
      if (!address) return;
      if (gameStatus !== 'won') return;
      try {
        await fetch('/api/sprint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, result: 'win' })
        });
        try { showToast('Posted win to Sprint'); } catch {}
      } catch {}
    };
    post();
  }, [address, gameStatus, blitzPreset, showToast]);

  // Gate gameplay if an unpaid loss settlement exists
  const [mustSettle, setMustSettle] = useState(false);
  const [settlingLoss, setSettlingLoss] = useState(false);
  useEffect(() => {
    const check = async () => {
      if (!address) { setMustSettle(false); return; }
      try {
        const res = await fetch(`/api/settlement?address=${address}`);
        const data = await res.json();
        setMustSettle(Boolean(data?.required));
      } catch { setMustSettle(false); }
    };
    check();
  }, [address, gameStatus, blitzPreset]);

  // Hide add-mini-app prompt if payment is required so it doesn't block clicks
  useEffect(() => {
    if (mustSettle) setShowAddPrompt(false);
  }, [mustSettle]);

  // Read challenge params from URL to prefill
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const symbolParam = url.searchParams.get('symbol');
      const difficultyParam = url.searchParams.get('difficulty');
      if ((symbolParam === 'X' || symbolParam === 'O') && !playerSymbol) setPlayerSymbol(symbolParam);
      if ((difficultyParam === 'easy' || difficultyParam === 'hard') && !difficulty) setDifficulty(difficultyParam);
    } catch {}
  }, [playerSymbol, difficulty]);

  const checkWinner = useCallback((squares: Array<string | null>): string | null => {
    const n = boardSize;
    const inRow = n === 3 ? 3 : 4; // 4-in-a-row for 4x4/5x5
    const dirs = [
      [1, 0], // right
      [0, 1], // down
      [1, 1], // diag down-right
      [1, -1] // diag up-right
    ];
    const index = (x: number, y: number) => y * n + x;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const start = squares[index(x, y)];
        if (!start) continue;
        for (const [dx, dy] of dirs) {
          const cells: number[] = [index(x, y)];
          let k = 1;
          while (k < inRow) {
            const nx = x + dx * k;
            const ny = y + dy * k;
            if (nx < 0 || ny < 0 || nx >= n || ny >= n) break;
            const ii = index(nx, ny);
            if (squares[ii] !== start) break;
            cells.push(ii);
            k++;
          }
          if (cells.length === inRow) {
            setWinningLine(cells);
            return start;
          }
        }
      }
    }
    return null;
  }, [boardSize]);

  const getAvailableMoves = useCallback((squares: Array<string | null>): number[] => {
    return squares.reduce<number[]>((moves, cell, index) => 
      cell === null ? [...moves, index] : moves, []);
  }, []);

  const minimax = useCallback((squares: Array<string | null>, isMax: boolean): number => {
    const winner = checkWinner(squares);
    if (winner === playerSymbol) return misere ? 1 : -1;
    if (winner === (playerSymbol === 'X' ? 'O' : 'X')) return misere ? -1 : 1;
    if (getAvailableMoves(squares).length === 0) return 0;

    const moves = getAvailableMoves(squares);
    const scores = moves.map(move => {
      const newSquares = [...squares];
      newSquares[move] = isMax ? (playerSymbol === 'X' ? 'O' : 'X') : playerSymbol;
      return minimax(newSquares, !isMax);
    });

    return isMax ? Math.max(...scores) : Math.min(...scores);
  }, [playerSymbol, checkWinner, getAvailableMoves, misere]);

  const getAIMove = useCallback((squares: Array<string | null>): number => {
    let availableMoves = getAvailableMoves(squares);
    if (blockedCellIndex !== null) {
      availableMoves = availableMoves.filter((i) => i !== blockedCellIndex);
    }
    if (availableMoves.length === 0) return -1;

    if (difficulty === 'easy') {
      return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }

    // Hard mode uses minimax
    let bestScore = -Infinity;
    let bestMove = availableMoves[0];

    for (const move of availableMoves) {
      const newSquares = [...squares];
      newSquares[move] = playerSymbol === 'X' ? 'O' : 'X';
      const score = minimax(newSquares, false);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }, [difficulty, playerSymbol, minimax, getAvailableMoves, blockedCellIndex]);

  const getBestPlayerMove = useCallback((squares: Array<string | null>): number => {
    const moves = getAvailableMoves(squares);
    if (moves.length === 0) return -1;
    // Evaluate from player's perspective: choose move minimizing AI advantage
    let best = moves[0];
    let bestScore = Infinity;
    for (const m of moves) {
      const next = [...squares];
      next[m] = playerSymbol;
      const score = minimax(next, true);
      if (score < bestScore) { bestScore = score; best = m; }
    }
    return best;
  }, [getAvailableMoves, playerSymbol, minimax]);

  const { recordResult } = useScoreboard();

  const handleCellClick = async (index: number) => {
    if (mustSettle) return;
    if (gameStatus !== 'playing') return;

    // If selecting a block target before ending turn
    if (selectingBlock && isPlayerTurn && !board[index] && blockedCellIndex === null) {
      setBlockedCellIndex(index);
      setSelectingBlock(false);
      setUsedBlock(true);
      playWarning();
      return;
    }

    if (!isPlayerTurn || board[index]) return;

    // Ensure audio is unlocked on user gesture
    resumeAudio();
    hapticTap();

    // Ensure a game session exists
    if (!sessionId && address) {
      try {
        const res = await fetch('/api/gamesession', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address }) });
        const data = await res.json();
        if (data?.id) setSessionId(data.id as string);
      } catch {}
    }

    // Double move logic
    if (doubleActive && !doublePendingSecond) {
      const newBoard = [...board];
      newBoard[index] = playerSymbol;
      setBoard(newBoard);
      playMove();
      // If this immediately ends the game, finish now
      const winner = checkWinner(newBoard);
      if (winner) {
        const isWin = winner === playerSymbol;
        setGameStatus(isWin ? 'won' : 'lost');
        recordResult(isWin ? 'win' : 'loss');
        if (sessionId) {
          try { await fetch('/api/gamesession', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sessionId, result: isWin ? 'win' : 'loss', settled: isWin }) }); } catch {}
        }
        setDoubleActive(false);
        setDoublePendingSecond(false);
        return;
      }
      if (getAvailableMoves(newBoard).length === 0) {
        setGameStatus('draw');
        recordResult('draw');
        if (sessionId) {
          try { await fetch('/api/gamesession', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sessionId, result: 'draw', settled: true }) }); } catch {}
        }
        setDoubleActive(false);
        setDoublePendingSecond(false);
        return;
      }
      // Stay on player's turn for second move
      setDoublePendingSecond(true);
      return;
    }

    if (doubleActive && doublePendingSecond) {
      if (board[index]) return;
      const temp = [...board];
      temp[index] = playerSymbol;
      // Cannot win on 2nd move
      if (checkWinner(temp) === playerSymbol) {
        playWarning();
        return;
      }
      setBoard(temp);
      setIsPlayerTurn(false);
      setDoubleActive(false);
      setDoublePendingSecond(false);
      setUsedDouble(true);
      playMove();

      const winner2 = checkWinner(temp);
      if (winner2) {
        const isWin = winner2 === playerSymbol;
        setGameStatus(isWin ? 'won' : 'lost');
        recordResult(isWin ? 'win' : 'loss');
        if (sessionId) {
          try { await fetch('/api/gamesession', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sessionId, result: isWin ? 'win' : 'loss', settled: isWin }) }); } catch {}
        }
        return;
      }
      if (getAvailableMoves(temp).length === 0) {
        setGameStatus('draw');
        recordResult('draw');
        if (sessionId) {
          try { await fetch('/api/gamesession', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sessionId, result: 'draw', settled: true }) }); } catch {}
        }
        return;
      }
      return;
    }

    // Normal single-move flow
    const newBoard = [...board];
    newBoard[index] = playerSymbol;
    setBoard(newBoard);
    setIsPlayerTurn(false);

    // Player move sound
    playMove();

    const winner = checkWinner(newBoard);
    if (winner) {
      const isWin = winner === playerSymbol;
      setGameStatus(isWin ? 'won' : 'lost');
      recordResult(isWin ? 'win' : 'loss');
      // Update session on immediate result
      if (sessionId) {
        try {
          await fetch('/api/gamesession', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sessionId, result: isWin ? 'win' : 'loss', settled: isWin }) });
        } catch {}
      }
      return;
    }
    if (getAvailableMoves(newBoard).length === 0) {
      setGameStatus('draw');
      recordResult('draw');
      if (sessionId) {
        try { await fetch('/api/gamesession', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sessionId, result: 'draw', settled: true }) }); } catch {}
      }
      return;
    }
  };

  useEffect(() => {
    if (!isPlayerTurn && gameStatus === 'playing') {
      if (mustSettle) return;
      const timer = setTimeout(async () => {
        const aiMove = getAIMove(board);
        if (aiMove !== -1) {
          const newBoard = [...board];
          newBoard[aiMove] = playerSymbol === 'X' ? 'O' : 'X';
          setBoard(newBoard);
          // Clear one-turn block after AI moves
          if (blockedCellIndex !== null) setBlockedCellIndex(null);

          // AI move sound
          playAIMove();

          const winner = checkWinner(newBoard);
          if (winner) {
            const didPlayerWin = winner === playerSymbol;
            setGameStatus(didPlayerWin ? 'won' : 'lost');
            // Record AI-determined outcome
            recordResult(didPlayerWin ? 'win' : 'loss');
            if (sessionId) {
              (async () => { try { await fetch('/api/gamesession', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sessionId, result: didPlayerWin ? 'win' : 'loss', settled: didPlayerWin }) }); } catch {} })();
            }
          } else if (getAvailableMoves(newBoard).length === 0) {
            setGameStatus('draw');
            // Record draw when determined on AI turn
            recordResult('draw');
            if (sessionId) {
              (async () => { try { await fetch('/api/gamesession', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sessionId, result: 'draw', settled: true }) }); } catch {} })();
            }
          }
        }
        setIsPlayerTurn(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [board, isPlayerTurn, playerSymbol, getAIMove, gameStatus, checkWinner, getAvailableMoves, recordResult, mustSettle, sessionId, blockedCellIndex]);

  // Outcome sounds
  useEffect(() => {
    if (gameStatus === 'won') {
      playWin();
      hapticWin();
      // Auto-start a new round shortly after a win
      const id = setTimeout(() => {
        startNewGameRound();
      }, 1200);
      return () => clearTimeout(id);
    } else if (gameStatus === 'lost') {
      playLoss();
      hapticLoss();
      // Auto-start a new round shortly after a loss
      const id = setTimeout(() => {
        startNewGameRound();
      }, 1200);
      return () => clearTimeout(id);
    } else if (gameStatus === 'draw') {
      playDraw();
      // Auto-start a new round shortly after a draw
      const id = setTimeout(() => {
        startNewGameRound();
      }, 1200);
      return () => clearTimeout(id);
    }
  }, [gameStatus, startNewGameRound]);

  // Series removed

  // Update progress XP/streak/achievements
  useEffect(() => {
    const run = async () => {
      if (!address) return;
      if (gameStatus === 'won' || gameStatus === 'lost' || gameStatus === 'draw') {
        try {
          const xpBonus = (blitzPreset === '5s' ? 4 : blitzPreset === '7s' ? 2 : 0);
          const res = await fetch('/api/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, result: gameStatus === 'won' ? 'win' : gameStatus === 'lost' ? 'loss' : 'draw', xpBonus })
          });
          const data = await res.json();
          if (data?.xp != null) {
            setXp(Number(data.xp));
            setLevel(Number(data.level));
            setStreak(Number(data.streak));
          }
          // If daily eligible and this was a win on hard with today's seed, try bonus claim
          if (gameStatus === 'won') {
            const url = new URL(window.location.href);
            const seed = url.searchParams.get('seed') ?? undefined;
            const symbolParam = url.searchParams.get('symbol');
            const diffParam = url.searchParams.get('difficulty');
            const symbol = symbolParam === 'X' || symbolParam === 'O' ? symbolParam : undefined;
            const difficultySel = diffParam === 'easy' || diffParam === 'hard' ? diffParam : undefined;
            if (seed && symbol === 'X' && difficultySel === 'hard') {
              try {
                await fetch('/api/daily', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ address, completed: true, seed, symbol, difficulty: difficultySel, result: 'win' })
                });
              } catch {}
            }
          }
        } catch {}
      } else if (address) {
        try {
          const res = await fetch(`/api/progress?address=${address}`);
          const data = await res.json();
          if (data?.xp != null) {
            setXp(Number(data.xp));
            setLevel(Number(data.level));
            setStreak(Number(data.streak));
          }
        } catch {}
      }
    };
    run();
  }, [address, gameStatus, blitzPreset]);

  // Daily challenge seed
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/daily');
        const data = await res.json();
        if (typeof data?.seed === 'string') setDailySeed(data.seed);
      } catch {}
    };
    load();
  }, []);

  // Payout/charge handling on game end
  useEffect(() => {
    const handleWinPayout = async (playerAddress: string) => {
      try {
        const r = await fetch('/api/payout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: playerAddress }),
        });
        if (r.ok) { try { showToast('Winner payout sent'); } catch {} } else {
          try { const j = await r.json(); showToast(j?.error || 'Payout failed'); } catch { showToast('Payout failed'); }
        }
      } catch {}
    };

    const handleLossCharge = async (playerAddress: string) => {
      try {
        const res = await fetch('/api/charge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: playerAddress }),
        });
        const data = await res.json();
        if (data?.to && data?.value) {
          await sendTransactionAsync({ to: data.to as `0x${string}`, value: BigInt(data.value) });
          try { showToast('Loss settlement sent'); } catch {}
          try { await fetch('/api/settlement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: playerAddress, required: false }) }); } catch {}
          if (sessionId) {
            try { await fetch('/api/gamesession', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sessionId, settled: true, tx_hash: (data.hash ?? undefined) }) }); } catch {}
          }
          // Auto-start a new round after successful settlement
          startNewGameRound();
        } else {
          try { await fetch('/api/settlement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: playerAddress, required: true }) }); } catch {}
          setMustSettle(true);
          try { showToast('Payment required to continue'); } catch {}
          if (sessionId) {
            try { await fetch('/api/gamesession', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sessionId, requires_settlement: true }) }); } catch {}
          }
        }
      } catch {
        try { await fetch('/api/settlement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: playerAddress, required: true }) }); } catch {}
        setMustSettle(true);
        try { showToast('Transaction failed'); } catch {}
        if (sessionId) {
          try { await fetch('/api/gamesession', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sessionId, requires_settlement: true }) }); } catch {}
        }
      }
    };

    if ((gameStatus === 'won' || gameStatus === 'lost') && !outcomeHandled && address) {
      setOutcomeHandled(true);
      if (gameStatus === 'won') {
        handleWinPayout(address);
      } else if (gameStatus === 'lost') {
        handleLossCharge(address);
      }
    }
  }, [gameStatus, address, outcomeHandled, sendTransactionAsync, sessionId, startNewGameRound, showToast]);

  // handleReset no longer used after series removal

  // Start a new round automatically after game ends, preserving symbol and difficulty
  // startNextRound removed

  // Turn timer logic
  useEffect(() => {
    if (gameStatus !== 'playing') {
      setSecondsLeft(null);
      return;
    }
    // Initialize when player's turn starts
    if (isPlayerTurn) {
      setSecondsLeft((prev) => (typeof prev === 'number' ? prev : computeTurnLimit()));
    }
  }, [gameStatus, isPlayerTurn, computeTurnLimit]);

  useEffect(() => {
    if (gameStatus !== 'playing' || !isPlayerTurn || typeof secondsLeft !== 'number') return;
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => {
      const next = secondsLeft - 1;
      setSecondsLeft(next);
      if (next === 3 || next === 1) {
        playWarning();
      }
      if (next <= 0) {
        // Auto-skip: AI moves if player times out
        setIsPlayerTurn(false);
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [secondsLeft, gameStatus, isPlayerTurn]);

  // remove auto-advance; handled via rematch modal

  // Account for bottom nav height + safe area
  const bottomInset = (context?.client?.safeAreaInsets?.bottom ?? 0);
  const bottomNavHeight = 64 + bottomInset;

  return (
    <>
    <main className="min-h-screen p-4 flex flex-col items-center" style={{ paddingBottom: bottomNavHeight }}>
      <WalletCheck>
        {toast && (
          <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded bg-[#70FF5A] text-white shadow">
            {toast}
          </div>
        )}
        <h1 className="text-4xl font-bold mb-3" style={{ color: '#000000' }}>
          ZeroX
        </h1>
        {fcProfile && (
          <div className="w-full max-w-md mb-5 flex items-center gap-3 p-3 rounded-xl bg-white border border-[#e5e7eb]">
            <Image src={fcProfile.src} alt={fcProfile.username || 'pfp'} width={40} height={40} className="rounded-md object-cover" />
            <div className="leading-tight">
              <div className="font-semibold text-[#0a0a0a]">{fcProfile.displayName || fcProfile.username || 'Player'}</div>
              {fcProfile.username && <div className="text-xs text-[#4b4b4f]">@{fcProfile.username}</div>}
            </div>
          </div>
        )}
        
        {showAddPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl w-80 text-center">
              <div className="text-lg font-bold mb-2" style={{ color: '#70FF5A' }}>Add this Mini App?</div>
              <div className="text-sm mb-4" style={{ color: '#000000' }}>
                Quickly access ZeroX from your apps screen.
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  className="px-4 py-2 rounded-lg bg-[#70FF5A] text-white"
                  onClick={async () => {
                    try { await sdk.actions.addMiniApp(); } catch {}
                    setShowAddPrompt(false);
                  }}
                >
                  Add Mini App
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-[#b6f569] text-[#70FF5A] border border-[#70FF5A]"
                  onClick={() => setShowAddPrompt(false)}
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        )}
        
      {/* Play page content */}
      <div className="w-full flex flex-col items-center" style={{ minHeight: `calc(100vh - ${bottomNavHeight}px - 80px)` }}>
        {mustSettle && (
          <div className="mb-3 w-full max-w-md p-3 rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm">
            Payment required to continue. Please complete the previous loss transaction.
            <div className="mt-2 flex justify-center">
              <button
                className={`px-4 py-2 rounded bg-red-600 text-white ${settlingLoss ? 'opacity-60 cursor-wait' : ''}`}
                disabled={settlingLoss}
                onClick={async () => {
                  if (!address) { try { showToast('Connect your wallet first'); } catch {} return; }
                  setSettlingLoss(true);
                  try {
                    const res = await fetch('/api/charge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address }) });
                    const data = await res.json();
                    if (data?.to && data?.value) {
                      const txHash = await sendTransactionAsync({ to: data.to as `0x${string}`, value: BigInt(data.value) });
                      try { showToast('Loss settlement sent'); } catch {}
                      try { await fetch('/api/settlement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address, required: false }) }); } catch {}
                      setMustSettle(false);
                      // Optionally record tx on latest session
                      if (sessionId) { try { await fetch('/api/gamesession', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sessionId, settled: true, tx_hash: txHash as string }) }); } catch {} }
                    } else {
                      try { showToast('Settlement quote unavailable'); } catch {}
                    }
                  } catch {
                    try { showToast('Transaction failed'); } catch {}
                  } finally {
                    setSettlingLoss(false);
                  }
                }}
              >
                {settlingLoss ? 'Processing…' : 'Complete previous transaction'}
              </button>
            </div>
          </div>
        )}
        <GameControls
        onSymbolSelect={setPlayerSymbol}
        onDifficultySelect={setDifficulty}
        selectedSymbol={playerSymbol}
        selectedDifficulty={difficulty}
      />
      {playerSymbol && difficulty && (
        <>
          <div className="mb-3 flex items-center justify-center gap-3 flex-wrap" style={{ color: '#70FF5A' }}>
            <div className="w-full text-center text-sm opacity-80">
              {(() => {
                const payout = process.env.NEXT_PUBLIC_PAYOUT_AMOUNT_ETH || process.env.PAYOUT_AMOUNT_ETH;
                const charge = process.env.NEXT_PUBLIC_CHARGE_AMOUNT_ETH || process.env.CHARGE_AMOUNT_ETH;
                const p = payout || charge || '0.00002';
                return `Win to receive ~${p} ETH. Lose and you pay ~${p}.`;
              })()}
            </div>
            <div className="w-full flex justify-center">
              <button
                className="px-4 py-1.5 rounded-full text-sm border bg-white text-[#70FF5A] border-[#70FF5A]"
                onClick={() => setShowSettings((v) => !v)}
              >
                {showSettings ? 'Close Settings' : 'Settings'}
              </button>
            </div>
            {showSettings && (
              <div className="w-full max-w-md mx-auto p-3 rounded-xl bg-white/90 border border-[#70FF5A]/30 text-[#066c00]">
                <div className="text-xs font-semibold mb-2" style={{ color: '#066c00' }}>Variants</div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs opacity-80">Size</span>
                  {([3,4,5] as const).map((n) => (
                    <button
                      key={n}
                      className={`px-3 py-1 rounded-full text-sm border ${boardSize===n?'bg-[#70FF5A] text-white border-[#70FF5A]':'bg-white text-[#70FF5A] border-[#70FF5A]'}`}
                      onClick={() => {
                        setBoardSize(n as 3|4|5);
                        setBoard(Array((n as 3|4|5) * (n as 3|4|5)).fill(null));
                        setWinningLine(null);
                        setGameStatus('playing');
                      }}
                    >
                      {n}x{n}
                    </button>
                  ))}
                </div>
                {/* <div className="flex items-center gap-2 mb-2">
                  <button
                    className={`px-3 py-1 rounded-full text-sm border ${misere?'bg-[#70FF5A] text-white border-[#70FF5A]':'bg-white text-[#70FF5A] border-[#70FF5A]'}`}
                    onClick={() => { const next = !misere; setMisere(next); setGameStatus('playing'); setWinningLine(null); setBoard((b)=>b.map(()=>null)); }}
                  >
                    Misère
                  </button>
                </div> */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs opacity-80">Blitz</span>
                  {(['off','7s','5s'] as const).map((v) => (
                    <button
                      key={v}
                      className={`px-3 py-1 rounded-full text-sm border ${blitzPreset===v?'bg-[#70FF5A] text-white border-[#70FF5A]':'bg-white text-[#70FF5A] border-[#70FF5A]'}`}
                      onClick={() => { setBlitzPreset(v); setSecondsLeft(null); }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <div className="text-xs font-semibold mb-2 mt-3" style={{ color: '#066c00' }}>Quick actions</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    className={`px-3 py-1 rounded border ${selectingBlock ? 'bg-[#70FF5A] text-white' : 'bg-white text-[#70FF5A]'} border-[#70FF5A] disabled:opacity-50`}
                    disabled={usedBlock || !isPlayerTurn || gameStatus !== 'playing'}
                    onClick={() => { if (!usedBlock) setSelectingBlock((v) => !v); }}
                  >
                    Block
                  </button>
                  <button
                    className="px-3 py-1 rounded border bg-white text-[#70FF5A] border-[#70FF5A] disabled:opacity-50"
                    disabled={usedHint || !isPlayerTurn || gameStatus !== 'playing'}
                    onClick={() => {
                      const idx = getBestPlayerMove(board);
                      if (idx !== -1) { setHintIndex(idx); setUsedHint(true); setTimeout(() => setHintIndex(null), 3000); }
                    }}
                  >
                    Hint
                  </button>
                  <button
                    className={`px-3 py-1 rounded border ${doubleActive ? 'bg-[#70FF5A] text-white' : 'bg-white text-[#70FF5A]'} border-[#70FF5A] disabled:opacity-50`}
                    disabled={usedDouble || !isPlayerTurn || gameStatus !== 'playing' || doublePendingSecond}
                    onClick={() => { if (!usedDouble && !doublePendingSecond) setDoubleActive((v) => !v); }}
                  >
                    Double Move
                  </button>
                  {selectingBlock && <span className="text-xs">Tap a cell to block AI</span>}
                  {doublePendingSecond && <span className="text-xs">Place your second move</span>}
                </div>
              </div>
            )}
          </div>
          <GameStatus status={gameStatus} isPlayerTurn={isPlayerTurn} secondsLeft={secondsLeft ?? null} />
          {/* Compact level/XP/streak summary above the board */}
          <div className="mt-2 w-full max-w-md px-3 py-2 rounded-lg flex items-center justify-between text-xs" style={{ backgroundColor: '#b6f569', color: '#066c00' }}>
            <span>Level {level}</span>
            <span>XP {xp}</span>
            <span>Streak {streak}🔥</span>
          </div>
          <GameBoard
            board={board}
            onCellClick={handleCellClick}
            isPlayerTurn={isPlayerTurn}
            winningLine={winningLine}
            size={boardSize}
            hintIndex={hintIndex}
            disabledCells={!isPlayerTurn && blockedCellIndex !== null ? [blockedCellIndex] : []}
          />
          {/* Social actions */}
          {(gameStatus === 'won' || gameStatus === 'lost' || gameStatus === 'draw') && (
            <div className="mt-4 flex flex-col sm:flex-row gap-3 items-center">
              <button
                className="px-4 py-2 rounded-lg bg-[#70FF5A] text-white"
                onClick={handleShareResult}
              >
                Share Result
              </button>
              {/* <button
                className="px-4 py-2 rounded-lg bg-[#b6f569] text-[#70FF5A] border border-[#70FF5A]"
                onClick={handleShareChallenge}
              >
                Share Challenge
              </button> */}
            </div>
          )}
          {/* Attribution for cast embed entry */}
          {(() => {
            const loc = context?.location as unknown;
            type CastAuthor = { fid: number; username?: string; pfpUrl?: unknown };
            type CastObj = { author: CastAuthor; hash: string };
            type CastEmbedLoc = { type: 'cast_embed'; cast: CastObj };
            const isCastEmbed = !!(loc && typeof (loc as CastEmbedLoc).type === 'string' && (loc as CastEmbedLoc).type === 'cast_embed' && (loc as CastEmbedLoc).cast);
            if (!isInMiniApp || !isCastEmbed) return null;
            const cast = (loc as CastEmbedLoc).cast;
            const author = cast.author;
            const pfp = typeof author.pfpUrl === 'string' ? author.pfpUrl : undefined;
            return (
              <div className="mt-4 p-3 rounded-lg bg-[#b6f569]/30 text-[#70FF5A] text-sm flex items-center gap-3">
                {pfp ? (
                  <Image src={pfp} alt={author.username || 'pfp'} width={24} height={24} className="rounded-full" />
                ) : null}
                <span>Shared by @{author.username || author.fid}</span>
                <div className="ml-auto flex gap-2">
                  <button
                    className="px-3 py-1 rounded bg-[#70FF5A] text-white"
                    onClick={async () => {
                      try {
                        await composeCast({ text: `Thanks @${author.username || author.fid} for sharing! 🙏`, parent: { type: 'cast', hash: cast.hash } });
                      } catch {}
                    }}
                  >
                    Thank them
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-[#70FF5A]/10 text-[#70FF5A] border border-[#70FF5A]"
                    onClick={() => {
                      try { viewProfile(author.fid); } catch {}
                    }}
                  >
                    View profile
                  </button>
                </div>
              </div>
            );
          })()}
          {/* Rematch series removed */}
          <div className="mt-4" />
        </>
      )}
      </div>
      </WalletCheck>
    </main>
    <BottomNav />
    </>
  );
}

function LeaderboardTab() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [season, setSeason] = React.useState<{ start: string; end: string } | null>(null);
  const [rows, setRows] = React.useState<Array<{ rank: number; address: string; alias?: string; wins: number; draws: number; losses: number; points: number }>>([]);
  const [countdown, setCountdown] = React.useState<string>('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/leaderboard');
        const data = await res.json();
        setSeason(data?.season ?? null);
        setRows(Array.isArray(data?.top) ? data.top : []);
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
      <div className="p-4 rounded-xl border border-[#e5e7eb] bg-black">
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
                    <Image src={src} alt={(r as any).alias || 'pfp'} width={36} height={36} className="rounded-md object-cover" />
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
