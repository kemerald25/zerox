'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface GameBoardProps {
  board: Array<string | null>;
  onCellClick: (index: number) => void;
  isPlayerTurn: boolean;
  winningLine?: number[] | null;
}

const GameBoard: React.FC<GameBoardProps> = ({ board, onCellClick, isPlayerTurn, winningLine }) => {
  // Brand colors
  const GREEN = '#66c800';
  const LIME_GREEN = '#b6f569';

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div 
        className="grid grid-cols-3 gap-2 aspect-square p-2"
        style={{ 
          backgroundColor: LIME_GREEN, 
          padding: '8px', 
          borderRadius: '12px',
          boxShadow: `0 0 20px ${LIME_GREEN}40`
        }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {board.map((cell, index) => {
          const isWinningCell = Array.isArray(winningLine) && winningLine.includes(index);
          return (
          <motion.button
            key={index}
            onClick={() => isPlayerTurn && !cell && onCellClick(index)}
            whileHover={{ scale: cell ? 1 : 1.05, boxShadow: `0 0 10px ${GREEN}40` }}
            whileTap={{ scale: cell ? 1 : 0.95 }}
            initial={cell ? { scale: 0.8, opacity: 0 } : {}}
            animate={cell ? { scale: 1, opacity: 1 } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className={`
              aspect-square flex items-center justify-center
              text-4xl font-bold rounded-lg
              ${cell ? 'cursor-not-allowed' : 'cursor-pointer'}
              ${isPlayerTurn && !cell ? 'hover:bg-opacity-90' : ''}
              transition-colors duration-200
            `}
            style={{
              backgroundColor: isWinningCell ? LIME_GREEN : 'white',
              color: GREEN,
              border: `2px solid ${isWinningCell ? LIME_GREEN : GREEN}`,
              boxShadow: isWinningCell ? `0 0 18px ${LIME_GREEN}80` : `0 0 10px ${GREEN}20`
            }}
          >
            <motion.span
              initial={cell ? { scale: 0, rotate: -180 } : { scale: 1 }}
              animate={cell ? { scale: 1, rotate: 0 } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              style={{ filter: isWinningCell ? 'drop-shadow(0 0 6px rgba(182,245,105,0.8))' : 'none' }}
            >
              {cell}
            </motion.span>
          </motion.button>
        );})}
      </motion.div>
    </div>
  );
};

export default GameBoard;