'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const WordInput = ({ 
  onSubmit, 
  onSkip,
  requiredFirstLetter, 
  timeLeft,
  disabled = false,
  placeholder = "Enter your word"
}) => {
  const [word, setWord] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  // Focus input when enabled
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  // Clear validation error when word changes
  useEffect(() => {
    if (validationError) {
      setValidationError('');
    }
  }, [word]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!word.trim() || disabled || isValidating) return;

    const trimmedWord = word.trim().toLowerCase();
    
    // Basic client-side validation
    if (trimmedWord.length < 3) {
      setValidationError('Word must be at least 3 letters');
      return;
    }

    if (trimmedWord.length > 15) {
      setValidationError('Word must be 15 letters or less');
      return;
    }

    if (requiredFirstLetter && trimmedWord[0] !== requiredFirstLetter.toLowerCase()) {
      setValidationError(`Word must start with "${requiredFirstLetter.toUpperCase()}"`);
      return;
    }

    setIsValidating(true);
    try {
      await onSubmit(trimmedWord);
      setWord('');
      setValidationError('');
    } catch (error) {
      setValidationError(error.message || 'Invalid word');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSkip = () => {
    if (disabled) return;
    onSkip();
  };

  const getSuggestions = () => {
    if (!requiredFirstLetter || word.length > 0) return [];
    
    const suggestions = {
      a: ['apple', 'amazing', 'adventure', 'animal'],
      b: ['beautiful', 'butterfly', 'brilliant', 'bridge'],
      c: ['creative', 'challenge', 'curious', 'castle'],
      d: ['delicious', 'dynamic', 'discover', 'dragon'],
      e: ['exciting', 'elephant', 'energy', 'eagle'],
      f: ['fantastic', 'friendly', 'future', 'forest'],
      g: ['gorgeous', 'grateful', 'garden', 'galaxy'],
      h: ['happy', 'harmony', 'helpful', 'house'],
      i: ['incredible', 'inspire', 'imagine', 'island'],
      j: ['joyful', 'journey', 'justice', 'jungle'],
      k: ['kindness', 'knowledge', 'kitchen', 'kingdom'],
      l: ['lovely', 'laughter', 'learning', 'library'],
      m: ['magical', 'mystery', 'mountain', 'music'],
      n: ['natural', 'nurture', 'network', 'nature'],
      o: ['optimistic', 'ocean', 'opportunity', 'orange'],
      p: ['positive', 'peaceful', 'powerful', 'planet'],
      q: ['quality', 'question', 'quiet', 'queen'],
      r: ['radiant', 'respect', 'rainbow', 'river'],
      s: ['spectacular', 'sunshine', 'success', 'star'],
      t: ['tremendous', 'treasure', 'together', 'tree'],
      u: ['unique', 'universe', 'understanding', 'umbrella'],
      v: ['vibrant', 'victory', 'valuable', 'village'],
      w: ['wonderful', 'wisdom', 'welcome', 'water'],
      x: ['exciting', 'explore', 'express', 'extra'],
      y: ['youthful', 'yesterday', 'yellow', 'year'],
      z: ['zealous', 'zenith', 'zestful', 'zero']
    };
    
    return suggestions[requiredFirstLetter.toLowerCase()] || [];
  };

  const suggestions = getSuggestions();

  return (
    <div className="space-y-4">
      {/* Required letter indicator */}
      {requiredFirstLetter && (
        <div className="text-center">
          <span className="text-sm text-gray-600">Next word must start with: </span>
          <span className="text-2xl font-bold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-lg ml-2">
            {requiredFirstLetter.toUpperCase()}
          </span>
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder={placeholder}
            className={`w-full px-4 py-3 text-lg border-2 rounded-lg focus:outline-none transition-colors ${
              validationError
                ? 'border-red-500 focus:border-red-500'
                : 'border-gray-300 focus:border-indigo-500'
            }`}
            disabled={disabled || isValidating}
            maxLength={15}
            autoComplete="off"
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          
          {/* Character counter */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
            {word.length}/15
          </div>
        </div>

        {/* Validation error */}
        {validationError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-600 text-sm bg-red-50 p-2 rounded-lg"
          >
            {validationError}
          </motion.div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!word.trim() || disabled || isValidating}
            className="flex-1 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isValidating ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Checking...
              </div>
            ) : (
              'Submit Word'
            )}
          </button>
          
          <button
            type="button"
            onClick={handleSkip}
            disabled={disabled}
            className="px-4 py-3 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Skip (-5)
          </button>
        </div>

        {/* Timer warning */}
        {timeLeft <= 10 && timeLeft > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-center font-semibold ${
              timeLeft <= 5 ? 'text-red-600' : 'text-orange-600'
            }`}
          >
            ⏰ {timeLeft} seconds left!
          </motion.div>
        )}
      </form>

      {/* Word suggestions */}
      {showSuggestions && suggestions.length > 0 && word.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 p-3 rounded-lg"
        >
          <p className="text-sm text-gray-600 mb-2">Suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setWord(suggestion)}
                className="px-3 py-1 bg-white text-gray-700 text-sm rounded-full hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default WordInput;