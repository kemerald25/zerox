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
  
  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const defaultMetadata = {
    title: "ZeroX Game",
    description: "Play ZeroX and share your results!",
    openGraph: {
      title: "ZeroX Game",
      description: "Play ZeroX and share your results!",
      images: [`${baseUrl}/splash.png`],
    },
    other: {
      // Farcaster Frame metadata
      "fc:frame": "vNext",
      "fc:frame:image": `${baseUrl}/splash.png`,
      "fc:frame:button:1": "Play ZeroX",
      "fc:frame:button:1:action": "post",
      "fc:frame:post_url": `${baseUrl}/api/frame`,
      "fc:frame:image:aspect_ratio": "1.91:1",
    },
  };

  if (!data) {
    return defaultMetadata;
  }

  try {
    const shareData = decodeShareData(data);
    const playerName = shareData.playerName || 'Anonymous';
    const result = shareData.result === 'won' ? 'won against' : shareData.result === 'lost' ? 'lost to' : 'drew with';
    const opponent = shareData.opponentName || 'AI';

    // Create OG image URL with the same encoded parameter
    const ogImageUrl = `${baseUrl}/api/og?data=${encodeURIComponent(data)}`;

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
          }
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `${playerName} ${result} ${opponent} in ZeroX!`,
        description: `${playerName} played as ${shareData.playerSymbol} and ${result} ${opponent}. Play ZeroX now!`,
        images: [ogImageUrl],
      },
      other: {
        // Farcaster Frame metadata
        "fc:frame": "vNext",
        "fc:frame:image": ogImageUrl,
        "fc:frame:button:1": "Play ZeroX",
        "fc:frame:button:1:action": "post",
        "fc:frame:post_url": `${baseUrl}/api/frame`,
        "fc:frame:image:aspect_ratio": "1.91:1",
      },
    };
  } catch (error) {
    console.error("Failed to decode share data:", error);
    return defaultMetadata;
  }
}