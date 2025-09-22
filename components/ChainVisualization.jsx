'use client';

import React from 'react';
import { motion } from 'framer-motion';

const ChainVisualization = ({ wordChain, players, currentUser }) => {
  if (!wordChain || wordChain.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔗</div>
        <h3 className="text-xl font-semibold text-gray-600 mb-2">
          Ready to build your word chain?
        </h3>
        <p className="text-gray-500">
          Each word must start with the last letter of the previous word
        </p>
      </div>
    );
  }

  const getPlayerColor = (playerId) => {
    const colors = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];
    const index = players.findIndex(p => p.id === playerId);
    return colors[index % colors.length];
  };

  const getDifficultyColor = (wordLength) => {
    if (wordLength <= 4) return '#10B981'; // Easy - green
    if (wordLength <= 7) return '#F59E0B'; // Medium - yellow
    return '#EF4444'; // Hard - red
  };

  const getPlayerName = (playerId) => {
    const player = players.find(p => p.id === playerId);
    if (playerId === currentUser?.id) return 'You';
    return player?.name || `Player ${playerId.slice(0, 6)}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800">Word Chain</h3>
        <div className="text-sm text-gray-600">
          {wordChain.length} word{wordChain.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {wordChain.map((wordEntry, index) => {
          const isLastWord = index === wordChain.length - 1;
          const playerColor = getPlayerColor(wordEntry.playerId);
          const difficultyColor = getDifficultyColor(wordEntry.word.length);
          
          return (
            <motion.div
              key={`${wordEntry.word}-${index}`}
              initial={{ opacity: 0, x: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ 
                duration: 0.3, 
                delay: index * 0.1,
                type: "spring",
                stiffness: 300,
                damping: 25
              }}
              className={`relative flex items-center gap-4 p-4 rounded-xl transition-all ${
                isLastWord 
                  ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 shadow-lg' 
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              {/* Chain link connector */}
              {index > 0 && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <div className="w-6 h-4 bg-gray-300 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                </div>
              )}

              {/* Word number */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
                {index + 1}
              </div>

              {/* Player indicator */}
              <div className="flex-shrink-0 flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: playerColor }}
                />
                <span className="text-xs text-gray-600 font-medium">
                  {getPlayerName(wordEntry.playerId)}
                </span>
              </div>

              {/* Word display */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${
                    isLastWord ? 'text-indigo-700' : 'text-gray-800'
                  }`}>
                    {wordEntry.word.toUpperCase()}
                  </span>
                  
                  {/* Highlight first and last letters */}
                  <div className="flex items-center gap-1 text-xs">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
                      {wordEntry.word[0].toUpperCase()}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                      {wordEntry.word.slice(-1).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Score and stats */}
              <div className="flex-shrink-0 flex items-center gap-3">
                <div className="text-right">
                  <div
                    className="px-3 py-1 rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: difficultyColor }}
                  >
                    +{wordEntry.score}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {wordEntry.timeTaken}s
                  </div>
                </div>

                {/* Special badges */}
                <div className="flex flex-col gap-1">
                  {wordEntry.word.length >= 8 && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                      Long
                    </span>
                  )}
                  {wordEntry.timeTaken < 10 && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                      Fast
                    </span>
                  )}
                  {isPalindrome(wordEntry.word) && (
                    <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full">
                      Palindrome
                    </span>
                  )}
                </div>
              </div>

              {/* Latest word indicator */}
              {isLastWord && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold"
                >
                  ✨
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Chain stats */}
      <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-800">
              {wordChain.length}
            </div>
            <div className="text-sm text-gray-600">Total Words</div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-gray-800">
              {Math.max(...wordChain.map(w => w.word.length))}
            </div>
            <div className="text-sm text-gray-600">Longest Word</div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-gray-800">
              {Math.min(...wordChain.map(w => w.timeTaken))}s
            </div>
            <div className="text-sm text-gray-600">Fastest Time</div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-gray-800">
              {wordChain.reduce((sum, w) => sum + w.score, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Points</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function
const isPalindrome = (word) => {
  const clean = word.toLowerCase();
  return clean === clean.split('').reverse().join('') && clean.length > 3;
};

export default ChainVisualization;