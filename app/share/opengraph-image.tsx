import { ImageResponse } from 'next/og';
 
export const runtime = 'edge';
export const alt = 'ZeroX Game Results';
export const size = {
  width: 1200,
  height: 630,
};
 
export default async function Image() {
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
