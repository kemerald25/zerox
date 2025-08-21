'use client';

import { useScoreboard } from '@/lib/useScoreboard';
import React, { useState, useCallback, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import GameBoard from './components/game/GameBoard';
import GameControls from './components/game/GameControls';
import GameStatus from './components/game/GameStatus';
import { Scoreboard } from './components/game/Scoreboard';
import { WalletCheck } from './components/WalletCheck';
import { playMove, playAIMove, playWin, playLoss, playDraw, playReset, resumeAudio } from '@/lib/sound';

export default function Home() {
  useEffect(() => {
    sdk.actions.ready();
  }, []);
  const [board, setBoard] = useState<Array<string | null>>(Array(9).fill(null));
  const [playerSymbol, setPlayerSymbol] = useState<'X' | 'O' | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'hard' | null>(null);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost' | 'draw'>('playing');
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);

  const checkWinner = (squares: Array<string | null>): string | null => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6] // diagonals
    ];

    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const getAvailableMoves = (squares: Array<string | null>): number[] => {
    return squares.reduce<number[]>((moves, cell, index) => 
      cell === null ? [...moves, index] : moves, []);
  };

  const minimax = (squares: Array<string | null>, isMax: boolean): number => {
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
  };

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
  }, [difficulty, playerSymbol]);

  const { recordResult } = useScoreboard();

  const handleCellClick = (index: number) => {
    if (!isPlayerTurn || board[index] || gameStatus !== 'playing') return;

    // Ensure audio is unlocked on user gesture
    resumeAudio();

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
            setGameStatus(winner === playerSymbol ? 'won' : 'lost');
          } else if (getAvailableMoves(newBoard).length === 0) {
            setGameStatus('draw');
          }
        }
        setIsPlayerTurn(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [board, isPlayerTurn, playerSymbol, getAIMove, gameStatus]);

  // Outcome sounds
  useEffect(() => {
    if (gameStatus === 'won') {
      playWin();
    } else if (gameStatus === 'lost') {
      playLoss();
    } else if (gameStatus === 'draw') {
      playDraw();
    }
  }, [gameStatus]);

  const handleReset = () => {
    setBoard(Array(9).fill(null));
    setGameStatus('playing');
    setIsPlayerTurn(true);
    setPlayerSymbol(null);
    setDifficulty(null);

    // Reset sound
    playReset();
  };

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
          <GameStatus status={gameStatus} isPlayerTurn={isPlayerTurn} />
          <GameBoard
            board={board}
            onCellClick={handleCellClick}
            isPlayerTurn={isPlayerTurn}
          />
          <Scoreboard />
        </>
      )}
      </WalletCheck>
    </main>
  );
}