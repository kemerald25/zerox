/* eslint-disable @typescript-eslint/no-unused-vars */
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
  const BLACK = '#000000';
  const GREEN = '#00FF1A';

  // Responsive tweaks based on board size
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const gapPx = size >= 5 ? 4 : size === 4 ? 6 : 8; // tighter gaps for larger grids
  const borderWidth = size >= 5 ? 1 : 2; // thinner borders for dense boards
  const fontClass = size >= 5 ? 'text-xl' : size === 4 ? 'text-2xl' : 'text-4xl';

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div 
        className="grid aspect-square"
        style={{ 
          display: 'grid',
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gap: '16px'
        }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {board.map((cell, index) => {
          const isWinningCell = Array.isArray(winningLine) && winningLine.includes(index);
          const isDisabled = disabledCells.includes(index);
          const bg = cell === 'X' ? BLACK : cell === 'O' ? GREEN : '#f3f4f6';
          const symbolColor = cell ? '#ffffff' : '#000000';
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
              text-4xl font-bold rounded-xl
              ${cell || isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
              ${isPlayerTurn && !cell && !isDisabled ? 'hover:bg-gray-200' : ''}
              transition-all duration-200
            `}
            style={{
              backgroundColor: bg,
              color: symbolColor,
              opacity: isDisabled ? 0.5 : 1
            }}
          >
            <motion.span
              initial={cell ? { scale: 0, rotate: -180 } : { scale: 1 }}
              animate={cell ? { scale: 1, rotate: 0 } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              style={{ filter: isWinningCell ? `drop-shadow(0 0 6px ${GREEN}80)` : (hintIndex === index ? `drop-shadow(0 0 6px ${GREEN}70)` : 'none') }}
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