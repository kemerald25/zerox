import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import path from 'path';
import { decodeShareData } from '@/lib/farcaster-share';

// Load game logo
const logoBuffer = readFileSync(path.join(process.cwd(), 'public/logo.png'));
const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;

const STYLES = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    width: '100%',
    height: '100%',
    padding: '60px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '40px',
  },
  title: {
    color: '#70FF5A',
    fontSize: '40px',
    fontFamily: 'Arial Black, Impact, sans-serif',
    fontWeight: 400,
  },
  gameBoard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    padding: '32px',
    backgroundColor: '#111111',
    borderRadius: '24px',
    border: '2px solid #70FF5A',
  },
  cell: {
    width: '100px',
    height: '100px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '64px',
    fontWeight: 'bold',
    backgroundColor: '#222222',
    borderRadius: '12px',
  },
  players: {
    display: 'flex',
    alignItems: 'center',
    gap: '40px',
    marginTop: '40px',
  },
  player: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
  },
  playerName: {
    color: '#FFFFFF',
    fontSize: '24px',
    fontWeight: 500,
  },
  symbol: {
    width: '60px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    fontWeight: 'bold',
    borderRadius: '12px',
  },
  result: {
    marginTop: '32px',
    fontSize: '48px',
    fontFamily: 'Arial Black, Impact, sans-serif',
    fontWeight: 400,
    color: '#70FF5A',
  },
  stats: {
    display: 'flex',
    gap: '24px',
    marginTop: '24px',
    color: '#FFFFFF',
    fontSize: '20px',
  },
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = searchParams.get('data');
    
    if (!data) {
      throw new Error('No share data provided');
    }

    const shareData = decodeShareData(data);
    const resultText = shareData.result === 'won' ? '🏆 Victory!' : 
                      shareData.result === 'lost' ? '😔 Good Game!' : 
                      '🤝 Draw!';

    return new ImageResponse(
      (
        <div style={STYLES.container}>
          {/* Header */}
          <div style={STYLES.header}>
            {/* Using data URL directly for OG image generation */}
            <div
              style={{
                width: '48px',
                height: '48px',
                backgroundImage: `url(${logoBase64})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat'
              }}
            />
            <div style={STYLES.title}>ZeroX TicTacToe</div>
          </div>

          {/* Players */}
          <div style={STYLES.players}>
            <div style={STYLES.player}>
              <div style={STYLES.playerName}>
                {shareData.playerName || 'Player'}
              </div>
              <div style={{
                ...STYLES.symbol,
                backgroundColor: '#70FF5A',
                color: '#000000',
              }}>
                {shareData.playerSymbol}
              </div>
            </div>

            <div style={{ color: '#FFFFFF', fontSize: '32px' }}>VS</div>

            <div style={STYLES.player}>
              <div style={STYLES.playerName}>
                {shareData.opponentName || 'Opponent'}
              </div>
              <div style={{
                ...STYLES.symbol,
                backgroundColor: '#000000',
                color: '#70FF5A',
                border: '2px solid #70FF5A',
              }}>
                {shareData.playerSymbol === 'X' ? 'O' : 'X'}
              </div>
            </div>
          </div>

          {/* Result */}
          <div style={STYLES.result}>{resultText}</div>

          {/* Stats */}
          <div style={STYLES.stats}>
            <div>🎯 {shareData.moves} moves</div>
            <div>⏱️ {shareData.timeElapsed}s</div>
            <div>🎮 Room #{shareData.roomCode}</div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate',
        },
        // Using system fonts
      }
    );
  } catch (e: Error | unknown) {
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Failed to generate image:', e);
    return new Response(`Failed to generate the image: ${error.message}`, {
      status: 500,
    });
  }
}