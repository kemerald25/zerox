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
  
  // Default miniapp/frame configuration
  const defaultMiniAppConfig = {
    version: "1",
    imageUrl: `${baseUrl}/splash.png`,
    button: {
      title: "🎮 Play ZeroX",
      action: {
        type: "launch_miniapp",
        url: baseUrl,
        name: "ZeroX",
        splashImageUrl: `${baseUrl}/splash.png`,
        splashBackgroundColor: "#000000"
      }
    }
  };

  // Default frame config for backward compatibility
  const defaultFrameConfig = {
    ...defaultMiniAppConfig,
    button: {
      ...defaultMiniAppConfig.button,
      action: {
        ...defaultMiniAppConfig.button.action,
        type: "launch_frame"
      }
    }
  };

  const defaultMetadata = {
    title: "ZeroX Game",
    description: "Play ZeroX and share your results!",
    openGraph: {
      title: "ZeroX Game",
      description: "Play ZeroX and share your results!",
      images: [`${baseUrl}/splash.png`],
    },
    other: {
      "fc:miniapp": JSON.stringify(defaultMiniAppConfig),
      "fc:frame": JSON.stringify(defaultFrameConfig),
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

    // Create dynamic miniapp/frame configuration
    const miniAppConfig = {
      version: "1",
      imageUrl: ogImageUrl,
      button: {
        title: "🎮 Play ZeroX",
        action: {
          type: "launch_miniapp",
          url: `${baseUrl}/play`,
          name: "ZeroX",
          splashImageUrl: `${baseUrl}/splash.png`,
          splashBackgroundColor: "#000000"
        }
      }
    };

    // Frame config for backward compatibility
    const frameConfig = {
      ...miniAppConfig,
      button: {
        ...miniAppConfig.button,
        action: {
          ...miniAppConfig.button.action,
          type: "launch_frame"
        }
      }
    };

    return {
      title: `${playerName} ${result} ${opponent} in ZeroX!`,
      description: `${playerName} played as ${shareData.playerSymbol} and ${result} ${opponent} in ${shareData.moves} moves (${shareData.timeElapsed}s). Play ZeroX now!`,
      openGraph: {
        title: `${playerName} ${result} ${opponent} in ZeroX!`,
        description: `${playerName} played as ${shareData.playerSymbol} and ${result} ${opponent} in ${shareData.moves} moves (${shareData.timeElapsed}s). Play ZeroX now!`,
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 800, // Updated to 3:2 aspect ratio
            alt: `Game result: ${playerName} ${result} ${opponent}`,
          }
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `${playerName} ${result} ${opponent} in ZeroX!`,
        description: `${playerName} played as ${shareData.playerSymbol} and ${result} ${opponent} in ${shareData.moves} moves (${shareData.timeElapsed}s). Play ZeroX now!`,
        images: [ogImageUrl],
      },
      other: {
        "fc:miniapp": JSON.stringify(miniAppConfig),
        "fc:frame": JSON.stringify(frameConfig),
      },
    };
  } catch (error) {
    console.error("Failed to decode share data:", error);
    return defaultMetadata;
  }
}