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

export function encodeShareData(data: GameShareData): string {
  return encodeURIComponent(btoa(JSON.stringify(data)));
}

export function decodeShareData(encoded: string): GameShareData {
  try {
    return JSON.parse(atob(decodeURIComponent(encoded)));
  } catch {
    throw new Error('Invalid share data');
  }
}

export function generateShareUrl(data: GameShareData): string {
  const baseUrl = process.env.NEXT_PUBLIC_URL || window.location.origin;
  const encoded = encodeShareData(data);
  return `${baseUrl}/share?data=${encoded}`;
}

export async function shareToFarcaster(data: GameShareData) {
  const shareUrl = generateShareUrl(data);
  const resultText = data.result === 'won' ? '🏆 Victory!' : 
                    data.result === 'lost' ? '😔 Good Game!' : 
                    '🤝 Draw!';

  const shareText = `🎮 ZeroX Party Mode!\n\n${resultText}\n${data.opponentName ? `🆚 vs @${data.opponentName}` : '🆚 vs Anonymous'}\n⚡ Played as: ${data.playerSymbol}\n\n🎯 Join the fun: ${shareUrl}`;

  try {
    // Try using onchainkit first
    try {
      await sdk.actions.composeCast({
        text: shareText,
        embeds: [shareUrl]
      });
      return;
    } catch {}
  } catch {}

  try {
    // Fallback to miniapp SDK
    await sdk.actions.composeCast({
      text: shareText,
      embeds: [shareUrl]
    });
    return;
  } catch {}

  // Last resort - copy to clipboard
  await navigator.clipboard.writeText(shareText);
  throw new Error('Copied to clipboard - no Farcaster SDK available');
}
