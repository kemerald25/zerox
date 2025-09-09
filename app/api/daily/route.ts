import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

function today(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// Deterministic daily seed
function dailySeedString(): string {
  return today();
}

// Get check-ins for current month
async function getCurrentMonthCheckins(address: string): Promise<Record<string, { completed: boolean; bonusClaimed: boolean }>> {
  if (!supabase) return {};
  
  try {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Get first and last day of current month
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    const { data, error } = await supabase
      .from('daily_checkins')
      .select('day, completed, bonus_claimed')
      .eq('address', address.toLowerCase())
      .gte('day', firstDay.toISOString().slice(0, 10))
      .lte('day', lastDay.toISOString().slice(0, 10));
    
    if (error || !data) return {};
    
    const checkins: Record<string, { completed: boolean; bonusClaimed: boolean }> = {};
    data.forEach(entry => {
      checkins[entry.day] = {
        completed: entry.completed,
        bonusClaimed: entry.bonus_claimed
      };
    });
    
    return checkins;
  } catch {
    return {};
  }
}

// Calculate current streak
async function getCurrentStreak(address: string): Promise<number> {
  if (!supabase) return 0;
  
  try {
    const todayStr = today();
    const { data, error } = await supabase
      .from('daily_checkins')
      .select('day, completed')
      .eq('address', address.toLowerCase())
      .gte('day', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
      .lte('day', todayStr)
      .order('day', { ascending: false });
    
    if (error || !data) return 0;
    
    let streak = 0;
    const currentDate = new Date(todayStr);
    
    for (const entry of data) {
      if (entry.completed) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break; // Streak broken
      }
    }
    
    return streak;
  } catch {
    return 0;
  }
}

export async function GET() {
  const seed = dailySeedString();
  // Fixed challenge: X hard by default
  return NextResponse.json({ seed, symbol: 'X', difficulty: 'hard' });
}

// New endpoint to get calendar data
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const address: string | undefined = body?.address;
    
    if (!address) {
      return NextResponse.json({ error: 'address required' }, { status: 400 });
    }
    
    const checkins = await getCurrentMonthCheckins(address);
    const streak = await getCurrentStreak(address);
    
    return NextResponse.json({ 
      ok: true, 
      checkins, 
      streak,
      today: today()
    });
    
  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address: string | undefined = body?.address;
    const completed: boolean | undefined = body?.completed;
    const seed: string | undefined = body?.seed;
    // symbol/difficulty are no longer used for eligibility
    // const symbol: 'X' | 'O' | undefined = body?.symbol;
    // const difficulty: 'easy' | 'hard' | undefined = body?.difficulty;
    const result: 'win' | 'loss' | 'draw' | undefined = body?.result;
    
    if (!address || !completed) {
      return NextResponse.json({ error: 'address and completed required' }, { status: 400 });
    }
    
    const todayStr = today();
    const addr = address.toLowerCase();
    
    // Record daily check-in
    if (supabase) {
      const { error: upsertError } = await supabase
        .from('daily_checkins')
        .upsert({
          address: addr,
          day: todayStr,
          completed: completed,
          game_result: result || null,
          bonus_claimed: false
        }, { onConflict: 'address,day' });
      
      if (upsertError) {
        console.error('Failed to upsert daily check-in:', upsertError);
      }
    }

    // Verify eligibility (Option B): must be today's seed and result win; drop difficulty and symbol requirements
    const isEligible = completed && seed === dailySeedString() && result === 'win';
    if (!isEligible) {
      const streak = await getCurrentStreak(addr);
      return NextResponse.json({ 
        ok: true, 
        eligible: false, 
        streak,
        message: 'Daily challenge completed but not eligible for bonus'
      });
    }

    // Check if bonus already claimed today
    if (supabase) {
      const { data: existingCheckin } = await supabase
        .from('daily_checkins')
        .select('bonus_claimed')
        .eq('address', addr)
        .eq('day', todayStr)
        .single();
      
      if (existingCheckin?.bonus_claimed) {
        const streak = await getCurrentStreak(addr);
        return NextResponse.json({ 
          ok: true, 
          eligible: true, 
          paid: false, 
          streak,
          message: 'Bonus already claimed today'
        });
      }
    }

    // Payout from treasury
    const RPC_URL = 'https://mainnet.base.org'; // Use Base mainnet
    const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY;
    const BONUS = process.env.DAILY_BONUS_ETH || process.env.PAYOUT_AMOUNT_ETH || '0.00002';
    
    if (!TREASURY_PRIVATE_KEY) {
      return NextResponse.json({ error: 'treasury not configured' }, { status: 500 });
    }

    try {
      const account = privateKeyToAccount(`0x${TREASURY_PRIVATE_KEY.replace(/^0x/, '')}`);
      const wallet = createWalletClient({ account, chain: base, transport: http(RPC_URL) });
      const hash = await wallet.sendTransaction({ 
        to: address as `0x${string}`, 
        value: parseEther(BONUS) 
      });
      
      // Mark bonus as claimed
      if (supabase) {
        await supabase
          .from('daily_checkins')
          .update({ bonus_claimed: true })
          .eq('address', addr)
          .eq('day', todayStr);
      }
      
      const streak = await getCurrentStreak(addr);
      return NextResponse.json({ 
        ok: true, 
        eligible: true, 
        paid: true, 
        hash,
        streak,
        message: 'Daily bonus claimed successfully!'
      });
      
    } catch (txError) {
      console.error('Transaction failed:', txError);
      return NextResponse.json({ 
        error: 'Transaction failed', 
        details: txError instanceof Error ? txError.message : 'Unknown error'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Daily API error:', error);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}


