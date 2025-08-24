'use client';

import { useScoreboard } from '@/lib/useScoreboard';
import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { sdk } from '@farcaster/miniapp-sdk';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import GameBoard from './components/game/GameBoard';
import GameControls from './components/game/GameControls';
import GameStatus from './components/game/GameStatus';
import { Scoreboard } from './components/game/Scoreboard';
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
  const computeTurnLimit = useCallback(() => (blitzPreset === '5s' ? 5 : blitzPreset === '7s' ? 7 : 15), [blitzPreset]);
  // series state removed
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [dailySeed, setDailySeed] = useState<string | null>(null);
  const pathname = usePathname();
  const currentTab: 'play' | 'daily' | 'leaderboard' = pathname?.startsWith('/daily')
    ? 'daily'
    : pathname?.startsWith('/leaderboard')
      ? 'leaderboard'
      : 'play';

  const startNewGameRound = useCallback(() => {
    const n = boardSize;
    setBoard(Array(n * n).fill(null));
    setWinningLine(null);
    setGameStatus('playing');
    setIsPlayerTurn(true);
    setSecondsLeft(computeTurnLimit());
    setOutcomeHandled(false);
    setSessionId(null);
  }, [boardSize, computeTurnLimit]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const { context, isFrameReady, setFrameReady } = useMiniKit();
  const { isInMiniApp } = useIsInMiniApp();
  const { composeCast } = useComposeCast();
  const viewProfile = useViewProfile();

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
    const text = `${resultText} Tic Tac Toe vs AI (${difficulty}). Play here: ${appUrl}`;
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
    const payload: { text: string; embeds?: [string] } = { text: `Challenge me in Tic Tac Toe! ${url}`, embeds: [url] as [string] };
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
      } catch {}
    };
    post();
  }, [address, gameStatus]);

  // Gate gameplay if an unpaid loss settlement exists
  const [mustSettle, setMustSettle] = useState(false);
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
  }, [address, gameStatus]);

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
    const availableMoves = getAvailableMoves(squares);
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
  }, [difficulty, playerSymbol, minimax, getAvailableMoves]);

  const { recordResult } = useScoreboard();

  const handleCellClick = async (index: number) => {
    if (mustSettle) return;
    if (!isPlayerTurn || board[index] || gameStatus !== 'playing') return;

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
  }, [board, isPlayerTurn, playerSymbol, getAIMove, gameStatus, checkWinner, getAvailableMoves, recordResult, mustSettle, sessionId]);

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
    } else if (gameStatus === 'draw') {
      playDraw();
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
            setAchievements(Array.isArray(data.achievements) ? data.achievements : []);
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
            setAchievements(Array.isArray(data.achievements) ? data.achievements : []);
          }
        } catch {}
      }
    };
    run();
  }, [address, gameStatus]);

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
        await fetch('/api/payout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: playerAddress }),
        });
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
          try { await fetch('/api/settlement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: playerAddress, required: false }) }); } catch {}
          if (sessionId) {
            try { await fetch('/api/gamesession', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sessionId, settled: true, tx_hash: (data.hash ?? undefined) }) }); } catch {}
          }
          // Auto-start a new round after successful settlement
          startNewGameRound();
        } else {
          try { await fetch('/api/settlement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: playerAddress, required: true }) }); } catch {}
          setMustSettle(true);
          if (sessionId) {
            try { await fetch('/api/gamesession', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sessionId, requires_settlement: true }) }); } catch {}
          }
        }
      } catch {
        try { await fetch('/api/settlement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: playerAddress, required: true }) }); } catch {}
        setMustSettle(true);
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
  }, [gameStatus, address, outcomeHandled, sendTransactionAsync, sessionId, startNewGameRound]);

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
    <main className="min-h-screen p-4 flex flex-col items-center justify-center" style={{ paddingBottom: bottomNavHeight }}>
      <WalletCheck>
        <h1 className="text-4xl font-bold mb-8" style={{ color: '#66c800' }}>
          Tic Tac Toe
        </h1>

        {showAddPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl w-80 text-center">
              <div className="text-lg font-bold mb-2" style={{ color: '#66c800' }}>Add this Mini App?</div>
              <div className="text-sm mb-4" style={{ color: '#66c800' }}>
                Quickly access Tic Tac Toe from your apps screen.
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  className="px-4 py-2 rounded-lg bg-[#66c800] text-white"
                  onClick={async () => {
                    try { await sdk.actions.addMiniApp(); } catch {}
                    setShowAddPrompt(false);
                  }}
                >
                  Add Mini App
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-[#b6f569] text-[#66c800] border border-[#66c800]"
                  onClick={() => setShowAddPrompt(false)}
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        )}
        
      {currentTab === 'play' && (
        <>
        {mustSettle && (
          <div className="mb-3 w-full max-w-md p-3 rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm">
            Payment required to continue. Please complete the previous loss transaction.
            <div className="mt-2 flex justify-center">
              <button
                className="px-4 py-2 rounded bg-red-600 text-white"
                onClick={async () => {
                  if (!address) return;
                  try {
                    const res = await fetch('/api/charge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address }) });
                    const data = await res.json();
                    if (data?.to && data?.value) {
                      await sendTransactionAsync({ to: data.to as `0x${string}`, value: BigInt(data.value) });
                      try { await fetch('/api/settlement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address, required: false }) }); } catch {}
                      setMustSettle(false);
                    }
                  } catch {}
                }}
              >
                Complete previous transaction
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
          <div className="mb-2 flex items-center justify-center gap-2 flex-wrap" style={{ color: '#66c800' }}>
            <label className="text-sm">Size</label>
            <select
              className="border border-[#66c800] rounded px-2 py-1 text-sm bg-white/80"
              value={boardSize}
              onChange={(e) => {
                const n = Number(e.target.value) as 3 | 4 | 5;
                setBoardSize(n);
                setBoard(Array(n * n).fill(null));
                setWinningLine(null);
                setGameStatus('playing');
              }}
            >
              <option value={3}>3x3</option>
              <option value={4}>4x4</option>
              <option value={5}>5x5</option>
            </select>
            <label className="ml-3 text-sm flex items-center gap-1">
              <input type="checkbox" checked={misere} onChange={(e) => { setMisere(e.target.checked); setGameStatus('playing'); setWinningLine(null); setBoard((b) => b.map(() => null)); }} />
              Misère
            </label>
            <label className="ml-3 text-sm">Blitz</label>
            <select
              className="border border-[#66c800] rounded px-2 py-1 text-sm bg-white/80"
              value={blitzPreset}
              onChange={(e) => {
                const v = e.target.value as 'off' | '7s' | '5s';
                setBlitzPreset(v);
                setSecondsLeft(null);
              }}
            >
              <option value="off">Off</option>
              <option value="7s">7s</option>
              <option value="5s">5s</option>
            </select>
          </div>
          <GameStatus status={gameStatus} isPlayerTurn={isPlayerTurn} secondsLeft={secondsLeft ?? null} />
          <GameBoard
            board={board}
            onCellClick={handleCellClick}
            isPlayerTurn={isPlayerTurn}
            winningLine={winningLine}
            size={boardSize}
          />
          {/* Social actions */}
          {(gameStatus === 'won' || gameStatus === 'lost' || gameStatus === 'draw') && (
            <div className="mt-4 flex flex-col sm:flex-row gap-3 items-center">
              <button
                className="px-4 py-2 rounded-lg bg-[#66c800] text-white"
                onClick={handleShareResult}
              >
                Share Result
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-[#b6f569] text-[#66c800] border border-[#66c800]"
                onClick={handleShareChallenge}
              >
                Share Challenge
              </button>
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
              <div className="mt-4 p-3 rounded-lg bg-[#b6f569]/30 text-[#66c800] text-sm flex items-center gap-3">
                {pfp ? (
                  <Image src={pfp} alt={author.username || 'pfp'} width={24} height={24} className="rounded-full" />
                ) : null}
                <span>Shared by @{author.username || author.fid}</span>
                <div className="ml-auto flex gap-2">
                  <button
                    className="px-3 py-1 rounded bg-[#66c800] text-white"
                    onClick={async () => {
                      try {
                        await composeCast({ text: `Thanks @${author.username || author.fid} for sharing! 🙏`, parent: { type: 'cast', hash: cast.hash } });
                      } catch {}
                    }}
                  >
                    Thank them
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-[#66c800]/10 text-[#66c800] border border-[#66c800]"
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
          <Scoreboard />
          {/* Progress UI */}
          <div className="mt-6 w-full max-w-md p-3 rounded-lg" style={{ backgroundColor: '#b6f569' }}>
            <div className="flex justify-between" style={{ color: '#066c00' }}>
              <div>Level {level}</div>
              <div>XP {xp}</div>
              <div>Streak {streak}🔥</div>
            </div>
            {achievements.length > 0 && (
              <div className="mt-2 text-sm" style={{ color: '#066c00' }}>
                Badges: {achievements.join(', ')}
              </div>
            )}
          </div>
            </>
          )}
        </>
      )}

      {currentTab === 'daily' && (
        <div className="w-full max-w-md text-center">
          <div className="p-4 rounded-lg shadow" style={{ backgroundColor: '#b6f569', color: '#066c00' }}>
            <div className="text-xl font-bold mb-2">Daily Challenge</div>
            <div className="text-sm mb-2">Beat the AI on hard mode with today’s seed to earn bonus faucet and XP.</div>
            <details className="text-xs opacity-90 mb-3">
              <summary className="cursor-pointer">How it works</summary>
              <div className="mt-2 text-left">
                - You must play with symbol X and difficulty Hard using today’s seed.<br/>
                - Winning auto-claims a one-time bonus to your wallet (rate-limited daily).<br/>
                - Draws/losses do not qualify, but still count for XP and streaks.
              </div>
            </details>
            <button
              className="px-5 py-3 rounded-lg bg-[#66c800] text-white w-full"
              disabled={!dailySeed}
              onClick={() => {
                const base = process.env.NEXT_PUBLIC_URL || window.location.origin;
                const url = `${base}?seed=${dailySeed}&symbol=X&difficulty=hard`;
                window.location.href = url;
              }}
            >
              {dailySeed ? 'Play Today’s Challenge' : 'Loading…'}
            </button>
            <div className="mt-4 text-sm">Current streak: {streak} | Level {level}</div>
          </div>
        </div>
      )}

      {currentTab === 'leaderboard' && (
        <>
          <LeaderboardTab />
          <SprintSection />
        </>
      )}
      {/* Bottom tab nav */}
      <div className="fixed left-0 right-0 bottom-0 z-40">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-stretch justify-around bg-white/90 dark:bg-black/80 border-t border-[#b6f569]/30" style={{ paddingBottom: bottomInset }}>
            <Link href="/daily" className={`flex-1 py-2 text-center text-xs sm:text-sm font-semibold ${currentTab === 'daily' ? 'text-[#66c800]' : 'text-[#66c800]/70'}`}>
              <div className="flex flex-col items-center gap-0.5">
                <span aria-hidden>🗓️</span>
                <span>Daily</span>
              </div>
            </Link>
            <Link href="/play" className={`flex-1 py-2 text-center text-xs sm:text-sm font-semibold ${currentTab === 'play' ? 'text-[#66c800]' : 'text-[#66c800]/70'}`}>
              <div className="flex flex-col items-center gap-0.5">
                <span aria-hidden>🎮</span>
                <span>Play</span>
              </div>
            </Link>
            <Link href="/leaderboard" className={`flex-1 py-2 text-center text-xs sm:text-sm font-semibold ${currentTab === 'leaderboard' ? 'text-[#66c800]' : 'text-[#66c800]/70'}`}>
              <div className="flex flex-col items-center gap-0.5">
                <span aria-hidden>🏆</span>
                <span>Leaderboard</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      </WalletCheck>
    </main>
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
    <div className="w-full max-w-md mx-auto" style={{ color: '#66c800' }}>
      <div className="p-4 rounded-lg border border-[#66c800]/30 bg-white/60 dark:bg-black/40">
        <div className="flex items-center justify-between mb-1">
          <div className="font-bold">Top 10</div>
          {season && (
            <div className="text-xs opacity-80">Season: {season.start} → {season.end}</div>
          )}
        </div>
        {season && (
          <div className="text-xs mb-3 opacity-80">Ends in {countdown}</div>
        )}
        {loading ? (
          <div className="text-sm opacity-80">Loading…</div>
        ) : error ? (
          <div className="text-sm text-red-500">{error}</div>
        ) : rows.length === 0 ? (
          <div className="text-sm opacity-80">No entries yet.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.rank} className={`flex items-center justify-between p-2 rounded ${r.rank === 1 ? 'bg-[#b6f569]/40' : 'bg-[#b6f569]/20'}`}>
                <div className="flex items-center gap-2">
                  <div className="w-6 text-center font-bold">{r.rank}</div>
                  {('pfpUrl' in r) && (r as unknown as { pfpUrl?: string }).pfpUrl ? (
                    <Image src={(r as unknown as { pfpUrl: string }).pfpUrl} alt={r.alias || 'pfp'} width={20} height={20} className="rounded-full" />
                  ) : null}
                  <div className="font-semibold">{r.alias ? `@${r.alias}` : `${r.address.slice(0,6)}…${r.address.slice(-4)}`}</div>
                </div>
                <div className="text-xs text-right">
                  <div>{r.points} pts</div>
                  <div className="opacity-80">W-D-L {r.wins}-{r.draws}-{r.losses}</div>
                </div>
              </div>
            ))}
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
    <div className="w-full max-w-md mx-auto mt-4" style={{ color: '#66c800' }}>
      <div className="p-4 rounded-lg border border-[#66c800]/30 bg-white/60 dark:bg-black/40">
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold">Sprint (10 min)</div>
          <div className="text-xs opacity-80">Ends in {endsIn}</div>
        </div>
        {rows.length === 0 ? (
          <div className="text-sm opacity-80">No wins yet in this window.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.rank} className={`flex items-center justify-between p-2 rounded bg-[#b6f569]/20`}>
                <div className="flex items-center gap-2">
                  <div className="w-6 text-center font-bold">{r.rank}</div>
                  <div className="font-semibold">{`${r.address.slice(0,6)}…${r.address.slice(-4)}`}</div>
                </div>
                <div className="text-xs">{r.wins} wins</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}