import { Metadata } from "next";
import { decodeShareData } from "@/lib/farcaster-share";

interface PageProps {
  searchParams: Promise<{
    data?: string;
  }>;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const data = resolvedSearchParams.data;
  
  if (!data) {
    return {
      title: "ZeroX Game",
      description: "Play ZeroX and share your results!",
    };
  }

  // Create OG image URL with the same encoded parameter
  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const ogImageUrl = `${baseUrl}/api/og?data=${data}`;

  try {
    const shareData = decodeShareData(data);
    const playerName = shareData.playerName || 'Anonymous';
    const result = shareData.result === 'won' ? 'won against' : shareData.result === 'lost' ? 'lost to' : 'drew with';
    const opponent = shareData.opponentName || 'AI';

    return {
      title: `${playerName} ${result} ${opponent} in ZeroX!`,
      description: `${playerName} played as ${shareData.playerSymbol} and ${result} ${opponent}. Play ZeroX now!`,
      openGraph: {
        title: `${playerName} ${result} ${opponent} in ZeroX!`,
        description: `${playerName} played as ${shareData.playerSymbol} and ${result} ${opponent}. Play ZeroX now!`,
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: `Game result: ${playerName} ${result} ${opponent}`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `${playerName} ${result} ${opponent} in ZeroX!`,
        description: `${playerName} played as ${shareData.playerSymbol} and ${result} ${opponent}. Play ZeroX now!`,
        images: [ogImageUrl],
      },
      other: {
        // Farcaster frame metadata for proper embed generation
        "fc:frame": JSON.stringify({
          version: "next",
          imageUrl: ogImageUrl,
          button: {
            title: `Play ZeroX`,
            action: {
              type: "launch_frame",
              name: "ZeroX Game",
              url: baseUrl,
              splashImageUrl: `${baseUrl}/splash.png`,
              splashBackgroundColor: "#000000",
            },
          },
        }),
      },
    };
  } catch (error) {
    console.error("Failed to decode share data:", error);
    return {
      title: "ZeroX Game",
      description: "Play ZeroX and share your results!",
    };
  }
}