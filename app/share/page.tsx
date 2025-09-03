import { decodeShareData } from "@/lib/farcaster-share";
import { GameResultCard } from "@/app/components/game/GameResultCard";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{
    data?: string;
  }>;
}

export default async function SharePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const data = resolvedSearchParams.data;
  
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">ZeroX Game</h1>
          <p className="text-gray-600">Share your game results!</p>
        </div>
      </div>
    );
  }

  try {
    const shareData = decodeShareData(data);
    if (!shareData) throw new Error('Invalid share data');

    const playerName = shareData.playerName || 'Anonymous';
    const result = shareData.result === 'won' ? 'Victory!' : shareData.result === 'lost' ? 'Good Game!' : 'Draw!';

    return (
      <div className="min-h-screen py-8 bg-gradient-to-b from-[#066c00] to-[#0a8500]">
        <div className="max-w-md mx-auto px-4">
          <div className="text-center mb-6">
            <h1 className="text-5xl font-bold text-[#70FF5A] mb-4" style={{ fontFamily: 'var(--font-game)' }}>
              {result}
            </h1>
            <div className="bg-[#70FF5A] rounded-full py-2 px-4 inline-block">
              <p className="text-[#066c00] font-mono text-lg">
                {playerName} played as {shareData.playerSymbol}
              </p>
            </div>
          </div>

          <GameResultCard {...shareData} />

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="w-full h-[68px] rounded-[39px] border-2 border-[#70FF5A] text-[#70FF5A] font-bold text-[24px] leading-[33px] sm:leading-[37px] px-4 py-2 transition-colors hover:bg-[#70FF5A] hover:text-[#066c00]"
              style={{
                fontFamily: 'var(--font-game)',
                boxShadow: "0px 4px 0px 0px #70FF5A",
              }}
            >
              PLAY ZEROX
            </Link>
          </div>
        </div>
      </div>
    );
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#066c00] to-[#0a8500]">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[#70FF5A] mb-4" style={{ fontFamily: 'var(--font-game)' }}>
            Invalid Share Link
          </h1>
          <p className="text-[#70FF5A] mb-8 font-mono">
            This share link appears to be invalid.
          </p>
          <Link
            href="/"
            className="px-8 py-4 bg-[#70FF5A] text-[#066c00] font-bold rounded-full hover:bg-[#00DD17] transition-colors"
            style={{ fontFamily: 'var(--font-game)' }}
          >
            PLAY ZEROX
          </Link>
        </div>
      </div>
    );
  }
}