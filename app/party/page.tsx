'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { motion } from 'framer-motion';
import WordChainBoard from '../components/WordChainBoard';
import { WalletCheck } from '../components/WalletCheck';
import BottomNav from '../components/BottomNav';

export default function PartyPage() {
  const { address } = useAccount();
  const { context } = useMiniKit();
  const [gameState, setGameState] = useState('menu'); // menu, creating, joining, playing, completed
  const [currentGame, setCurrentGame] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Get user info from context
  const userName = context?.user?.username || 'Player';
  const userPfp = context?.user?.pfpUrl;

  // Create a new game room
  const createRoom = async () => {
    if (!address) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/wordchain/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: address,
          hostName: userName,
          gameMode: 'party',
          maxPlayers: 6
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCurrentGame(data.game);
        setRoomCode(data.game.roomCode);
        setGameState('creating');
        
        // Share room code on Farcaster
        shareRoomCode(data.game.roomCode);
      } else {
        setError(data.error || 'Failed to create room');
      }
    } catch (err) {
      setError('Failed to create room');
      console.error('Create room error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Join an existing game room
  const joinRoom = async () => {
    if (!address || !joinCode.trim()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      // First get the game
      const gameResponse = await fetch(`/api/wordchain/game?roomCode=${joinCode.toUpperCase()}`);
      const gameData = await gameResponse.json();
      
      if (!gameData.success) {
        setError('Room not found');
        return;
      }
      
      // Then join it
      const joinResponse = await fetch('/api/wordchain/game', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: gameData.game.id,
          action: 'join',
          userId: address,
          userName
        })
      });
      
      const joinData = await joinResponse.json();
      
      if (joinData.success) {
        setCurrentGame(gameData.game);
        setGameState('playing');
        startGamePolling(gameData.game.id);
      } else {
        setError(joinData.error || 'Failed to join room');
      }
    } catch (err) {
      setError('Failed to join room');
      console.error('Join room error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Share room code on Farcaster
  const shareRoomCode = async (code) => {
    try {
      const appUrl = process.env.NEXT_PUBLIC_URL || window.location.origin;
      const shareText = `🔗 Join my WordWave battle!\n\nRoom Code: ${code}\n\nBuild word chains where each word starts with the last letter of the previous word!\n\n👉 ${appUrl}/party`;
      
      // Use Farcaster SDK to compose cast
      if (context?.composeCast) {
        await context.composeCast({
          text: shareText,
          embeds: [appUrl]
        });
      }
    } catch (error) {
      console.error('Failed to share room code:', error);
    }
  };

  // Start the game
  const startGame = async () => {
    if (!currentGame) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/wordchain/game', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGame.id,
          action: 'start'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setGameState('playing');
        startGamePolling(currentGame.id);
      } else {
        setError(data.error || 'Failed to start game');
      }
    } catch (err) {
      setError('Failed to start game');
      console.error('Start game error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for game updates
  const startGamePolling = (gameId) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/wordchain/game?gameId=${gameId}`);
        const data = await response.json();
        
        if (data.success) {
          setCurrentGame(data.game);
          
          if (data.game.status === 'completed') {
            setGameState('completed');
            clearInterval(interval);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);
    
    // Cleanup on unmount
    return () => clearInterval(interval);
  };

  // Handle word submission
  const handleWordSubmit = async (word) => {
    if (!currentGame || !address) return;
    
    try {
      const response = await fetch('/api/wordchain/game', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGame.id,
          action: 'submit_word',
          userId: address,
          word,
          timeTaken: 30 // This would be calculated from actual time
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.errors?.[0] || 'Invalid word');
      }
    } catch (error) {
      throw error;
    }
  };

  // Handle skip turn
  const handleSkipTurn = async () => {
    if (!currentGame || !address) return;
    
    try {
      await fetch('/api/wordchain/game', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGame.id,
          action: 'skip_turn',
          userId: address
        })
      });
    } catch (error) {
      console.error('Skip turn error:', error);
    }
  };

  // Reset to menu
  const resetToMenu = () => {
    setGameState('menu');
    setCurrentGame(null);
    setRoomCode('');
    setJoinCode('');
    setError('');
  };

  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <WalletCheck>
          <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Party Mode
              </h1>
              <p className="text-gray-600">
                Battle friends in real-time word chain duels
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6"
              >
                {error}
              </motion.div>
            )}

            {/* Menu State */}
            {gameState === 'menu' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Create Room */}
                  <div className="bg-white rounded-2xl shadow-lg p-8">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">🎮</span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-4">
                        Create Room
                      </h2>
                      <p className="text-gray-600 mb-6">
                        Start a new game and invite friends to join
                      </p>
                      <button
                        onClick={createRoom}
                        disabled={isLoading}
                        className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        {isLoading ? 'Creating...' : 'Create Room'}
                      </button>
                    </div>
                  </div>

                  {/* Join Room */}
                  <div className="bg-white rounded-2xl shadow-lg p-8">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">🔗</span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-4">
                        Join Room
                      </h2>
                      <p className="text-gray-600 mb-6">
                        Enter a room code to join an existing game
                      </p>
                      <div className="space-y-4">
                        <input
                          type="text"
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                          placeholder="Enter room code"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-center font-mono text-lg"
                          maxLength={4}
                        />
                        <button
                          onClick={joinRoom}
                          disabled={isLoading || !joinCode.trim()}
                          className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors"
                        >
                          {isLoading ? 'Joining...' : 'Join Room'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Creating/Waiting State */}
            {gameState === 'creating' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-lg p-8 text-center"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✅</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Room Created!
                </h2>
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <p className="text-gray-600 mb-2">Room Code:</p>
                  <div className="text-4xl font-mono font-bold text-indigo-600 mb-4">
                    {roomCode}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(roomCode)}
                    className="text-indigo-600 hover:text-indigo-700 text-sm"
                  >
                    📋 Copy Code
                  </button>
                </div>
                <p className="text-gray-600 mb-6">
                  Share this code with friends so they can join your game!
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={startGame}
                    disabled={isLoading}
                    className="bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    Start Game
                  </button>
                  <button
                    onClick={resetToMenu}
                    className="bg-gray-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {/* Playing State */}
            {gameState === 'playing' && currentGame && (
              <WordChainBoard
                gameState={{
                  wordChain: currentGame.words || [],
                  currentPlayer: currentGame.participants?.find(p => p.userId === currentGame.currentPlayerId),
                  requiredFirstLetter: currentGame.currentWord?.slice(-1),
                  scores: currentGame.participants?.reduce((acc, p) => {
                    acc[p.userId] = p.score;
                    return acc;
                  }, {}) || {},
                  players: currentGame.participants?.map(p => ({
                    id: p.userId,
                    name: p.user?.username || p.user?.display_name || 'Player'
                  })) || [],
                  status: currentGame.status,
                  turnStartTime: Date.now() // This should come from the server
                }}
                onWordSubmit={handleWordSubmit}
                onSkipTurn={handleSkipTurn}
                currentUser={{ id: address }}
              />
            )}

            {/* Completed State */}
            {gameState === 'completed' && currentGame && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-lg p-8 text-center"
              >
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🏆</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Game Complete!
                </h2>
                {/* Game results would go here */}
                <button
                  onClick={resetToMenu}
                  className="bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Play Again
                </button>
              </motion.div>
            )}
          </div>
        </WalletCheck>
      </main>
      <BottomNav />
    </>
  );
}