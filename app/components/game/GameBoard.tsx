'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface GameBoardProps {
  board: Array<string | null>;
  onCellClick: (index: number) => void;
  isPlayerTurn: boolean;
  winningLine?: number[] | null;
  size?: number;
  hintIndex?: number | null;
  disabledCells?: number[];
}

const GameBoard: React.FC<GameBoardProps> = ({ board, onCellClick, isPlayerTurn, winningLine, size = 3, hintIndex = null, disabledCells = [] }) => {
  // Brand colors
  const GREEN = '#70FF5A';
  const LIME_GREEN = '#b6f569';

  // Responsive tweaks based on board size
  const gapPx = size >= 5 ? 4 : size === 4 ? 6 : 8; // tighter gaps for larger grids
  const borderWidth = size >= 5 ? 1 : 2; // thinner borders for dense boards
  const fontClass = size >= 5 ? 'text-xl' : size === 4 ? 'text-2xl' : 'text-4xl';

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div 
        className="grid aspect-square p-2"
        style={{ 
          backgroundColor: LIME_GREEN, 
          padding: '8px', 
          borderRadius: '12px',
          boxShadow: `0 0 20px ${LIME_GREEN}40`,
          display: 'grid',
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gap: `${gapPx}px`
        }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {board.map((cell, index) => {
          const isWinningCell = Array.isArray(winningLine) && winningLine.includes(index);
          const isDisabled = disabledCells.includes(index);
          return (
          <motion.button
            key={index}
            onClick={() => isPlayerTurn && !cell && !isDisabled && onCellClick(index)}
            whileHover={{ scale: cell || isDisabled ? 1 : 1.03, boxShadow: `0 0 10px ${GREEN}40` }}
            whileTap={{ scale: cell || isDisabled ? 1 : 0.95 }}
            initial={cell ? { scale: 0.8, opacity: 0 } : {}}
            animate={cell ? { scale: 1, opacity: 1 } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className={`
              aspect-square flex items-center justify-center
              ${fontClass} font-bold rounded-lg
              ${cell || isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
              ${isPlayerTurn && !cell && !isDisabled ? 'hover:bg-opacity-90' : ''}
              transition-colors duration-200
            `}
            style={{
              backgroundColor: isWinningCell ? LIME_GREEN : 'white',
              color: GREEN,
              border: `${borderWidth}px solid ${isWinningCell ? LIME_GREEN : isDisabled ? '#cccccc' : GREEN}`,
              boxShadow: isWinningCell ? `0 0 18px ${LIME_GREEN}80` : `0 0 10px ${GREEN}20`,
              opacity: isDisabled ? 0.5 : 1
            }}
          >
            <motion.span
              initial={cell ? { scale: 0, rotate: -180 } : { scale: 1 }}
              animate={cell ? { scale: 1, rotate: 0 } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              style={{ filter: isWinningCell ? 'drop-shadow(0 0 6px rgba(182,245,105,0.8))' : (hintIndex === index ? 'drop-shadow(0 0 6px rgba(102,200,0,0.7))' : 'none') }}
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