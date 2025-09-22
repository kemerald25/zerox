'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const WordChainBoard = ({ 
  gameState, 
  onWordSubmit, 
  onSkipTurn,
  currentUser,
  isSpectator = false 
}) => {
  const [inputWord, setInputWord] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef(null);
  const chainRef = useRef(null);

  const {
    wordChain = [],
    currentPlayer,
    requiredFirstLetter,
    scores = {},
    players = [],
    status,
    turnStartTime
  } = gameState || {};

  const isMyTurn = currentPlayer?.id === currentUser?.id;
  const canPlay = status === 'active' && isMyTurn && !isSpectator;

  // Timer effect
  useEffect(() => {
    if (!turnStartTime || !canPlay) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - turnStartTime) / 1000);
      const remaining = Math.max(0, 30 - elapsed);
      setTimeLeft(remaining);

      if (remaining === 0) {
        handleSkip();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [turnStartTime, canPlay]);

  // Auto-scroll to latest word
  useEffect(() => {
    if (chainRef.current) {
      chainRef.current.scrollTop = chainRef.current.scrollHeight;
    }
  }, [wordChain.length]);

  // Focus input when it's player's turn
  useEffect(() => {
    if (canPlay && inputRef.current) {
      inputRef.current.focus();
    }
  }, [canPlay]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputWord.trim() || isSubmitting || !canPlay) return;

    setIsSubmitting(true);
    try {
      await onWordSubmit(inputWord.trim());
      setInputWord('');
    } catch (error) {
      console.error('Error submitting word:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (!canPlay) return;
    onSkipTurn();
  };

  const getPlayerColor = (playerId) => {
    const colors = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];
    const index = players.findIndex(p => p.id === playerId);
    return colors[index % colors.length];
  };

  const getDifficultyColor = (wordLength) => {
    if (wordLength <= 4) return '#10B981';
    if (wordLength <= 7) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4">
      {/* Header with scores and current player */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">WordWave</h2>
          <div className="text-sm text-gray-600">
            Chain Length: {wordChain.length}
          </div>
        </div>

        {/* Player scores */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {players.map((player) => (
            <div
              key={player.id}
              className={`p-3 rounded-lg border-2 transition-all ${
                currentPlayer?.id === player.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getPlayerColor(player.id) }}
                />
                <span className="font-medium text-sm truncate">
                  {player.name || `Player ${player.id.slice(0, 6)}`}
                </span>
              </div>
              <div className="text-lg font-bold text-gray-800">
                {scores[player.id] || 0}
              </div>
            </div>
          ))}
        </div>

        {/* Current turn indicator */}
        {status === 'active' && (
          <div className="mt-4 text-center">
            {isMyTurn ? (
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg font-semibold text-indigo-600">
                  Your turn!
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-500 flex items-center justify-center">
                    <span className="text-sm font-bold text-indigo-600">
                      {timeLeft}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-lg text-gray-600">
                Waiting for {currentPlayer?.name || 'player'}...
              </span>
            )}
          </div>
        )}
      </div>

      {/* Word chain display */}
      <div className="flex-1 bg-white rounded-xl shadow-lg p-4 mb-4 overflow-hidden">
        <div className="h-full flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Word Chain</h3>
          
          <div
            ref={chainRef}
            className="flex-1 overflow-y-auto space-y-2 pr-2"
            style={{ maxHeight: '400px' }}
          >
            <AnimatePresence>
              {wordChain.map((wordEntry, index) => (
                <motion.div
                  key={`${wordEntry.word}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-sm text-gray-500 font-mono">
                      {index + 1}.
                    </span>
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getPlayerColor(wordEntry.playerId) }}
                    />
                    <span className="font-semibold text-lg text-gray-800 truncate">
                      {wordEntry.word.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="px-2 py-1 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: getDifficultyColor(wordEntry.word.length) }}
                    >
                      +{wordEntry.score}
                    </span>
                    <span className="text-xs text-gray-500">
                      {wordEntry.timeTaken}s
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {wordChain.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">🔗</div>
                <p>Start building your word chain!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input area */}
      {canPlay && (
        <div className="bg-white rounded-xl shadow-lg p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {requiredFirstLetter && (
              <div className="text-center">
                <span className="text-sm text-gray-600">
                  Next word must start with:{' '}
                </span>
                <span className="text-2xl font-bold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-lg">
                  {requiredFirstLetter.toUpperCase()}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputWord}
                  onChange={(e) => setInputWord(e.target.value)}
                  placeholder={
                    requiredFirstLetter
                      ? `Enter a word starting with "${requiredFirstLetter.toUpperCase()}"`
                      : "Enter your word"
                  }
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  disabled={isSubmitting}
                  maxLength={15}
                />
              </div>
              
              <button
                type="submit"
                disabled={!inputWord.trim() || isSubmitting}
                className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
              
              <button
                type="button"
                onClick={handleSkip}
                className="px-4 py-3 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
              >
                Skip (-5)
              </button>
            </div>

            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>
                {inputWord.length}/15 characters
              </span>
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="text-indigo-600 hover:text-indigo-700"
              >
                Need a hint?
              </button>
            </div>

            {showHint && requiredFirstLetter && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-indigo-50 p-3 rounded-lg"
              >
                <p className="text-sm text-indigo-700">
                  <strong>Hint:</strong> Try words like{' '}
                  {getHintWords(requiredFirstLetter).join(', ')}
                </p>
              </motion.div>
            )}
          </form>
        </div>
      )}

      {/* Spectator message */}
      {isSpectator && (
        <div className="bg-gray-100 rounded-xl p-4 text-center">
          <p className="text-gray-600">
            You're watching this game. Enjoy the word battle! 👀
          </p>
        </div>
      )}
    </div>
  );
};

// Helper function to generate hint words
const getHintWords = (letter) => {
  const hints = {
    a: ['apple', 'amazing', 'adventure'],
    b: ['beautiful', 'butterfly', 'brilliant'],
    c: ['creative', 'challenge', 'curious'],
    d: ['delicious', 'dynamic', 'discover'],
    e: ['exciting', 'elephant', 'energy'],
    f: ['fantastic', 'friendly', 'future'],
    g: ['gorgeous', 'grateful', 'garden'],
    h: ['happy', 'harmony', 'helpful'],
    i: ['incredible', 'inspire', 'imagine'],
    j: ['joyful', 'journey', 'justice'],
    k: ['kindness', 'knowledge', 'kitchen'],
    l: ['lovely', 'laughter', 'learning'],
    m: ['magical', 'mystery', 'mountain'],
    n: ['natural', 'nurture', 'network'],
    o: ['optimistic', 'ocean', 'opportunity'],
    p: ['positive', 'peaceful', 'powerful'],
    q: ['quality', 'question', 'quiet'],
    r: ['radiant', 'respect', 'rainbow'],
    s: ['spectacular', 'sunshine', 'success'],
    t: ['tremendous', 'treasure', 'together'],
    u: ['unique', 'universe', 'understanding'],
    v: ['vibrant', 'victory', 'valuable'],
    w: ['wonderful', 'wisdom', 'welcome'],
    x: ['exciting', 'explore', 'express'],
    y: ['youthful', 'yesterday', 'yellow'],
    z: ['zealous', 'zenith', 'zestful']
  };
  
  return hints[letter.toLowerCase()] || ['word', 'wonder', 'world'];
};

export default WordChainBoard;