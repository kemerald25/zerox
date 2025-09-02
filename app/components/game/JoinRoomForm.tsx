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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md mx-4 bg-white rounded-[32px] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#066c00] to-[#0a8500] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[24px] font-bold text-[#70FF5A]">Join Party Mode</h2>
            <button 
              onClick={onBack}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/10"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="#70FF5A" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Player Info */}
          <div className="flex items-center gap-4 mb-8">
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-[#70FF5A]">
              <Image
                src={playerPfp || '/default-avatar.png'}
                alt={playerName || 'You'}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <div className="text-sm text-[#066c00] font-medium">Playing as</div>
              <div className="text-lg font-bold text-black">
                {playerName || 'Anonymous'}
              </div>
            </div>
          </div>

          {/* Room Code Input */}
          <div className="space-y-3 mb-8">
            <label className="block text-sm font-medium text-[#066c00]">
              Enter Room Code
            </label>
            <input
              type="text"
              maxLength={4}
              placeholder="XXXX"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full h-[52px] bg-white border-2 border-[#70FF5A] rounded-xl px-4 text-2xl font-mono text-center tracking-wider text-black placeholder:text-[#066c00]/40 focus:outline-none focus:ring-2 focus:ring-[#70FF5A]"
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={onJoinRoom}
              disabled={!roomCode.trim() || roomCode.length !== 4}
              className="w-full h-[68px] rounded-[39px] border border-black text-black font-normal text-[24px] leading-[33px] sm:leading-[37px] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: "#70FF5A",
                boxShadow: "0px 4px 0px 0px rgba(0, 0, 0, 1)",
              }}
            >
              JOIN ROOM
            </button>

            <button
              onClick={onBack}
              className="w-full h-[68px] rounded-[39px] border border-[#70FF5A] bg-white text-[#066c00] font-normal text-[24px] leading-[33px] sm:leading-[37px] hover:bg-[#70FF5A]/5"
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};