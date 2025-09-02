/* eslint-disable @typescript-eslint/no-unused-vars */
import { sdk } from '@farcaster/miniapp-sdk';

export interface GameShareData {
  playerName?: string;
  playerPfp?: string;
  opponentName?: string;
  opponentPfp?: string;
  playerSymbol: string;
  result: 'won' | 'lost' | 'draw';
  roomCode: string;
  timestamp: number;
}

export function decodeShareData(encoded: string): GameShareData {
  try {
    return JSON.parse(atob(encoded));
  } catch (e) {
    throw new Error('Invalid share data');
  }
}

export function generateShareUrl(data: GameShareData): string {
  const baseUrl = process.env.NEXT_PUBLIC_URL || window.location.origin;
  const encoded = encodeURIComponent(btoa(JSON.stringify(data)));
  return `${baseUrl}/share?data=${encoded}`;
}

export async function shareToFarcaster(data: GameShareData) {
  const shareUrl = generateShareUrl(data);
  const resultText = data.result === 'won' ? '🏆 Victory!' : 
                    data.result === 'lost' ? '😔 Good Game!' : 
                    '🤝 Draw!';

  const shareText = `🎮 ZeroX Party Mode!\n\n${resultText}\n${data.opponentName ? `🆚 vs @${data.opponentName}` : '🆚 vs Anonymous'}\n⚡ Played as: ${data.playerSymbol}\n\n🎯 Join the fun:`;

  try {
    // Try using SDK
    const result = await sdk.actions.composeCast({
      text: shareText,
      embeds: [shareUrl] as [string],
      close: false
    });

    if (result?.cast) {
      return;
    }

    // If no cast was created but no error thrown, try clipboard
    await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
    throw new Error('Copied to clipboard - no cast created');
  } catch (e) {
    console.error('Failed to share:', e);
    // Try clipboard as last resort
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      throw new Error('Copied to clipboard - share failed');
    } catch (clipboardError) {
      throw e; // Re-throw original error if clipboard fails
    }
  }
}