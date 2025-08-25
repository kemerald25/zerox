/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');
    if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });

    // Try Farcaster (Neynar) first if API key is present
    const neynarKey = process.env.NEYNAR_API_KEY;
    if (neynarKey) {
      try {
        const url = `https://api.neynar.com/v2/farcaster/user/bulk-by-verifications?addresses=${encodeURIComponent(address)}`;
        const r = await fetch(url, { headers: { 'api_key': neynarKey } });
        if (r.ok) {
          const j: any = await r.json();
          const users: any[] = Array.isArray(j?.users) ? j.users : [];
          const user = users[0];
          if (user) {
            const username: string | undefined = user.username || undefined;
            const pfpUrl: string | undefined = user.pfp_url || user.pfp?.url || undefined;
            return NextResponse.json({ profile: { username, pfpUrl } });
          }
        }
      } catch {
        // ignore and fallback
      }
    }

    // Fallback: Supabase cache (from leaderboard_entries)
    if (!supabase) return NextResponse.json({ profile: null });
    const addr = address.toLowerCase();
    const { data } = await supabase
      .from('leaderboard_entries')
      .select('alias,pfp_url,updated_at')
      .eq('address', addr)
      .order('updated_at', { ascending: false })
      .limit(1);
    const row: any = Array.isArray(data) && data.length ? data[0] : null;
    if (!row || (!row.alias && !row.pfp_url)) return NextResponse.json({ profile: null });
    return NextResponse.json({ profile: { username: row.alias ?? undefined, pfpUrl: row.pfp_url ?? undefined } });
  } catch {
    return NextResponse.json({ profile: null });
  }
}


