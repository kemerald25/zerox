import { ImageResponse } from 'next/og';
import { decodeShareData } from '@/lib/farcaster-share';
 
export const runtime = 'edge';
 
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = searchParams.get('data');
    
    if (!data) {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#000000',
              color: '#70FF5A',
            }}
          >
            <div style={{ fontSize: 60, fontWeight: 'bold' }}>ZeroX</div>
            <div style={{ fontSize: 30 }}>Play ZeroX on Base</div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        },
      );
    }

    const decoded = decodeShareData(data);
    const playerName = decoded.playerName || 'Anonymous';
    const opponentName = decoded.opponentName || 'Anonymous';
    const result = decoded.result === 'won' ? 'Victory!' : decoded.result === 'lost' ? 'Good Game!' : 'Draw!';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000000',
            color: '#70FF5A',
            padding: '40px',
          }}
        >
          {/* Logo */}
          <div style={{ fontSize: 80, fontWeight: 'bold', marginBottom: 40 }}>ZeroX</div>

          {/* Game Result */}
          <div style={{ fontSize: 60, fontWeight: 'bold', marginBottom: 20 }}>{result}</div>

          {/* Players */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '40px', marginBottom: 40 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>{playerName}</div>
              <div style={{ 
                width: 100, 
                height: 100, 
                backgroundColor: '#000000',
                border: '4px solid #70FF5A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 60,
                fontWeight: 'bold',
              }}>
                {decoded.playerSymbol}
              </div>
            </div>

            <div style={{ fontSize: 60 }}>VS</div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>{opponentName}</div>
              <div style={{ 
                width: 100, 
                height: 100, 
                backgroundColor: '#70FF5A',
                border: '4px solid #70FF5A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 60,
                fontWeight: 'bold',
                color: '#000000',
              }}>
                {decoded.playerSymbol === 'X' ? 'O' : 'X'}
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div style={{ fontSize: 30, opacity: 0.8 }}>Play Now on Base</div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e) {
    console.error(e);
    return new Response(`Failed to generate image`, {
      status: 500,
    });
  }
}
