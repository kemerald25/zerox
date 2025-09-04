import { ImageResponse } from 'next/og';
import { decodeShareData } from '@/lib/farcaster-share';
 
export const runtime = 'edge';
 
// Load Pixelify Sans font
const pixelifyFont = fetch(
  new URL('https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@700&display=swap')
).then((res) => res.arrayBuffer());

export async function GET(request: Request) {
  try {
    const [pixelifyFontData] = await Promise.all([pixelifyFont]);
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
          <div style={{ 
            fontSize: 100,
            fontWeight: 'bold',
            marginBottom: 40,
            fontFamily: 'Pixelify Sans',
            color: '#70FF5A',
            textShadow: '0 0 20px rgba(112, 255, 90, 0.5)'
          }}>
            ZEROX
          </div>

          {/* Game Result */}
          <div style={{ 
            fontSize: 72,
            fontWeight: 'bold',
            marginBottom: 30,
            fontFamily: 'Pixelify Sans',
            color: '#70FF5A'
          }}>
            {result}
          </div>

          {/* Winner Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '40px', marginBottom: 40 }}>
            {/* Profile Picture */}
            <div style={{ 
              width: 180,
              height: 180,
              borderRadius: '90px',
              border: '6px solid #70FF5A',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#1A1A1A',
              boxShadow: '0 0 40px rgba(112, 255, 90, 0.3)'
            }}>
              {(decoded.result === 'won' ? decoded.playerPfp : decoded.opponentPfp) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={decoded.result === 'won' ? decoded.playerPfp : decoded.opponentPfp}
                  alt="Winner"
                  width={180}
                  height={180}
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <div style={{ fontSize: 60, color: '#70FF5A' }}>👑</div>
              )}
            </div>

            {/* Game Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ 
                fontSize: 36,
                color: '#70FF5A',
                fontFamily: 'Pixelify Sans'
              }}>
                @{decoded.result === 'won' ? playerName : opponentName}
              </div>
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                backgroundColor: 'rgba(112, 255, 90, 0.1)',
                padding: '20px',
                borderRadius: '20px',
                fontFamily: 'Pixelify Sans'
              }}>
                <div style={{ fontSize: 28, color: '#70FF5A' }}>
                  🎯 Won in {decoded.moves} moves
                </div>
                <div style={{ fontSize: 28, color: '#70FF5A' }}>
                  ⏱️ {decoded.timeElapsed}s
                </div>
                <div style={{ fontSize: 28, color: '#70FF5A' }}>
                  ⚡ Played as {decoded.result === 'won' ? decoded.playerSymbol : (decoded.playerSymbol === 'X' ? 'O' : 'X')}
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div style={{ 
            fontSize: 32,
            color: '#70FF5A',
            padding: '20px 40px',
            border: '3px solid #70FF5A',
            borderRadius: '40px',
            opacity: 0.9,
            fontFamily: 'Pixelify Sans',
            marginTop: 20
          }}>
            PLAY ZEROX ON BASE
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Pixelify Sans',
            data: pixelifyFontData,
            style: 'normal',
            weight: 700
          }
        ]
      },
    );
  } catch (e) {
    console.error(e);
    return new Response(`Failed to generate image`, {
      status: 500,
    });
  }
}
