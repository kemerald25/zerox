/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    if (!supabase) return NextResponse.json({ brackets: [] });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (id) {
      const { data: bracket } = await supabase.from('brackets').select('*').eq('id', id).maybeSingle();
      if (!bracket) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      const { data: players } = await supabase.from('bracket_players').select('*').eq('bracket_id', id).order('seed', { ascending: true });
      const { data: matches } = await supabase.from('bracket_matches').select('*').eq('bracket_id', id).order('round', { ascending: true });
      return NextResponse.json({ bracket, players: players || [], matches: matches || [] });
    }
    const { data } = await supabase.from('brackets').select('*').order('created_at', { ascending: false }).limit(20);
    return NextResponse.json({ brackets: data || [] });
  } catch {
    return NextResponse.json({ brackets: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!supabase) return NextResponse.json({ ok: false }, { status: 500 });
    const body = await req.json();
    const action: string | undefined = body?.action;
    if (action === 'create') {
      const name: string = body?.name || 'Bracket';
      const admin_address: string | undefined = body?.admin_address;
      if (!admin_address) return NextResponse.json({ error: 'admin required' }, { status: 400 });
      const { data: b, error } = await supabase.from('brackets').insert({ name, admin_address }).select('*').maybeSingle();
      if (error || !b) return NextResponse.json({ ok: false }, { status: 500 });
      return NextResponse.json({ ok: true, bracket: b });
    }
    if (action === 'join') {
      const bracket_id: string | undefined = body?.bracket_id;
      const address: string | undefined = body?.address;
      const alias: string | undefined = body?.alias;
      const pfp_url: string | undefined = body?.pfp_url;
      if (!bracket_id || !address) return NextResponse.json({ error: 'missing' }, { status: 400 });
      const { data: players } = await supabase.from('bracket_players').select('*').eq('bracket_id', bracket_id).order('seed', { ascending: true });
      const usedSeeds = (players || []).map((p: any) => p.seed);
      const nextSeed = [1,2,3,4,5,6,7,8].find((s) => !usedSeeds.includes(s));
      if (!nextSeed) return NextResponse.json({ error: 'full' }, { status: 400 });
      await supabase.from('bracket_players').insert({ bracket_id, seed: nextSeed, address: address.toLowerCase(), alias: alias ?? null, pfp_url: pfp_url ?? null });
      if (nextSeed === 8) {
        // auto-create matches
        const pairs = [ [1,8], [4,5], [2,7], [3,6] ];
        for (let i = 0; i < pairs.length; i++) {
          const [p1, p2] = pairs[i];
          await supabase.from('bracket_matches').insert({ bracket_id, round: 1, p1_seed: p1, p2_seed: p2 });
        }
        await supabase.from('brackets').update({ status: 'in_progress' }).eq('id', bracket_id);
      } else {
        await supabase.from('brackets').update({ status: 'open' }).eq('id', bracket_id);
      }
      return NextResponse.json({ ok: true });
    }
    if (action === 'report') {
      const id: string | undefined = body?.match_id;
      const winner_seed: number | undefined = body?.winner_seed;
      if (!id || !winner_seed) return NextResponse.json({ error: 'missing' }, { status: 400 });
      const { data: match } = await supabase.from('bracket_matches').select('*').eq('id', id).maybeSingle();
      if (!match) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      const pKey = winner_seed === match.p1_seed ? 'p1_wins' : 'p2_wins';
      const nextWins = (match[pKey] as number) + 1;
      const done = nextWins >= 2;
      const updates: any = { [pKey]: nextWins, status: done ? 'done' : 'active' };
      if (done) updates.winner_seed = winner_seed;
      await supabase.from('bracket_matches').update(updates).eq('id', id);
      if (done) {
        // advance bracket if round finished
        const { data: roundMatches } = await supabase.from('bracket_matches').select('*').eq('bracket_id', match.bracket_id).eq('round', match.round);
        const allDone = (roundMatches || []).every((m: any) => m.status === 'done');
        if (allDone) {
          if (match.round === 1) {
            // build semifinals from winners
            const winners = (roundMatches || []).sort((a: any,b: any)=>a.p1_seed+b.p2_seed - (b.p1_seed+b.p2_seed)).map((m: any) => m.winner_seed);
            // pairing: winners[0] vs winners[1], winners[2] vs winners[3]
            await supabase.from('bracket_matches').insert([
              { bracket_id: match.bracket_id, round: 2, p1_seed: winners[0], p2_seed: winners[1] },
              { bracket_id: match.bracket_id, round: 2, p1_seed: winners[2], p2_seed: winners[3] }
            ]);
          } else if (match.round === 2) {
            const winners = (roundMatches || []).map((m: any) => m.winner_seed);
            await supabase.from('bracket_matches').insert({ bracket_id: match.bracket_id, round: 3, p1_seed: winners[0], p2_seed: winners[1] });
          } else if (match.round === 3) {
            await supabase.from('brackets').update({ status: 'completed' }).eq('id', match.bracket_id);
          }
        }
      }
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}


