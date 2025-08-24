/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

type LeaderboardEntry = {
  address: string;
  alias?: string;
  wins: number;
  draws: number;
  losses: number;
  points: number;
};

function seasonStartISO(): string {
  const d = new Date();
  const day = d.getUTCDay(); // 0 Sun .. 6 Sat
  const daysSinceMonday = (day + 6) % 7; // 0 Mon .. 6 Sun
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return start.toISOString().slice(0, 10);
}

function seasonEndISO(): string {
  const start = new Date(seasonStartISO());
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);
  return end.toISOString().slice(0, 10);
}

export async function GET() {
  const season = seasonStartISO();
  if (!redis) {
    return NextResponse.json({ season: { start: season, end: seasonEndISO() }, top: [] });
  }
  const keyUsers = `lb:${season}:users`;
  const keyZ = `lb:${season}:points`;

  // Top 10 by score
  // Upstash supports zrange with rev & withScores
  // @ts-expect-error upstash types may differ slightly across versions
  const z: Array<{ member: string; score: number }> = await (redis as any).zrange(keyZ, 0, 9, { rev: true, withScores: true });
  const top: Array<LeaderboardEntry & { rank: number }> = [];
  let rank = 1;
  for (const row of z || []) {
    const addr = row.member;
    const raw = await redis.hget<string>(keyUsers, addr);
    let stats: LeaderboardEntry = { address: addr, wins: 0, draws: 0, losses: 0, points: 0 };
    if (raw) {
      try { stats = { ...stats, ...(JSON.parse(raw) as LeaderboardEntry) }; } catch {}
    }
    top.push({ ...stats, rank });
    rank += 1;
  }

  return NextResponse.json({ season: { start: season, end: seasonEndISO() }, top });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address: string | undefined = body?.address;
    const result: 'win' | 'loss' | 'draw' | undefined = body?.result;
    const alias: string | undefined = body?.alias;
    if (!address || !result) return NextResponse.json({ error: 'address and result required' }, { status: 400 });
    if (!redis) return NextResponse.json({ ok: true });

    const addr = address.toLowerCase();
    const season = seasonStartISO();
    const keyUsers = `lb:${season}:users`;
    const keyZ = `lb:${season}:points`;

    const delta = { win: { w: 1, d: 0, l: 0, p: 3 }, draw: { w: 0, d: 1, l: 0, p: 1 }, loss: { w: 0, d: 0, l: 1, p: 0 } }[result];

    const raw = await redis.hget<string>(keyUsers, addr);
    let stats: LeaderboardEntry = raw ? JSON.parse(raw) as LeaderboardEntry : { address: addr, alias: undefined, wins: 0, draws: 0, losses: 0, points: 0 };
    stats.wins += delta.w;
    stats.draws += delta.d;
    stats.losses += delta.l;
    stats.points += delta.p;
    if (alias && !stats.alias) stats.alias = alias;

    await redis.hset(keyUsers, { [addr]: JSON.stringify(stats) });
    const score = stats.points * 1000 + stats.wins; // tie-breaker by wins
    await redis.zadd(keyZ, { member: addr, score });

    return NextResponse.json({ ok: true, season, entry: stats });
  } catch {
    return NextResponse.json({ error: 'update failed' }, { status: 500 });
  }
}


