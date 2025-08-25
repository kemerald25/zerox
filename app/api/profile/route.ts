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

function seasonStartISO(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return start.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  try {
    if (!supabase) return NextResponse.json({ ok: true });
    const body = await req.json();
    const address: string | undefined = body?.address;
    const username: string | undefined = body?.username;
    const pfpUrl: string | undefined = body?.pfpUrl;
    if (!address || (!username && !pfpUrl)) return NextResponse.json({ error: 'address and one of username/pfpUrl required' }, { status: 400 });

    const addr = address.toLowerCase();

    // Update any existing rows for this address to carry alias/pfp_url forward
    await supabase.from('leaderboard_entries').update({ alias: username ?? null, pfp_url: pfpUrl ?? null }).eq('address', addr);

    // Ensure at least this season has a row, so GET lookups can find something
    const season = seasonStartISO();
    await supabase.from('leaderboard_entries').upsert({ season, address: addr, alias: username ?? null, pfp_url: pfpUrl ?? null, wins: 0, draws: 0, losses: 0, points: 0 }, { onConflict: 'season,address' });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}


