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
      <div className="min-h-screen py-8">
        <div className="max-w-md mx-auto px-4">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-black mb-2">
              {result}
            </h1>
            <p className="text-gray-600">
              {playerName} played as {shareData.playerSymbol}
            </p>
          </div>

          <GameResultCard {...shareData} />

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="w-full h-[68px] rounded-[39px] border border-black text-black font-normal text-[24px] leading-[33px] sm:leading-[37px] px-4 py-2"
              style={{
                backgroundColor: "#70FF5A",
                boxShadow: "0px 4px 0px 0px rgba(0, 0, 0, 1)",
              }}
            >
              Play ZeroX
            </Link>
          </div>
        </div>
      </div>
    );
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Share Link</h1>
          <p className="text-gray-600 mb-8">This share link appears to be invalid.</p>
          <Link
            href="/"
            className="px-6 py-3 bg-[#70FF5A] text-black font-bold rounded-full hover:bg-[#00DD17] transition-colors"
          >
            Play ZeroX
          </Link>
        </div>
      </div>
    );
  }
}