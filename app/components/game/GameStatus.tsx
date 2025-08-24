'use client';

import confetti from 'canvas-confetti';
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface GameStatusProps {
  status: 'playing' | 'won' | 'lost' | 'draw';
  isPlayerTurn: boolean;
  secondsLeft?: number | null;
}

const GameStatus: React.FC<GameStatusProps> = ({ status, isPlayerTurn, secondsLeft }) => {
  const GREEN = '#66c800';
  const LIME_GREEN = '#b6f569';

  const getMessage = () => {
    switch (status) {
      case 'playing':
        return isPlayerTurn ? 'Your turn' : 'AI thinking...';
      case 'won':
        return 'You won! 🎉';
      case 'lost':
        return 'AI won!';
      case 'draw':
        return "It's a draw!";
      default:
        return '';
    }
  };

  const triggerWinConfetti = () => {
    const duration = 2 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Trigger confetti from two sources
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: [GREEN, LIME_GREEN, '#ffffff'],
      });

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: [GREEN, LIME_GREEN, '#ffffff'],
      });
    }, 250);
  };

  useEffect(() => {
    if (status === 'won') {
      triggerWinConfetti();
    }
  }, [status]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="text-center py-4 text-xl font-bold relative"
    >
      <motion.div
        key={`${status}-${isPlayerTurn}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        style={{ 
          color: GREEN,
          textShadow: status === 'won' ? `0 0 10px ${LIME_GREEN}` : 'none'
        }}
      >
        {getMessage()}
        {status === 'playing' && typeof secondsLeft === 'number' && (
          <span className="ml-2 text-base opacity-80">{secondsLeft}s</span>
        )}
        {status === 'playing' && !isPlayerTurn && (
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="inline-block ml-1"
          >
            ⏳
          </motion.span>
        )}
      </motion.div>
    </motion.div>
  );
};

export default GameStatus;