// WordWave - Word Chain Game Logic
// Handles word validation, chain building, and scoring

export class WordChainGame {
  constructor(gameId, players = [], theme = null) {
    this.gameId = gameId;
    this.players = players;
    this.theme = theme;
    this.wordChain = [];
    this.currentPlayerIndex = 0;
    this.gameStatus = 'waiting'; // waiting, active, completed
    this.scores = {};
    this.usedWords = new Set();
    this.turnStartTime = null;
    this.turnDuration = 30; // seconds
    
    // Initialize scores
    players.forEach(player => {
      this.scores[player.id] = 0;
    });
  }

  // Start the game
  startGame() {
    if (this.players.length < 2) {
      throw new Error('Need at least 2 players to start');
    }
    
    this.gameStatus = 'active';
    this.currentPlayerIndex = 0;
    this.turnStartTime = Date.now();
    
    return {
      status: 'started',
      currentPlayer: this.getCurrentPlayer(),
      turnStartTime: this.turnStartTime
    };
  }

  // Get current player
  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  // Get the last letter of the current chain
  getRequiredFirstLetter() {
    if (this.wordChain.length === 0) return null;
    const lastWord = this.wordChain[this.wordChain.length - 1].word;
    return lastWord.slice(-1).toLowerCase();
  }

  // Validate a word submission
  async validateWord(word, playerId) {
    const validation = {
      valid: false,
      errors: [],
      word: word.toLowerCase().trim()
    };

    // Basic validation
    if (!word || typeof word !== 'string') {
      validation.errors.push('Word is required');
      return validation;
    }

    const cleanWord = word.toLowerCase().trim();
    
    // Length validation
    if (cleanWord.length < 3) {
      validation.errors.push('Word must be at least 3 letters');
      return validation;
    }
    
    if (cleanWord.length > 15) {
      validation.errors.push('Word must be 15 letters or less');
      return validation;
    }

    // Check if word already used
    if (this.usedWords.has(cleanWord)) {
      validation.errors.push('Word already used in this game');
      return validation;
    }

    // Check chain rule
    const requiredLetter = this.getRequiredFirstLetter();
    if (requiredLetter && cleanWord[0] !== requiredLetter) {
      validation.errors.push(`Word must start with '${requiredLetter.toUpperCase()}'`);
      return validation;
    }

    // Check if it's the current player's turn
    if (this.getCurrentPlayer().id !== playerId) {
      validation.errors.push('Not your turn');
      return validation;
    }

    // Validate against dictionary (this would typically be an API call)
    const isValidWord = await this.checkDictionary(cleanWord);
    if (!isValidWord) {
      validation.errors.push('Word not found in dictionary');
      return validation;
    }

    validation.valid = validation.errors.length === 0;
    return validation;
  }

  // Submit a word
  async submitWord(word, playerId) {
    const validation = await this.validateWord(word, playerId);
    
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
        penalty: -3 // Invalid word penalty
      };
    }

    const cleanWord = validation.word;
    const timeTaken = this.turnStartTime ? 
      Math.floor((Date.now() - this.turnStartTime) / 1000) : 30;

    // Calculate score
    const score = this.calculateWordScore(cleanWord, timeTaken);

    // Add word to chain
    const wordEntry = {
      word: cleanWord,
      playerId,
      playerName: this.getCurrentPlayer().name,
      score,
      timeTaken,
      timestamp: Date.now(),
      order: this.wordChain.length + 1
    };

    this.wordChain.push(wordEntry);
    this.usedWords.add(cleanWord);
    this.scores[playerId] += score;

    // Move to next player
    this.nextTurn();

    return {
      success: true,
      wordEntry,
      newScore: this.scores[playerId],
      nextPlayer: this.getCurrentPlayer(),
      chainLength: this.wordChain.length
    };
  }

  // Calculate score for a word
  calculateWordScore(word, timeTaken) {
    let baseScore = word.length;
    let multiplier = 1.0;

    // Long word bonus (8+ letters)
    if (word.length >= 8) {
      multiplier *= 1.3;
    }

    // Speed bonus (under 10 seconds)
    if (timeTaken < 10) {
      multiplier *= 1.2;
    }

    // Check for special word types
    if (this.isPalindrome(word)) {
      baseScore += 5;
    }

    if (this.isCompoundWord(word)) {
      baseScore += 3;
    }

    // Rare word bonus (would need dictionary lookup)
    if (this.isRareWord(word)) {
      multiplier *= 1.5;
    }

    return Math.max(1, Math.round(baseScore * multiplier));
  }

  // Helper functions for scoring
  isPalindrome(word) {
    return word === word.split('').reverse().join('') && word.length > 3;
  }

  isCompoundWord(word) {
    // Simple heuristic - words with common compound patterns
    const compoundPatterns = ['house', 'book', 'work', 'time', 'way', 'day'];
    return compoundPatterns.some(pattern => 
      word.includes(pattern) && word.length > pattern.length + 2
    );
  }

  isRareWord(word) {
    // Would typically check against a difficulty rating in the dictionary
    return word.length >= 10 || /[qxz]/.test(word);
  }

  // Move to next player's turn
  nextTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.turnStartTime = Date.now();
  }

  // Handle turn timeout
  handleTimeout(playerId) {
    if (this.getCurrentPlayer().id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    // Apply skip penalty
    this.scores[playerId] = Math.max(0, this.scores[playerId] - 5);
    
    // Move to next player
    this.nextTurn();

    return {
      success: true,
      penalty: -5,
      newScore: this.scores[playerId],
      nextPlayer: this.getCurrentPlayer()
    };
  }

  // Check if game should end
  shouldEndGame() {
    const timeLimit = 5 * 60 * 1000; // 5 minutes
    const wordLimit = 20;
    const gameStartTime = this.wordChain.length > 0 ? this.wordChain[0].timestamp : Date.now();
    
    return (
      Date.now() - gameStartTime > timeLimit ||
      this.wordChain.length >= wordLimit
    );
  }

  // End the game and determine winner
  endGame() {
    this.gameStatus = 'completed';
    
    const sortedPlayers = this.players
      .map(player => ({
        ...player,
        score: this.scores[player.id],
        wordsPlayed: this.wordChain.filter(w => w.playerId === player.id).length
      }))
      .sort((a, b) => b.score - a.score);

    return {
      status: 'completed',
      winner: sortedPlayers[0],
      finalScores: sortedPlayers,
      wordChain: this.wordChain,
      gameStats: {
        totalWords: this.wordChain.length,
        longestWord: this.wordChain.reduce((longest, current) => 
          current.word.length > longest.length ? current.word : longest, ''
        ),
        fastestWord: this.wordChain.reduce((fastest, current) => 
          current.timeTaken < fastest.timeTaken ? current : fastest, this.wordChain[0]
        )
      }
    };
  }

  // Get current game state
  getGameState() {
    return {
      gameId: this.gameId,
      status: this.gameStatus,
      players: this.players,
      scores: this.scores,
      wordChain: this.wordChain,
      currentPlayer: this.getCurrentPlayer(),
      requiredFirstLetter: this.getRequiredFirstLetter(),
      turnStartTime: this.turnStartTime,
      chainLength: this.wordChain.length
    };
  }

  // Dictionary check (would integrate with external API)
  async checkDictionary(word) {
    // For now, return true for basic English words
    // In production, this would call Merriam-Webster or similar API
    const commonWords = new Set([
      'apple', 'elephant', 'table', 'energy', 'yellow', 'wonderful',
      'library', 'yesterday', 'youthful', 'lighthouse', 'house', 'easy',
      'young', 'great', 'time', 'every', 'year', 'right', 'today',
      'yellow', 'world', 'down', 'night', 'tree', 'end', 'dog', 'good'
    ]);
    
    return commonWords.has(word) || word.length >= 4;
  }
}

// Daily Challenge Logic
export class DailyChallenge {
  constructor(challengeDate, challengeType, parameters) {
    this.challengeDate = challengeDate;
    this.challengeType = challengeType;
    this.parameters = parameters;
    this.attempts = new Map();
  }

  // Generate daily challenge
  static generateDailyChallenge(date) {
    const challenges = [
      {
        type: 'theme_based_words',
        theme: 'animals',
        startingWord: 'tiger',
        targetLength: 10,
        description: 'Build a chain using only animal-related words'
      },
      {
        type: 'letter_restriction',
        bannedLetters: ['e', 'a'],
        startingWord: 'rhythm',
        targetLength: 8,
        description: 'No words containing E or A'
      },
      {
        type: 'speed_challenge',
        maxTimePerWord: 15,
        startingWord: 'quick',
        targetLength: 12,
        description: 'Each word must be submitted in under 15 seconds'
      },
      {
        type: 'chain_length_target',
        startingWord: 'start',
        targetLength: 15,
        description: 'Build a chain of exactly 15 words'
      }
    ];

    // Use date as seed for consistent daily challenges
    const seed = new Date(date).getTime();
    const challengeIndex = seed % challenges.length;
    
    return {
      ...challenges[challengeIndex],
      challengeDate: date,
      seed
    };
  }

  // Validate challenge attempt
  validateAttempt(wordChain, userId) {
    const validation = {
      valid: false,
      score: 0,
      completed: false,
      errors: []
    };

    switch (this.challengeType) {
      case 'theme_based_words':
        return this.validateThemeChallenge(wordChain, validation);
      case 'letter_restriction':
        return this.validateLetterRestriction(wordChain, validation);
      case 'speed_challenge':
        return this.validateSpeedChallenge(wordChain, validation);
      case 'chain_length_target':
        return this.validateLengthTarget(wordChain, validation);
      default:
        validation.errors.push('Unknown challenge type');
        return validation;
    }
  }

  validateThemeChallenge(wordChain, validation) {
    // Would check if words match the theme
    validation.valid = true;
    validation.completed = wordChain.length >= this.parameters.targetLength;
    validation.score = wordChain.reduce((sum, word) => sum + word.score, 0);
    return validation;
  }

  validateLetterRestriction(wordChain, validation) {
    const bannedLetters = this.parameters.bannedLetters || [];
    const invalidWords = wordChain.filter(wordEntry => 
      bannedLetters.some(letter => wordEntry.word.includes(letter))
    );

    if (invalidWords.length > 0) {
      validation.errors.push(`Words contain banned letters: ${invalidWords.map(w => w.word).join(', ')}`);
      return validation;
    }

    validation.valid = true;
    validation.completed = wordChain.length >= this.parameters.targetLength;
    validation.score = wordChain.reduce((sum, word) => sum + word.score, 0);
    return validation;
  }

  validateSpeedChallenge(wordChain, validation) {
    const maxTime = this.parameters.maxTimePerWord || 15;
    const slowWords = wordChain.filter(wordEntry => wordEntry.timeTaken > maxTime);

    if (slowWords.length > 0) {
      validation.errors.push(`Words took too long: ${slowWords.map(w => w.word).join(', ')}`);
      return validation;
    }

    validation.valid = true;
    validation.completed = wordChain.length >= this.parameters.targetLength;
    validation.score = wordChain.reduce((sum, word) => sum + word.score, 0);
    return validation;
  }

  validateLengthTarget(wordChain, validation) {
    const targetLength = this.parameters.targetLength;
    validation.valid = true;
    validation.completed = wordChain.length === targetLength;
    validation.score = wordChain.reduce((sum, word) => sum + word.score, 0);
    
    if (wordChain.length !== targetLength) {
      validation.errors.push(`Chain must be exactly ${targetLength} words (got ${wordChain.length})`);
    }
    
    return validation;
  }
}

// Export utility functions
export const WordChainUtils = {
  // Generate room code
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // Calculate XP gained from game
  calculateXPGain(wordsPlayed, gameWon, bonusMultiplier = 1) {
    let xp = 25; // Base completion XP
    xp += wordsPlayed * 2; // XP per word
    if (gameWon) xp += 50; // Win bonus
    return Math.round(xp * bonusMultiplier);
  },

  // Format time duration
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  // Get word difficulty color
  getDifficultyColor(wordLength) {
    if (wordLength <= 4) return '#10B981'; // Easy - green
    if (wordLength <= 7) return '#F59E0B'; // Medium - yellow
    return '#EF4444'; // Hard - red
  }
};