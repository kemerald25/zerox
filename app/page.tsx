'use client';

import { useScoreboard } from '@/lib/useScoreboard';
import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { sdk } from '@farcaster/miniapp-sdk';
import GameBoard from './components/game/GameBoard';
import GameControls from './components/game/GameControls';
import GameStatus from './components/game/GameStatus';
import { Scoreboard } from './components/game/Scoreboard';
import { WalletCheck } from './components/WalletCheck';
import { playMove, playAIMove, playWin, playLoss, playDraw, playReset, resumeAudio, playWarning } from '@/lib/sound';
import { hapticTap, hapticWin, hapticLoss } from '@/lib/haptics';
import { useAccount, useSendTransaction } from 'wagmi';
import { useMiniKit, useIsInMiniApp, useComposeCast, useViewProfile } from '@coinbase/onchainkit/minikit';

export default function Home() {
  useEffect(() => {
    sdk.actions.ready();
  }, []);
  const [board, setBoard] = useState<Array<string | null>>(Array(9).fill(null));
  const [playerSymbol, setPlayerSymbol] = useState<'X' | 'O' | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'hard' | null>(null);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost' | 'draw'>('playing');
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [outcomeHandled, setOutcomeHandled] = useState(false);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const TURN_LIMIT = 15;
  const [seriesWins, setSeriesWins] = useState<{ player: number; ai: number }>({ player: 0, ai: 0 });
  const [seriesActive, setSeriesActive] = useState(false);
  const [showRematchModal, setShowRematchModal] = useState(false);
  const [seriesCounted, setSeriesCounted] = useState(false);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [dailySeed, setDailySeed] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'play' | 'daily' | 'leaderboard'>('play');

  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const { context, isFrameReady, setFrameReady } = useMiniKit();
  const { isInMiniApp } = useIsInMiniApp();
  const { composeCast } = useComposeCast();
  const viewProfile = useViewProfile();

  useEffect(() => {
    if (!isFrameReady) setFrameReady();
  }, [isFrameReady, setFrameReady]);

  // Share handlers reused in main UI and modal
  const handleShareResult = useCallback(async () => {
    const appUrl = process.env.NEXT_PUBLIC_URL || window.location.origin;
    const resultText = gameStatus === 'won' ? 'I won!' : gameStatus === 'lost' ? 'I lost!' : "It's a draw!";
    const text = `${resultText} Tic Tac Toe vs AI (${difficulty}). Play here:`;
    try {
      await composeCast({ text: `${text} ${appUrl}`, embeds: [`${appUrl}/screenshot.png`] });
    } catch {}
  }, [composeCast, gameStatus, difficulty]);

  const handleShareChallenge = useCallback(async () => {
    const base = process.env.NEXT_PUBLIC_URL || window.location.origin;
    const seed = `${Date.now()}`;
    const url = `${base}?seed=${seed}&symbol=${playerSymbol}&difficulty=${difficulty}`;
    try { await navigator.clipboard.writeText(url); } catch {}
    try { await composeCast({ text: `Challenge me in Tic Tac Toe! ${url}`, embeds: [`${base}/screenshot.png`] }); } catch {}
  }, [composeCast, playerSymbol, difficulty]);

  // Post results to leaderboard
  useEffect(() => {
    const post = async () => {
      if (!address) return;
      if (!(gameStatus === 'won' || gameStatus === 'lost' || gameStatus === 'draw')) return;
      try {
        const alias = context?.user && typeof context.user.username === 'string' ? context.user.username : undefined;
        await fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, result: gameStatus === 'won' ? 'win' : gameStatus === 'lost' ? 'loss' : 'draw', alias })
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
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6] // diagonals
    ];

    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        setWinningLine([a, b, c]);
        return squares[a];
      }
    }
    return null;
  }, []);

  const getAvailableMoves = useCallback((squares: Array<string | null>): number[] => {
    return squares.reduce<number[]>((moves, cell, index) => 
      cell === null ? [...moves, index] : moves, []);
  }, []);

  const minimax = useCallback((squares: Array<string | null>, isMax: boolean): number => {
    const winner = checkWinner(squares);
    if (winner === playerSymbol) return -1;
    if (winner === (playerSymbol === 'X' ? 'O' : 'X')) return 1;
    if (getAvailableMoves(squares).length === 0) return 0;

    const moves = getAvailableMoves(squares);
    const scores = moves.map(move => {
      const newSquares = [...squares];
      newSquares[move] = isMax ? (playerSymbol === 'X' ? 'O' : 'X') : playerSymbol;
      return minimax(newSquares, !isMax);
    });

    return isMax ? Math.max(...scores) : Math.min(...scores);
  }, [playerSymbol, checkWinner, getAvailableMoves]);

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

  const handleCellClick = (index: number) => {
    if (!isPlayerTurn || board[index] || gameStatus !== 'playing') return;

    // Ensure audio is unlocked on user gesture
    resumeAudio();
    hapticTap();

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
      return;
    }
    if (getAvailableMoves(newBoard).length === 0) {
      setGameStatus('draw');
      recordResult('draw');
      return;
    }
  };

  useEffect(() => {
    if (!isPlayerTurn && gameStatus === 'playing') {
      const timer = setTimeout(() => {
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
          } else if (getAvailableMoves(newBoard).length === 0) {
            setGameStatus('draw');
            // Record draw when determined on AI turn
            recordResult('draw');
          }
        }
        setIsPlayerTurn(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [board, isPlayerTurn, playerSymbol, getAIMove, gameStatus, checkWinner, getAvailableMoves, recordResult]);

  // Outcome sounds
  useEffect(() => {
    if (gameStatus === 'won') {
      playWin();
      hapticWin();
    } else if (gameStatus === 'lost') {
      playLoss();
      hapticLoss();
    } else if (gameStatus === 'draw') {
      playDraw();
    }
  }, [gameStatus]);

  // Series tracking and rematch modal
  useEffect(() => {
    if ((gameStatus === 'won' || gameStatus === 'lost' || gameStatus === 'draw') && !seriesCounted) {
      setSeriesActive(true);
      setSeriesCounted(true);
      if (gameStatus === 'won') {
        setSeriesWins((w) => ({ ...w, player: w.player + 1 }));
      } else if (gameStatus === 'lost') {
        setSeriesWins((w) => ({ ...w, ai: w.ai + 1 }));
      }
      setShowRematchModal(true);
    }
  }, [gameStatus, seriesCounted]);

  // Update progress XP/streak/achievements
  useEffect(() => {
    const run = async () => {
      if (!address) return;
      if (gameStatus === 'won' || gameStatus === 'lost' || gameStatus === 'draw') {
        try {
          const res = await fetch('/api/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, result: gameStatus === 'won' ? 'win' : gameStatus === 'lost' ? 'loss' : 'draw' })
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
        }
      } catch {}
    };

    if ((gameStatus === 'won' || gameStatus === 'lost') && !outcomeHandled && address) {
      setOutcomeHandled(true);
      if (gameStatus === 'won') {
        handleWinPayout(address);
      } else if (gameStatus === 'lost') {
        handleLossCharge(address);
      }
    }
  }, [gameStatus, address, outcomeHandled, sendTransactionAsync]);

  const handleReset = () => {
    setBoard(Array(9).fill(null));
    setGameStatus('playing');
    setIsPlayerTurn(true);
    setPlayerSymbol(null);
    setDifficulty(null);
    setOutcomeHandled(false);
    setWinningLine(null);
    setSecondsLeft(null);
    setSeriesWins({ player: 0, ai: 0 });
    setSeriesActive(false);
    setShowRematchModal(false);
    setSeriesCounted(false);

    // Reset sound
    playReset();
  };

  // Start a new round automatically after game ends, preserving symbol and difficulty
  const startNextRound = useCallback(() => {
    setBoard(Array(9).fill(null));
    setGameStatus('playing');
    setIsPlayerTurn(true);
    setOutcomeHandled(false);
    setWinningLine(null);
    setSecondsLeft(TURN_LIMIT);
    setShowRematchModal(false);
    setSeriesCounted(false);
  }, []);

  // Turn timer logic
  useEffect(() => {
    if (gameStatus !== 'playing') {
      setSecondsLeft(null);
      return;
    }
    // Initialize when player's turn starts
    if (isPlayerTurn) {
      setSecondsLeft((prev) => (typeof prev === 'number' ? prev : TURN_LIMIT));
    }
  }, [gameStatus, isPlayerTurn]);

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
        
        <GameControls
        onSymbolSelect={setPlayerSymbol}
        onDifficultySelect={setDifficulty}
        onReset={handleReset}
        selectedSymbol={playerSymbol}
        selectedDifficulty={difficulty}
      />

      {activeTab === 'play' && playerSymbol && difficulty && (
        <>
          <GameStatus status={gameStatus} isPlayerTurn={isPlayerTurn} secondsLeft={secondsLeft ?? null} />
          <GameBoard
            board={board}
            onCellClick={handleCellClick}
            isPlayerTurn={isPlayerTurn}
            winningLine={winningLine}
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
          {seriesActive && (
            <div className="mt-4 text-center" style={{ color: '#66c800' }}>
              Series: You {seriesWins.player} - {seriesWins.ai} AI
            </div>
          )}
          {showRematchModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl w-80 text-center">
                <div className="text-lg font-bold mb-2" style={{ color: '#66c800' }}>Rematch?</div>
                <div className="mb-4 text-sm" style={{ color: '#66c800' }}>
                  {seriesWins.player >= 2 || seriesWins.ai >= 2
                    ? 'Best of 3 complete.'
                    : 'Continue the series?'}
                </div>
                {(gameStatus === 'won' || gameStatus === 'lost' || gameStatus === 'draw') && (
                  <div className="mb-4 flex flex-col gap-2">
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
                <div className="flex gap-3 justify-center">
                  {seriesWins.player < 2 && seriesWins.ai < 2 ? (
                    <button
                      className="px-4 py-2 rounded-lg bg-[#b6f569] text-[#66c800] border border-[#66c800]"
                      onClick={startNextRound}
                    >
                      Rematch
                    </button>
                  ) : null}
                  <button
                    className="px-4 py-2 rounded-lg bg-[#66c800] text-white"
                    onClick={handleReset}
                  >
                    New Series
                  </button>
                </div>
              </div>
            </div>
          )}
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

      {activeTab === 'daily' && (
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

      {activeTab === 'leaderboard' && (
        <>
          <LeaderboardTab />
          <SprintSection />
        </>
      )}
      {/* Bottom tab nav */}
      <div className="fixed left-0 right-0 bottom-0 z-40">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-stretch justify-around bg-white/90 dark:bg-black/80 border-t border-[#b6f569]/30" style={{ paddingBottom: bottomInset }}>
            <button
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold ${activeTab === 'daily' ? 'text-[#66c800]' : 'text-[#66c800]/70'}`}
              onClick={() => setActiveTab('daily')}
            >
              <div className="flex flex-col items-center gap-0.5">
                <span aria-hidden>🗓️</span>
                <span>Daily</span>
              </div>
            </button>
            <button
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold ${activeTab === 'play' ? 'text-[#66c800]' : 'text-[#66c800]/70'}`}
              onClick={() => setActiveTab('play')}
            >
              <div className="flex flex-col items-center gap-0.5">
                <span aria-hidden>🎮</span>
                <span>Play</span>
              </div>
            </button>
            <button
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold ${activeTab === 'leaderboard' ? 'text-[#66c800]' : 'text-[#66c800]/70'}`}
              onClick={() => setActiveTab('leaderboard')}
            >
              <div className="flex flex-col items-center gap-0.5">
                <span aria-hidden>🏆</span>
                <span>Leaderboard</span>
              </div>
            </button>
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