import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });
  if (!supabase) return NextResponse.json({ required: false });
  const { data } = await supabase
    .from('loss_settlements')
    .select('required')
    .eq('address', address.toLowerCase())
    .limit(1);
  const required = data && data.length ? Boolean((data[0] as any).required) : false;
  return NextResponse.json({ required });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address: string | undefined = body?.address;
    const required: boolean | undefined = body?.required;
    if (!address || typeof required !== 'boolean') return NextResponse.json({ error: 'address and required needed' }, { status: 400 });
    if (!supabase) return NextResponse.json({ ok: true });
    const { error } = await supabase
      .from('loss_settlements')
      .upsert({ address: address.toLowerCase(), required }, { onConflict: 'address' });
    if (error) return NextResponse.json({ ok: false });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}


