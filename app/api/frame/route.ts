import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { match_id } = body;
        
        if (!match_id) {
            return NextResponse.json({ error: 'Match ID required' }, { status: 400 });
        }

        // Redirect to the match page
        const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://tictactoe-based.vercel.app';
        const redirectUrl = `${baseUrl}/play/online?match_id=${match_id}`;
        
        return NextResponse.json({
            framesRedirectUrl: redirectUrl
        });
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const match_id = searchParams.get('match_id');
    
    if (!match_id) {
        return NextResponse.json({ error: 'Match ID required' }, { status: 400 });
    }

    // Return frame metadata for the specific match
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://tictactoe-based.vercel.app';
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>ZeroX Match Result</title>
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content="${baseUrl}/logo.png" />
            <meta property="fc:frame:button:1" content="View Match" />
            <meta property="fc:frame:post_url" content="${baseUrl}/api/frame" />
            <meta property="og:title" content="ZeroX Match Result" />
            <meta property="og:description" content="Check out this ZeroX game result!" />
            <meta property="og:image" content="${baseUrl}/logo.png" />
            <meta property="og:url" content="${baseUrl}/play/online?match_id=${match_id}" />
        </head>
        <body>
            <h1>ZeroX Match Result</h1>
            <p>This is a Farcaster frame for a ZeroX match.</p>
            <a href="${baseUrl}/play/online?match_id=${match_id}">View Match</a>
        </body>
        </html>
    `;

    return new NextResponse(html, {
        headers: {
            'Content-Type': 'text/html',
        },
    });
}
