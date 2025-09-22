import React from 'react';
import Image from 'next/image';

interface GameResultCardProps {
  playerName?: string;
  playerPfp?: string;
  opponentName?: string;
  opponentPfp?: string;
  playerSymbol: 'X' | 'O';
  result: 'won' | 'lost' | 'draw';
  roomCode: string;
  moves?: number;
  timeElapsed?: number;
  onShare?: () => void;
  showShareButton?: boolean;
}

export const GameResultCard = ({
  playerName,
  playerPfp,
  opponentName,
  opponentPfp,
  playerSymbol,
  result,
  roomCode,
  moves,
  timeElapsed,
  onShare,
  showShareButton = false
}: GameResultCardProps) => {
  return (
    <div
      id="wordwave-result"
      className="w-full bg-white border-[3px] border-black rounded-[12px] mx-auto flex flex-col items-center relative overflow-hidden p-8"
      style={{ boxShadow: "0px 4px 0px 0px rgba(0, 0, 0, 1)" }}
    >
      {/* Header Section */}
      <div className="flex justify-between items-start w-full">
        <div className="flex flex-col justify-between items-start">
          {/* Date and Username */}
          <p className="font-mono text-sm font-semibold text-black">
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            })}
          </p>
          <p className="font-mono text-sm font-normal text-gray-700">
            @{playerName || 'Anonymous'}
          </p>
        </div>
        <span className="font-mono text-sm font-semibold text-black">
          Room: {roomCode}
        </span>
      </div>

      {/* Result Section */}
      <div className="flex flex-col items-center gap-4 mt-4">
        <span className="text-[54px] font-bold text-black leading-[42px]">
          {result === 'won' ? '🏆 Victory!' : result === 'lost' ? '😔 Good Game!' : '🤝 Draw!'}
        </span>
      </div>

      {/* Players Section */}
      <div className="flex items-center justify-between gap-8 relative w-full grow mt-8">
        {/* Player */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-black">
            <Image
              src={playerPfp || '/default-avatar.png'}
              alt={playerName || 'You'}
              fill
              className="object-cover"
            />
          </div>
          <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center">
            <span className="text-3xl font-bold text-white">{playerSymbol}</span>
          </div>
        </div>

        {/* VS */}
        <div className="text-2xl font-bold text-black">VS</div>

        {/* Opponent */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-black">
            <Image
              src={opponentPfp || '/default-avatar.png'}
              alt={opponentName || 'Opponent'}
              fill
              className="object-cover"
            />
          </div>
          <div className="w-16 h-16 bg-[#00FF1A] rounded-xl flex items-center justify-center">
            <span className="text-3xl font-bold text-white">{playerSymbol === 'X' ? 'O' : 'X'}</span>
          </div>
        </div>
      </div>

      {/* Game Stats */}
      {(moves !== undefined || timeElapsed !== undefined) && (
        <div className="flex items-center justify-center gap-6 mt-6 text-lg font-mono">
          {moves !== undefined && (
            <div className="flex items-center gap-2">
              <span>🎯</span>
              <span>{moves} moves</span>
            </div>
          )}
          {timeElapsed !== undefined && (
            <div className="flex items-center gap-2">
              <span>⏱️</span>
              <span>{timeElapsed}s</span>
            </div>
          )}
        </div>
      )}

      {/* Share Button */}
      {showShareButton && onShare && (
        <button
          onClick={onShare}
          className="mt-6 w-full h-[48px] rounded-[24px] border border-black text-black font-bold text-[18px] leading-[24px] px-4 py-2 transition-all hover:bg-[#00FF1A] hover:scale-105 active:scale-95"
          style={{
            backgroundColor: "#70FF5A",
            boxShadow: "0px 4px 0px 0px rgba(0, 0, 0, 1)",
            fontFamily: 'var(--font-game)',
          }}
        >
          🎮 Share Result
        </button>
      )}

      {/* Decorative Border */}
      <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-black via-[#00FF1A] to-black" />
      <div className="absolute bottom-0 left-0 w-full h-3 bg-gradient-to-r from-[#00FF1A] via-black to-[#00FF1A]" />
      <div className="absolute top-0 left-0 w-3 h-full bg-gradient-to-b from-black via-[#00FF1A] to-black" />
      <div className="absolute top-0 right-0 w-3 h-full bg-gradient-to-b from-[#00FF1A] via-black to-[#00FF1A]" />
    </div>
  );
};
