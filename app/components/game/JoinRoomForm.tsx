'use client';

import React from 'react';
import Image from 'next/image';

interface JoinRoomFormProps {
  playerName?: string;
  playerPfp?: string;
  roomCode: string;
  setRoomCode: (code: string) => void;
  onJoinRoom: () => void;
  onBack: () => void;
}

export const JoinRoomForm = ({
  playerName,
  playerPfp,
  roomCode,
  setRoomCode,
  onJoinRoom,
  onBack
}: JoinRoomFormProps) => {
  return (
    <div className="min-h-[100svh] relative bg-white">
      {/* Background X and O */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-10 -top-3 text-[320px] font-bold leading-none text-black/5 select-none">X</div>
        <div className="absolute -right-8 bottom-10 text-[220px] font-bold leading-none text-black/5 select-none">O</div>
      </div>

      <div className="relative max-w-md mx-auto px-4 pt-2 pb-24 min-h-[100svh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 mb-10">
          <button 
            onClick={onBack}
            className="p-2 rounded-full hover:bg-black/5"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className="text-xl font-semibold">Join Room</span>
        </div>

        {/* Player Info */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-black">
            <Image
              src={playerPfp || '/default-avatar.png'}
              alt={playerName || 'You'}
              fill
              className="object-cover"
            />
          </div>
          <div className="text-sm font-medium">
            {playerName || 'Anonymous'}
          </div>
        </div>

        {/* Room Code Input */}
        <div className="space-y-4 mb-8">
          <label className="block text-sm font-medium text-black">
            Room Code
          </label>
          <input
            type="text"
            maxLength={4}
            placeholder="Enter 4-letter code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            className="w-full h-[52px] bg-white border-2 border-black rounded-xl px-4 text-2xl font-mono text-center tracking-wider text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00FF1A]"
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 mt-auto">
          <button
            onClick={onJoinRoom}
            disabled={!roomCode.trim() || roomCode.length !== 4}
            className="w-full h-[51px] bg-[#00FF1A] disabled:bg-gray-200 disabled:text-gray-500 border border-black rounded-[39px] flex items-center justify-center text-[30px] font-bold text-black transition-all duration-150"
            style={{
              boxShadow: "0px 4px 0px 0px rgba(0, 0, 0, 1)",
              letterSpacing: "7.5%",
            }}
          >
            JOIN
          </button>

          <button
            onClick={onBack}
            className="w-full h-[51px] bg-white border border-black rounded-[39px] flex items-center justify-center text-[30px] font-bold text-black transition-all duration-150"
            style={{
              boxShadow: "0px 4px 0px 0px rgba(0, 0, 0, 1)",
              letterSpacing: "7.5%",
            }}
          >
            BACK
          </button>
        </div>
      </div>
    </div>
  );
};
