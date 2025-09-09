import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getEconomics } from '@/lib/economics';
import { base, baseSepolia } from 'viem/chains';
import { parseEther } from 'viem';

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get('address');
    if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });
    if (!supabase) return NextResponse.json({ count: 0, sessionIds: [], totalWei: '0' });

    const { data: rows } = await supabase
      .from('game_sessions')
      .select('id')
      .eq('address', address.toLowerCase())
      .eq('requires_settlement', true)
      .eq('settled', false)
      .order('created_at', { ascending: true });

    const sessionIds = Array.isArray(rows) ? rows.map((r: any) => r.id as string) : [];
    const count = sessionIds.length;

    const econ = await getEconomics();
    const perWei = parseEther(econ.chargeEth.toString());
    const totalWei = (perWei * BigInt(count)).toString();

    const CHAIN_ENV = process.env.NEXT_PUBLIC_CHAIN || 'base-sepolia';
    const CHAIN = CHAIN_ENV === 'base' ? base : baseSepolia;
    const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS as `0x${string}` | undefined;

    return NextResponse.json({
      count,
      sessionIds,
      perWei: perWei.toString(),
      totalWei,
      to: TREASURY_ADDRESS || null,
      chainId: CHAIN.id,
      payoutEth: econ.payoutEth,
      chargeEth: econ.chargeEth,
    });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}


