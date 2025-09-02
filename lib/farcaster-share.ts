/* eslint-disable @typescript-eslint/no-unused-vars */
import { sdk } from '@farcaster/miniapp-sdk';

export interface GameShareData {
  playerName?: string;
  playerPfp?: string;
  opponentName?: string;
  opponentPfp?: string;
  playerSymbol: 'X' | 'O';
  result: 'won' | 'lost' | 'draw';
  roomCode: string;
  timestamp: number;
}

export function decodeShareData(encoded: string): GameShareData {
  try {
    const data = JSON.parse(atob(decodeURIComponent(encoded)));
    // Validate playerSymbol is correct type
    if (data.playerSymbol !== 'X' && data.playerSymbol !== 'O') {
      throw new Error('Invalid player symbol');
    }
    return data;
  } catch (e) {
    throw new Error('Invalid share data');
  }
}

export function generateShareUrl(data: GameShareData): string {
  const baseUrl = process.env.NEXT_PUBLIC_URL || window.location.origin;
  const encoded = btoa(JSON.stringify(data));
  return `${baseUrl}/share?data=${encodeURIComponent(encoded)}`;
}

export async function shareToFarcaster(data: GameShareData) {
  try {
    const shareUrl = generateShareUrl(data);
    
    // Try using SDK
    const result = await sdk.actions.composeCast({
      text: `🎮 ZeroX Party Mode!\n\n🏆 Victory!\n🆚 vs AI\n⚡ Played as: ${data.playerSymbol}`,
      embeds: [shareUrl] as [string],
      channelKey: "zerox",
      close: false
    });

    if (!result?.cast) {
      throw new Error('No cast created');
    }
  } catch (e) {
    console.error('Failed to share:', e);
    throw e;
  }
}