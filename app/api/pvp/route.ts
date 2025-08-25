/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const clampSize = (n: number) => (n === 3 || n === 4 || n === 5 ? n : 3);

export async function GET(req: NextRequest) {
  try {
    if (!supabase) return NextResponse.json({});
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const { data } = await supabase.from('pvp_matches').select('*').eq('id', id).maybeSingle();
    return NextResponse.json({ match: data });
  } catch {
    return NextResponse.json({});
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!supabase) return NextResponse.json({ error: 'no db' }, { status: 500 });
    const body = await req.json();
    const action: string | undefined = body?.action;
    if (action === 'create') {
      const invited_by: string | undefined = body?.invited_by;
      const size = clampSize(Number(body?.size ?? 3));
      const misere = Boolean(body?.misere ?? false);
      const blitz: 'off'|'7s'|'5s' = (body?.blitz === '5s' || body?.blitz === '7s') ? body.blitz : 'off';
      const n = size * size;
      const board = JSON.stringify(Array(n).fill(null));
      const row: any = { invited_by: invited_by ?? null, size, misere, blitz, board };
      if (invited_by) row.player_x = invited_by.toLowerCase();
      const { data, error } = await supabase.from('pvp_matches').insert(row).select('*').maybeSingle();
      if (error || !data) return NextResponse.json({ error: 'create_failed' }, { status: 500 });
      return NextResponse.json({ match: data });
    }
    if (action === 'join') {
      const id: string | undefined = body?.id;
      const address: string | undefined = body?.address;
      if (!id || !address) return NextResponse.json({ error: 'missing' }, { status: 400 });
      const { data: m } = await supabase.from('pvp_matches').select('*').eq('id', id).maybeSingle();
      if (!m) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      if (m.status === 'done') return NextResponse.json({ error: 'finished' }, { status: 400 });
      const next: any = {};
      if (!m.player_x) next.player_x = address.toLowerCase();
      else if (!m.player_o && m.player_x.toLowerCase() !== address.toLowerCase()) next.player_o = address.toLowerCase();
      else return NextResponse.json({ ok: true, match: m });
      const hasX = (m.player_x && m.player_x.toLowerCase()) || next.player_x;
      const hasO = (m.player_o && m.player_o.toLowerCase()) || next.player_o;
      next.status = hasX && hasO ? 'active' : 'open';
      const { data } = await supabase.from('pvp_matches').update(next).eq('id', id).select('*').maybeSingle();
      return NextResponse.json({ match: data });
    }
    if (action === 'move') {
      const id: string | undefined = body?.id;
      const address: string | undefined = body?.address;
      const index: number | undefined = body?.index;
      if (!id || !address || typeof index !== 'number') return NextResponse.json({ error: 'missing' }, { status: 400 });
      const { data: m } = await supabase.from('pvp_matches').select('*').eq('id', id).maybeSingle();
      if (!m) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      if (m.status !== 'active') return NextResponse.json({ error: 'not_active' }, { status: 400 });
      const board: Array<string|null> = JSON.parse(m.board || '[]');
      if (index < 0 || index >= board.length) return NextResponse.json({ error: 'bad_index' }, { status: 400 });
      if (board[index] !== null) return NextResponse.json({ error: 'occupied' }, { status: 400 });
      const meIsX = m.player_x && m.player_x.toLowerCase() === address.toLowerCase();
      const meIsO = m.player_o && m.player_o.toLowerCase() === address.toLowerCase();
      if (!meIsX && !meIsO) return NextResponse.json({ error: 'not_in_match' }, { status: 403 });
      const mySymbol = meIsX ? 'X' : 'O';
      if (m.next_turn !== mySymbol) return NextResponse.json({ error: 'not_your_turn' }, { status: 400 });
      board[index] = mySymbol;
      // Check win/draw
      const n = Number(m.size || 3);
      const inRow = n === 3 ? 3 : 4;
      const dirs = [[1,0],[0,1],[1,1],[1,-1]];
      const idx = (x: number, y: number) => y * n + x;
      let winner: string | null = null;
      for (let y=0;y<n;y++){
        for (let x=0;x<n;x++){
          const start = board[idx(x,y)];
          if (!start) continue;
          for (const [dx,dy] of dirs){
            let k=1; let ok=true;
            while (k<inRow){
              const nx = x + dx*k; const ny = y + dy*k;
              if (nx<0||ny<0||nx>=n||ny>=n){ ok=false; break; }
              if (board[idx(nx,ny)] !== start){ ok=false; break; }
              k++;
            }
            if (ok){ winner = start; break; }
          }
          if (winner) break;
        }
        if (winner) break;
      }
      const avail = board.filter((c)=>c===null).length;
      let status = m.status;
      let next_turn = mySymbol === 'X' ? 'O' : 'X';
      let winnerField: string | null = null;
      if (winner){
        status = 'done';
        const misere = Boolean(m.misere);
        const actualWinner = misere ? (winner === 'X' ? 'O' : 'X') : winner;
        winnerField = actualWinner;
      } else if (avail === 0){
        status = 'done';
      }
      const payload: any = { board: JSON.stringify(board), next_turn };
      if (status !== m.status) payload.status = status;
      if (winnerField) payload.winner = winnerField;
      const { data } = await supabase.from('pvp_matches').update(payload).eq('id', id).select('*').maybeSingle();
      return NextResponse.json({ match: data });
    }
    return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}


