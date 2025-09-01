import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'ZeroX - Play Online',
    description: 'Play TicTacToe online with friends in ZeroX',
    openGraph: {
        title: 'ZeroX - Play Online',
        description: 'Play TicTacToe online with friends in ZeroX',
        type: 'website',
        images: [
            {
                url: '/logo.png',
                width: 1200,
                height: 630,
                alt: 'ZeroX Logo',
            },
        ],
    },
    other: {
        'fc:frame': 'vNext',
        'fc:frame:image': '/logo.png',
        'fc:frame:button:1': 'Play ZeroX',
        'fc:frame:post_url': '/api/frame',
    },
};

export default function OnlinePlayLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
