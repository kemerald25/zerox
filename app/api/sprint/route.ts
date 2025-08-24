import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function currentWindowStart(): number {
  const now = Date.now();
  return Math.floor(now / WINDOW_MS) * WINDOW_MS;
}

function isoFromMs(ms: number): string {
  return new Date(ms).toISOString();
}

export async function GET() {
  const winStart = currentWindowStart();
  const winEnd = winStart + WINDOW_MS;
  if (!supabase) return NextResponse.json({ window: { start: isoFromMs(winStart), end: isoFromMs(winEnd) }, top: [] });
  const { data, error } = await supabase
    .from('sprint_entries')
    .select('address,wins')
    .eq('window_start', winStart)
    .order('wins', { ascending: false })
    .limit(10);
  if (error) return NextResponse.json({ window: { start: isoFromMs(winStart), end: isoFromMs(winEnd) }, top: [] });
  const top = (data || []).map((r, idx) => ({ rank: idx + 1, address: r.address, wins: r.wins }));

  return NextResponse.json({ window: { start: isoFromMs(winStart), end: isoFromMs(winEnd) }, top });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address: string | undefined = body?.address;
    const result: 'win' | 'loss' | 'draw' | undefined = body?.result;
    if (!address || result !== 'win') return NextResponse.json({ ok: true });
    if (!supabase) return NextResponse.json({ ok: true });

    const winStart = currentWindowStart();
    const addr = address.toLowerCase();
    const { data: rows } = await supabase
      .from('sprint_entries')
      .select('wins')
      .eq('window_start', winStart)
      .eq('address', addr)
      .limit(1);
    const wins = rows && rows.length ? (rows[0] as any).wins + 1 : 1;
    await supabase
      .from('sprint_entries')
      .upsert({ window_start: winStart, address: addr, wins }, { onConflict: 'window_start,address' });

    return NextResponse.json({ ok: true, windowStart: isoFromMs(winStart) });
  } catch {
    return NextResponse.json({ error: 'update failed' }, { status: 500 });
  }
}


