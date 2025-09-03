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
  moves: number;
  timeElapsed: number;
  playerAddress?: string;
  opponentAddress?: string;
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
  const shareUrl = generateShareUrl(data);
  const resultText = data.result === 'won' ? '🏆 Victory!' : 
                    data.result === 'lost' ? '😔 Good Game!' : 
                    '🤝 Draw!';

  const shareText = `🎮 ZeroX TicTacToe!\n\n${resultText}\n${data.opponentName ? `🆚 vs @${data.opponentName}` : '🆚 vs Anonymous'}\n⚡ Played as: ${data.playerSymbol}\n🎯 Moves: ${data.moves}\n⏱️ Time: ${data.timeElapsed}s`;

  try {
    // Use SDK directly like minicolours
    await sdk.actions.composeCast({
      text: shareText,
      embeds: [shareUrl] as [string],
      channelKey: "zerox",
      close: false
    });
  } catch (e) {
    console.error('Failed to share:', e);
    throw e;
  }
}