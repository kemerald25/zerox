import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address: string | undefined = body?.address;
    if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });
    if (!supabase) return NextResponse.json({ ok: true, id: null });
    const { data, error } = await supabase
      .from('game_sessions')
      .insert({ address: address.toLowerCase() })
      .select('id')
      .single();
    if (error) return NextResponse.json({ error: 'create failed' }, { status: 500 });
    return NextResponse.json({ ok: true, id: data?.id ?? null });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const id: string | undefined = body?.id;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    if (!supabase) return NextResponse.json({ ok: true });
    const patch: Record<string, unknown> = {};
    if (body?.result) patch.result = body.result;
    if (typeof body?.requires_settlement === 'boolean') patch.requires_settlement = body.requires_settlement;
    if (typeof body?.settled === 'boolean') patch.settled = body.settled;
    if (typeof body?.tx_hash === 'string') patch.tx_hash = body.tx_hash;
    const { error } = await supabase
      .from('game_sessions')
      .update(patch)
      .eq('id', id);
    if (error) return NextResponse.json({ ok: false });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}


