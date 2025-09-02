/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useSearchParams } from 'next/navigation';
import { decodeShareData } from '@/lib/farcaster-share';

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const data = searchParams.get('data');
  let title = 'ZeroX Game Results';
  let description = 'Check out my ZeroX game results!';
  const image = `${process.env.NEXT_PUBLIC_URL || 'https://tictactoe-based.vercel.app'}/api/og?data=${data}`;

  try {
    if (data) {
      const decoded = decodeShareData(data);
      const playerName = decoded.playerName || 'Anonymous';
      const opponentName = decoded.opponentName || 'Anonymous';
      const result = decoded.result === 'won' ? 'won against' : decoded.result === 'lost' ? 'lost to' : 'drew with';
      
      title = `${playerName} ${result} ${opponentName} in ZeroX!`;
      description = `${playerName} played as ${decoded.playerSymbol} and ${result} ${opponentName}. Play ZeroX now!`;
    }
  } catch {}

  return (
    <>
      <head>
        {/* Primary Meta Tags */}
        <title>{title}</title>
        <meta name="title" content={title} />
        <meta name="description" content={description} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={title} />
        <meta property="twitter:description" content={description} />
        <meta property="twitter:image" content={image} />

        {/* Farcaster Frame */}
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content={image} />
        <meta property="fc:frame:button:1" content="Play ZeroX" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content={process.env.NEXT_PUBLIC_URL || 'https://tictactoe-based.vercel.app'} />
      </head>
      {children}
    </>
  );
}
