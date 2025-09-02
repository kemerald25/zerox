'use client';

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <head>
        {/* Farcaster Frame */}
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content={`${process.env.NEXT_PUBLIC_URL || 'https://tictactoe-based.vercel.app'}/share/opengraph-image`} />
        <meta property="fc:frame:button:1" content="Launch ZeroX" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content={process.env.NEXT_PUBLIC_URL || 'https://tictactoe-based.vercel.app'} />
        <meta property="fc:frame:post_url" content={`${process.env.NEXT_PUBLIC_URL || 'https://tictactoe-based.vercel.app'}/api/frame`} />
      </head>
      {children}
    </>
  );
}