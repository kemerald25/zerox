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
  const GREEN = '#70FF5A';

  // Responsive sizing based on board size
  const getResponsiveStyles = (size: number) => {
    switch(size) {
      case 5:
        return {
          gap: '8px',
          borderWidth: 1,
          fontSize: 'text-lg sm:text-xl',
          cellSize: 'w-[52px] h-[52px] sm:w-[64px] sm:h-[64px]'
        };
      case 4:
        return {
          gap: '12px',
          borderWidth: 2,
          fontSize: 'text-xl sm:text-2xl',
          cellSize: 'w-[64px] h-[64px] sm:w-[80px] sm:h-[80px]'
        };
      default: // 3x3
        return {
          gap: '16px',
          borderWidth: 2,
          fontSize: 'text-2xl sm:text-4xl',
          cellSize: 'w-[80px] h-[80px] sm:w-[100px] sm:h-[100px]'
        };
    }
  };

  const styles = getResponsiveStyles(size);

  return (
    <div className="w-full flex justify-center items-center px-2">
      <motion.div 
        className="grid"
        style={{ 
          display: 'grid',
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gap: styles.gap,
          maxWidth: 'min-content'
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
              whileHover={{ scale: cell || isDisabled ? 1 : 1.03 }}
              whileTap={{ scale: cell || isDisabled ? 1 : 0.95 }}
              initial={cell ? { scale: 0.8, opacity: 0 } : {}}
              animate={cell ? { scale: 1, opacity: 1 } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className={`
                ${styles.cellSize}
                ${styles.fontSize}
                flex items-center justify-center
                font-bold rounded-xl
                ${cell || isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                ${isPlayerTurn && !cell && !isDisabled ? 'hover:bg-gray-200' : ''}
                transition-all duration-200
              `}
              style={{
                backgroundColor: bg,
                color: symbolColor,
                opacity: isDisabled ? 0.5 : 1,
                borderWidth: styles.borderWidth
              }}
            >
              <motion.span
                initial={cell ? { scale: 0, rotate: -180 } : { scale: 1 }}
                animate={cell ? { scale: 1, rotate: 0 } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                style={{ 
                  filter: isWinningCell ? `drop-shadow(0 0 6px ${GREEN}80)` : 
                          (hintIndex === index ? `drop-shadow(0 0 6px ${GREEN}70)` : 'none')
                }}
              >
                {cell}
              </motion.span>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
};

export default GameBoard;