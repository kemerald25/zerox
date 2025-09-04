'use client';

import React from 'react';
import Image from 'next/image';

interface GameResultEmbedProps {
  winner: {
    address: string;
    name?: string;
    pfp?: string;
  };
  matchDate: string;
  roomCode: string;
  gameStats: {
    playerSymbol: string;
    moves: number;
    timeElapsed: number;
  };
  onShare: () => void;
}

export default function GameResultEmbed({
  winner,
  matchDate,
  roomCode,
  gameStats,
  onShare
}: GameResultEmbedProps) {
  return (
    <div className="w-full max-w-md mx-auto p-6 rounded-xl bg-white">
      {/* Header with time and player */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-sm font-mono">{matchDate}</div>
          <div className="px-2 py-1 bg-gray-100 rounded text-xs">#{roomCode}</div>
        </div>
        <div className="flex items-center gap-2">
          {winner.pfp && (
            <Image
              src={winner.pfp}
              alt={winner.name || 'Winner'}
              width={24}
              height={24}
              className="rounded-full"
            />
          )}
          <span className="text-sm font-medium">@{winner.name || winner.address.slice(0, 6)}</span>
        </div>
      </div>

      {/* Main result display */}
      <div className="text-center my-8">
        <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-game)' }}>
          YOU FOUND IT!
        </h1>
        <p className="text-lg mb-6">Victory in ZeroX!</p>

        {/* Stats card */}
        <div className="p-6 rounded-xl border-2 border-[#70FF5A] bg-gradient-to-r from-[#066c00] to-[#0a8500]">
          <div className="text-6xl font-bold mb-4 text-[#70FF5A]" style={{ fontFamily: 'var(--font-game)' }}>
            {gameStats.moves} Moves
          </div>
          <div className="flex justify-center items-center gap-4 text-sm text-[#b6f569]">
            <div>⚡ {gameStats.playerSymbol}</div>
            <div>⏱️ {gameStats.timeElapsed}s</div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        <button
          onClick={onShare}
          className="flex-1 py-3 px-6 rounded-[24px] border border-black text-black font-bold hover:bg-[#00FF1A] hover:scale-105 active:scale-95 transition-all"
          style={{ 
            fontFamily: 'var(--font-game)',
            backgroundColor: "#70FF5A",
            boxShadow: "0px 4px 0px 0px rgba(0, 0, 0, 1)",
          }}
        >
          🎮 Share Result
        </button>
        <button
          className="flex-1 py-3 px-6 rounded-full bg-[#066c00] text-[#70FF5A] font-bold hover:bg-[#0a8500] transition-colors"
          style={{ fontFamily: 'var(--font-game)' }}
        >
          MINT NOW
        </button>
      </div>
    </div>
  );
}
