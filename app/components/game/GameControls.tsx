'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface GameControlsProps {
  onSymbolSelect: (symbol: 'X' | 'O') => void;
  onDifficultySelect: (difficulty: 'easy' | 'hard') => void;
  selectedSymbol: 'X' | 'O' | null;
  selectedDifficulty: 'easy' | 'hard' | null;
}

const GameControls: React.FC<GameControlsProps> = ({
  onSymbolSelect,
  onDifficultySelect,
  selectedSymbol,
  selectedDifficulty,
}) => {
  const GREEN = '#70FF5A';
  // const LIME_GREEN = '#b6f569';

  return (
    <div className="w-full max-w-md mx-auto space-y-4 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {!selectedSymbol && (
          <motion.div 
            className="space-y-2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <motion.p 
              className="text-center font-semibold text-lg"
              style={{ color: GREEN }}
              initial={{ y: -10 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Choose your symbol:
            </motion.p>
            <div className="flex justify-center gap-4">
              {['X', 'O'].map((symbol, index) => (
                <motion.button
                  key={symbol}
                  onClick={() => onSymbolSelect(symbol as 'X' | 'O')}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: `0 0 15px ${GREEN}40`
                  }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, x: index === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                  className="px-8 py-3 rounded-lg font-bold text-2xl"
                  style={{
                    backgroundColor: GREEN,
                    color: 'white',
                    boxShadow: `0 0 10px ${GREEN}20`
                  }}
                >
                  {symbol}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {selectedSymbol && !selectedDifficulty && (
          <motion.div 
            className="space-y-2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <motion.p 
              className="text-center font-semibold text-lg"
              style={{ color: GREEN }}
              initial={{ y: -10 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Select difficulty:
            </motion.p>
            <div className="flex justify-center gap-4">
              {['easy', 'hard'].map((difficulty, index) => (
                <motion.button
                  key={difficulty}
                  onClick={() => onDifficultySelect(difficulty as 'easy' | 'hard')}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: `0 0 15px ${GREEN}40`
                  }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, x: index === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                  className="px-8 py-3 rounded-lg font-bold capitalize text-lg"
                  style={{
                    backgroundColor: GREEN,
                    color: 'white',
                    boxShadow: `0 0 10px ${GREEN}20`
                  }}
                >
                  {difficulty}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* New Game button removed per UX update; rematch handled via modal */}
      </motion.div>
    </div>
  );
};

export default GameControls;