import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

function today(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// Deterministic daily seed
function dailySeedString(): string {
  return today();
}

export async function GET() {
  const seed = dailySeedString();
  // Fixed challenge: X hard by default
  return NextResponse.json({ seed, symbol: 'X', difficulty: 'hard' });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address: string | undefined = body?.address;
    const completed: boolean | undefined = body?.completed;
    if (!address || !completed) return NextResponse.json({ error: 'address and completed required' }, { status: 400 });
    if (!redis) return NextResponse.json({ ok: true });
    const key = `daily:${address.toLowerCase()}:${today()}`;
    await redis.set(key, completed ? '1' : '0', { ex: 86400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}


