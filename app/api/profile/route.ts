/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');
    if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });
    if (!supabase) return NextResponse.json({ profile: null });

    const addr = address.toLowerCase();
    const { data, error } = await supabase
      .from('leaderboard_entries')
      .select('alias,pfp_url,updated_at')
      .eq('address', addr)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) return NextResponse.json({ profile: null });
    const row: any = Array.isArray(data) && data.length ? data[0] : null;
    if (!row || (!row.alias && !row.pfp_url)) return NextResponse.json({ profile: null });
    return NextResponse.json({ profile: { username: row.alias ?? undefined, pfpUrl: row.pfp_url ?? undefined } });
  } catch {
    return NextResponse.json({ profile: null });
  }
}


