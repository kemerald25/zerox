import { ImageResponse } from 'next/og';
import { decodeShareData } from '@/lib/farcaster-share';
 
export const runtime = 'edge';
export const alt = 'ZeroX Game Results';
export const size = {
  width: 1200,
  height: 800, // Updated to 3:2 aspect ratio for Farcaster Frame
};
 
export default async function Image({ searchParams }: { searchParams: { data?: string } }) {
  try {
    const data = searchParams.data;
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
          ...size,
        },
      );
    }

    const decoded = decodeShareData(data);
    const playerName = decoded.playerName || 'Anonymous';
    const opponentName = decoded.opponentName || 'Anonymous';
    const result = decoded.result === 'won' ? 'Victory!' : decoded.result === 'lost' ? 'Good Game!' : 'Draw!';

    const response = new ImageResponse(
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
            position: 'relative',
          }}
        >
          {/* Background X and O */}
          <div style={{
            position: 'absolute',
            left: '-40px',
            top: '-30px',
            fontSize: '320px',
            fontWeight: 'bold',
            opacity: 0.05,
            color: '#FFFFFF',
          }}>X</div>
          <div style={{
            position: 'absolute',
            right: '-80px',
            bottom: '100px',
            fontSize: '220px',
            fontWeight: 'bold',
            opacity: 0.05,
            color: '#FFFFFF',
          }}>O</div>

          {/* Logo */}
          <div style={{ fontSize: 80, fontWeight: 'bold', marginBottom: 40 }}>ZeroX</div>

          {/* Game Result */}
          <div style={{ fontSize: 60, fontWeight: 'bold', marginBottom: 20 }}>{result}</div>

          {/* Players */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '40px', marginBottom: 40 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>@{playerName}</div>
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
          <div style={{ 
            fontSize: 30, 
            opacity: 0.8,
            backgroundColor: '#70FF5A',
            color: '#000000',
            padding: '10px 30px',
            borderRadius: '30px',
            fontWeight: 'bold',
          }}>
            Launch ZeroX
          </div>
        </div>
      ),
      {
        ...size,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, immutable, no-transform, max-age=300', // Cache for 5 minutes
        },
      },
    );

    return response;
  } catch (e) {
    console.error(e);
    // Return error response with no caching for fallback image
    return new Response(`Failed to generate image`, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }
}