import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

type SprintEntry = { address: string; wins: number };

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
  if (!redis) {
    return NextResponse.json({ window: { start: isoFromMs(winStart), end: isoFromMs(winEnd) }, top: [] });
  }

  const keyZ = `sprint:${winStart}:wins`;
  // @ts-ignore upstash types may vary
  const z: Array<{ member: string; score: number }> = await (redis as any).zrange(keyZ, 0, 9, { rev: true, withScores: true });
  const top = (z || []).map((row, idx) => ({ rank: idx + 1, address: row.member, wins: Math.floor(row.score) }));

  return NextResponse.json({ window: { start: isoFromMs(winStart), end: isoFromMs(winEnd) }, top });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address: string | undefined = body?.address;
    const result: 'win' | 'loss' | 'draw' | undefined = body?.result;
    if (!address || result !== 'win') return NextResponse.json({ ok: true });
    if (!redis) return NextResponse.json({ ok: true });

    const winStart = currentWindowStart();
    const keyZ = `sprint:${winStart}:wins`;
    // increment by 1 win
    await redis.zincrby(keyZ, 1, address.toLowerCase());
    // expire the key slightly after window end (e.g., +2h)
    await (redis as any).expire?.(keyZ, 60 * 60 * 2);

    return NextResponse.json({ ok: true, windowStart: isoFromMs(winStart) });
  } catch {
    return NextResponse.json({ error: 'update failed' }, { status: 500 });
  }
}


