'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { WalletCheck } from './components/WalletCheck';
import BottomNav from './components/BottomNav';

export default function Home() {
  const { address } = useAccount();
  const { context } = useMiniKit();
  const [userStats, setUserStats] = useState(null);
  const [dailyChallenge, setDailyChallenge] = useState(null);

  // Get user info from context
  const userName = context?.user?.username || 'Player';
  const userPfp = context?.user?.pfpUrl;

  // Fetch user stats
  useEffect(() => {
    if (address) {
      fetchUserStats();
    }
  }, [address]);

  const fetchUserStats = async () => {
    try {
      const response = await fetch(`/api/user/stats?address=${address}`);
      if (response.ok) {
        const data = await response.json();
        setUserStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  // Fetch daily challenge
  useEffect(() => {
    fetchDailyChallenge();
  }, []);

  const fetchDailyChallenge = async () => {
    try {
      const response = await fetch('/api/daily-challenge');
      if (response.ok) {
        const data = await response.json();
        setDailyChallenge(data);
      }
    } catch (error) {
      console.error('Failed to fetch daily challenge:', error);
    }
  };

  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <WalletCheck>
          <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="text-center mb-12">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h1 className="text-6xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
                  WordWave
                </h1>
                <p className="text-xl text-gray-600 mb-2">
                  Chain Reaction Word Battles
                </p>
                <p className="text-gray-500">
                  Build word chains where each word starts with the last letter of the previous word
                </p>
              </motion.div>
            </div>

            {/* User Welcome */}
            {address && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white rounded-2xl shadow-lg p-6 mb-8"
              >
                <div className="flex items-center gap-4">
                  {userPfp && (
                    <img
                      src={userPfp}
                      alt={userName}
                      className="w-16 h-16 rounded-full border-4 border-indigo-200"
                    />
                  )}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-800">
                      Welcome back, {userName}!
                    </h2>
                    {userStats && (
                      <div className="flex items-center gap-6 mt-2 text-sm text-gray-600">
                        <span>Level {userStats.level}</span>
                        <span>{userStats.totalXp} XP</span>
                        <span>{userStats.gamesWon}/{userStats.gamesPlayed} Wins</span>
                        <span>{userStats.dailyStreak} Day Streak 🔥</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-indigo-600">
                      {userStats?.coins || 100}
                    </div>
                    <div className="text-sm text-gray-500">Coins</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Game Modes Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* Party Mode */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Link href="/party">
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer">
                    <div className="text-4xl mb-4">👥</div>
                    <h3 className="text-2xl font-bold mb-2">Party Mode</h3>
                    <p className="text-indigo-100 mb-4">
                      Battle friends in real-time word chain duels
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                        2-6 Players
                      </span>
                      <span className="text-2xl">→</span>
                    </div>
                  </div>
                </Link>
              </motion.div>

              {/* Daily Challenge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Link href="/daily">
                  <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer">
                    <div className="text-4xl mb-4">🏆</div>
                    <h3 className="text-2xl font-bold mb-2">Daily Challenge</h3>
                    <p className="text-orange-100 mb-4">
                      Complete today&apos;s special word challenge
                    </p>
                    <div className="flex items-center justify-between">
                      {dailyChallenge ? (
                        <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                          {dailyChallenge.type}
                        </span>
                      ) : (
                        <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                          Loading...
                        </span>
                      )}
                      <span className="text-2xl">→</span>
                    </div>
                  </div>
                </Link>
              </motion.div>

              {/* Practice Mode */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <Link href="/practice">
                  <div className="bg-gradient-to-br from-green-500 to-teal-500 rounded-2xl p-6 text-white hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer">
                    <div className="text-4xl mb-4">🤖</div>
                    <h3 className="text-2xl font-bold mb-2">Practice Mode</h3>
                    <p className="text-green-100 mb-4">
                      Sharpen your skills against AI opponents
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                        4 Difficulties
                      </span>
                      <span className="text-2xl">→</span>
                    </div>
                  </div>
                </Link>
              </motion.div>

              {/* Tournament Mode */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <Link href="/tournament">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer">
                    <div className="text-4xl mb-4">🏅</div>
                    <h3 className="text-2xl font-bold mb-2">Tournament</h3>
                    <p className="text-purple-100 mb-4">
                      Compete in organized brackets for prizes
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                        100 Coins Entry
                      </span>
                      <span className="text-2xl">→</span>
                    </div>
                  </div>
                </Link>
              </motion.div>

              {/* Leaderboard */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                <Link href="/leaderboard">
                  <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-6 text-white hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer">
                    <div className="text-4xl mb-4">📊</div>
                    <h3 className="text-2xl font-bold mb-2">Leaderboard</h3>
                    <p className="text-yellow-100 mb-4">
                      See how you rank against other players
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                        Global Rankings
                      </span>
                      <span className="text-2xl">→</span>
                    </div>
                  </div>
                </Link>
              </motion.div>

              {/* Profile */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                <Link href="/profile">
                  <div className="bg-gradient-to-br from-gray-600 to-gray-800 rounded-2xl p-6 text-white hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer">
                    <div className="text-4xl mb-4">👤</div>
                    <h3 className="text-2xl font-bold mb-2">Profile</h3>
                    <p className="text-gray-300 mb-4">
                      View your stats, achievements, and vocabulary
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                        Your Stats
                      </span>
                      <span className="text-2xl">→</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            </div>

            {/* How to Play */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="bg-white rounded-2xl shadow-lg p-8"
            >
              <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
                How to Play WordWave
              </h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🔗</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Build Chains
                  </h3>
                  <p className="text-gray-600">
                    Each word must start with the last letter of the previous word
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Think Fast
                  </h3>
                  <p className="text-gray-600">
                    You have 30 seconds per turn to submit your word
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🏆</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Score Points
                  </h3>
                  <p className="text-gray-600">
                    Longer words and faster submissions earn more points
                  </p>
                </div>
              </div>

              <div className="mt-8 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
                <h4 className="font-semibold text-gray-800 mb-2">Example Chain:</h4>
                <div className="flex items-center gap-2 text-lg font-mono">
                  <span className="bg-indigo-200 px-3 py-1 rounded-full">APPLE</span>
                  <span className="text-gray-400">→</span>
                  <span className="bg-purple-200 px-3 py-1 rounded-full">ELEPHANT</span>
                  <span className="text-gray-400">→</span>
                  <span className="bg-green-200 px-3 py-1 rounded-full">TABLE</span>
                  <span className="text-gray-400">→</span>
                  <span className="bg-yellow-200 px-3 py-1 rounded-full">ENERGY</span>
                </div>
              </div>
            </motion.div>
          </div>
        </WalletCheck>
      </main>
      <BottomNav />
    </>
  );
}