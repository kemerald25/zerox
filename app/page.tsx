'use client';

import { useScoreboard } from '@/lib/useScoreboard';
import React, { useState, useCallback, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import GameBoard from './components/game/GameBoard';
import GameControls from './components/game/GameControls';
import GameStatus from './components/game/GameStatus';
import { Scoreboard } from './components/game/Scoreboard';
import { WalletCheck } from './components/WalletCheck';
import { playMove, playAIMove, playWin, playLoss, playDraw, playReset, resumeAudio, playWarning } from '@/lib/sound';
import { hapticTap, hapticWin, hapticLoss } from '@/lib/haptics';
import { useAccount, useSendTransaction } from 'wagmi';

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

  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();

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

  useEffect(() => {
    if (gameStatus === 'won' || gameStatus === 'lost' || gameStatus === 'draw') {
      const nextRoundTimer = setTimeout(() => {
        // Only auto-continue if the player already chose symbol and difficulty
        if (playerSymbol && difficulty) {
          startNextRound();
        }
      }, 2000);
      return () => clearTimeout(nextRoundTimer);
    }
  }, [gameStatus, playerSymbol, difficulty, startNextRound]);

  return (
    <main className="min-h-screen p-4 flex flex-col items-center justify-center">
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

      {playerSymbol && difficulty && (
        <>
          <GameStatus status={gameStatus} isPlayerTurn={isPlayerTurn} secondsLeft={secondsLeft ?? null} />
          <GameBoard
            board={board}
            onCellClick={handleCellClick}
            isPlayerTurn={isPlayerTurn}
            winningLine={winningLine}
          />
          <Scoreboard />
        </>
      )}
      </WalletCheck>
    </main>
  );
}