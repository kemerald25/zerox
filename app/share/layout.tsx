'use client';

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:button:1" content="Play ZeroX" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content={process.env.NEXT_PUBLIC_URL || 'https://tictactoe-based.vercel.app'} />
      </head>
      {children}
    </>
  );
}