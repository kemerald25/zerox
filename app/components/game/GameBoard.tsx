'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface GameBoardProps {
  board: Array<string | null>;
  onCellClick: (index: number) => void;
  isPlayerTurn: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({ board, onCellClick, isPlayerTurn }) => {
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
        {board.map((cell, index) => (
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
              backgroundColor: 'white',
              color: GREEN,
              border: `2px solid ${GREEN}`,
              boxShadow: `0 0 10px ${GREEN}20`
            }}
          >
            <motion.span
              initial={cell ? { scale: 0, rotate: -180 } : { scale: 1 }}
              animate={cell ? { scale: 1, rotate: 0 } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {cell}
            </motion.span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
};

export default GameBoard;