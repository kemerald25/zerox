'use client';
import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import BottomNav from '../components/BottomNav';

interface DailyStatus {
  completed: boolean;
  eligible: boolean;
  paid: boolean;
  streak: number;
  message: string;
}

interface DayStatus {
  day: number;
  date: string;
  completed: boolean;
  bonusClaimed: boolean;
  isToday: boolean;
  isFuture: boolean;
  isCurrentMonth: boolean;
}

export default function DailyPage() {
  const [dailySeed, setDailySeed] = useState<string | null>(null);
  const [dailyStatus, setDailyStatus] = useState<DailyStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dayStatuses, setDayStatuses] = useState<DayStatus[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { address } = useAccount();

  // Generate calendar data for specified month
  const generateCalendarDays = (monthDate: Date): DayStatus[] => {
    const days: DayStatus[] = [];
    const month = monthDate.getMonth();
    const year = monthDate.getFullYear();
    
    // Get first day of specified month
    const firstDay = new Date(year, month, 1);
    // Get last day of specified month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Add days from previous month to fill first week if needed
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(firstDay);
      prevDate.setDate(prevDate.getDate() - (i + 1));
      const dateStr = prevDate.toISOString().slice(0, 10);
      
      days.push({
        day: prevDate.getDate(),
        date: dateStr,
        completed: false,
        bonusClaimed: false,
        isToday: false,
        isFuture: false,
        isCurrentMonth: false
      });
    }
    
    // Add all days of specified month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().slice(0, 10);
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      
      days.push({
        day: day,
        date: dateStr,
        completed: false,
        bonusClaimed: false,
        isToday: isToday,
        isFuture: date > today,
        isCurrentMonth: true
      });
    }
    
    // Add days from next month to fill last week if needed
    const lastDayOfWeek = lastDay.getDay();
    for (let i = 1; i <= (6 - lastDayOfWeek); i++) {
      const nextDate = new Date(lastDay);
      nextDate.setDate(lastDay.getDate() + i);
      const dateStr = nextDate.toISOString().slice(0, 10);
      
      days.push({
        day: nextDate.getDate(),
        date: dateStr,
        completed: false,
        bonusClaimed: false,
        isToday: false,
        isFuture: true,
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
    setDayStatuses(generateCalendarDays(newMonth));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setDayStatuses(generateCalendarDays(today));
  };

  // Fetch daily seed
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/daily');
        const j = await r.json();
        if (typeof j?.seed === 'string') setDailySeed(j.seed);
      } catch {}
    })();
  }, []);

  // Initialize calendar
  useEffect(() => {
    setDayStatuses(generateCalendarDays(currentMonth));
  }, [currentMonth]);

  // Check daily status when address changes
  useEffect(() => {
    if (!address) return;
    
    const checkDailyStatus = async () => {
      try {
        const r = await fetch('/api/daily', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            address, 
            completed: false, // Just checking status
            seed: dailySeed,
            symbol: 'X',
            difficulty: 'hard',
            result: null
          })
        });
        const j = await r.json();
        if (j.ok) {
          setDailyStatus({
            completed: j.eligible || false,
            eligible: j.eligible || false,
            paid: j.paid || false,
            streak: j.streak || 0,
            message: j.message || ''
          });
        }
      } catch {}
    };

    if (dailySeed) {
      checkDailyStatus();
    }
  }, [address, dailySeed]);

  // Fetch calendar data separately
  useEffect(() => {
    if (!address || dayStatuses.length === 0) return;
    
    const fetchCalendarData = async () => {
      try {
        const r = await fetch('/api/daily', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address })
        });
        const j = await r.json();
        if (j.ok && j.checkins) {
          // Update calendar with real data
          const updatedDays = dayStatuses.map(day => {
            const checkin = j.checkins[day.date];
            return {
              ...day,
              completed: checkin?.completed || false,
              bonusClaimed: checkin?.bonusClaimed || false
            };
          });
          setDayStatuses(updatedDays);
        }
      } catch {}
    };

    fetchCalendarData();
  }, [address, dayStatuses.length]);

  // Refresh calendar when daily status changes
  useEffect(() => {
    if (dailyStatus && address && dayStatuses.length > 0) {
      const fetchCalendarData = async () => {
        try {
          const r = await fetch('/api/daily', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address })
          });
          const j = await r.json();
          if (j.ok && j.checkins) {
            const updatedDays = dayStatuses.map(day => {
              const checkin = j.checkins[day.date];
              return {
                ...day,
                completed: checkin?.completed || false,
                bonusClaimed: checkin?.bonusClaimed || false
              };
            });
            setDayStatuses(updatedDays);
          }
        } catch {}
      };
      
      fetchCalendarData();
    }
  }, [dailyStatus, address, dayStatuses.length]);

  const handlePlayChallenge = () => {
    if (!dailySeed) return;
    
    const base = process.env.NEXT_PUBLIC_URL || window.location.origin;
    const url = `${base}/play?seed=${dailySeed}&symbol=X&difficulty=hard`;
    window.location.href = url;
  };

  const handleRefresh = async () => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      // Refresh both daily status and calendar
      const [statusRes, calendarRes] = await Promise.all([
        fetch('/api/daily', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            address, 
            completed: false,
            seed: dailySeed,
            symbol: 'X',
            difficulty: 'hard',
            result: null
          })
        }),
        fetch('/api/daily', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address })
        })
      ]);
      
      const statusData = await statusRes.json();
      const calendarData = await calendarRes.json();
      
      if (statusData.ok) {
        setDailyStatus({
          completed: statusData.eligible || false,
          eligible: statusData.eligible || false,
          paid: statusData.paid || false,
          streak: statusData.streak || 0,
          message: statusData.message || ''
        });
      }
      
      if (calendarData.ok && calendarData.checkins) {
        const updatedDays = dayStatuses.map(day => {
          const checkin = calendarData.checkins[day.date];
          return {
            ...day,
            completed: checkin?.completed || false,
            bonusClaimed: checkin?.bonusClaimed || false
          };
        });
        setDayStatuses(updatedDays);
      }
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDayStatusColor = (day: DayStatus) => {
    if (day.isToday) return 'bg-[#70FF5A] text-white border-[#70FF5A]';
    if (day.completed && day.bonusClaimed) return 'bg-[#70FF5A] text-white border-[#70FF5A]';
    if (day.completed) return 'bg-[#70FF5A]/20 text-[#70FF5A] border-[#70FF5A]';
    if (day.isFuture) return 'bg-gray-100 text-gray-400 border-gray-200';
    if (!day.isCurrentMonth) return 'bg-gray-50 text-gray-300 border-gray-100';
    return 'bg-white text-gray-500 border-gray-200';
  };

  const getDayStatusIcon = (day: DayStatus) => {
    if (day.isToday) return '🎯';
    if (day.completed && day.bonusClaimed) return '💰';
    if (day.completed) return '✅';
    if (day.isFuture) return '';
    return '❌';
  };

  return (
    <>
      <div className="min-h-screen" style={{ backgroundColor: '#ffffff' }}>
        <div className="w-full max-w-md mx-auto pt-10 text-center">
          <div className="p-4 rounded-lg border border-[#e5e7eb] bg-white">
            <div className="text-xl font-bold mb-2 text-[#0a0a0a]">Daily Challenge</div>
            <div className="text-sm mb-2 text-[#4b4b4f]">
              Beat the AI on hard mode with today's seed to earn bonus faucet and XP.
            </div>
            
            {/* Streak Display */}
            {address && dailyStatus && (
              <div className="mb-3 p-2 rounded-lg bg-[#70FF5A]/10 border border-[#70FF5A]/30">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-[#0a0a0a]">
                    🔥 Current Streak: {dailyStatus.streak} days
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="text-xs px-2 py-1 rounded bg-[#70FF5A] text-white hover:bg-[#5cef4a] disabled:opacity-50"
                  >
                    {isLoading ? '🔄' : '🔄'}
                  </button>
                </div>
                {dailyStatus.completed && (
                  <div className="text-xs text-[#4b4b4f] mt-1">
                    {dailyStatus.paid ? '✅ Bonus claimed today!' : '✅ Challenge completed today'}
                  </div>
                )}
              </div>
            )}

            {/* Monthly Calendar Grid */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="text-[#70FF5A] hover:text-[#5cef4a] p-1"
                  disabled={isLoading}
                >
                  ←
                </button>
                <div className="text-sm font-semibold text-[#0a0a0a]">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Calendar
                </div>
                <button
                  onClick={() => navigateMonth('next')}
                  className="text-[#70FF5A] hover:text-[#5cef4a] p-1"
                  disabled={isLoading}
                >
                  →
                </button>
              </div>
              
              {/* Today Button */}
              <div className="text-center mb-2">
                <button
                  onClick={goToToday}
                  className="text-xs px-3 py-1 rounded-full bg-[#70FF5A]/20 text-[#70FF5A] hover:bg-[#70FF5A]/30 border border-[#70FF5A]/30"
                  disabled={isLoading}
                >
                  Today
                </button>
              </div>
              
              {/* Progress Bar */}
              {address && dailyStatus && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-[#4b4b4f] mb-1">
                    <span>Progress</span>
                    <span>{dailyStatus.streak}/30 days</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-[#70FF5A] to-[#5cef4a] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((dailyStatus.streak / 30) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {/* Day Names Header */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
                  <div key={dayName} className="text-xs font-medium text-[#4b4b4f] text-center py-1">
                    {dayName}
                  </div>
                ))}
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {dayStatuses.map((day, index) => (
                  <div
                    key={index}
                    className={`
                      relative w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xs font-medium
                      ${getDayStatusColor(day)}
                      ${day.isToday ? 'ring-2 ring-[#70FF5A] ring-offset-2' : ''}
                      transition-all duration-200 hover:scale-105
                    `}
                    title={`${day.date}${day.completed ? ' - Completed' : ''}${day.bonusClaimed ? ' - Bonus Claimed' : ''}`}
                  >
                    <span className={`text-xs ${!day.isCurrentMonth ? 'text-gray-300' : ''}`}>
                      {day.day}
                    </span>
                    {getDayStatusIcon(day) && (
                      <span className="absolute -top-1 -right-1 text-xs">
                        {getDayStatusIcon(day)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-[#4b4b4f]">
                <div className="flex justify-center gap-4">
                  <span>✅ Completed</span>
                  <span>💰 Bonus Claimed</span>
                  <span>🎯 Today</span>
                </div>
              </div>
              
              {/* Motivational Text */}
              {address && dailyStatus && (
                <div className="mt-3 p-2 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="text-xs text-blue-800">
                    {dailyStatus.streak === 0 && "🎯 Start your streak today!"}
                    {dailyStatus.streak > 0 && dailyStatus.streak < 7 && `🔥 Great start! Keep going for a week!`}
                    {dailyStatus.streak >= 7 && dailyStatus.streak < 14 && `🚀 Week 1 complete! Aim for 2 weeks!`}
                    {dailyStatus.streak >= 14 && dailyStatus.streak < 21 && `💪 Halfway there! Push for 3 weeks!`}
                    {dailyStatus.streak >= 21 && dailyStatus.streak < 30 && `🌟 Almost there! Just ${30 - dailyStatus.streak} more days!`}
                    {dailyStatus.streak >= 30 && `🏆 Legend! You've completed the full 30-day challenge!`}
                  </div>
                  {dailyStatus.streak > 0 && dailyStatus.streak < 30 && (
                    <div className="text-xs text-blue-600 mt-1">
                      Next milestone: {Math.ceil(dailyStatus.streak / 7) * 7} days
                    </div>
                  )}
                </div>
              )}
            </div>

            <details className="text-xs opacity-90 mb-3">
              <summary className="cursor-pointer">How it works</summary>
              <div className="mt-2 text-left text-[#4b4b4f]">
                - You must play with symbol X and difficulty Hard using today's seed.<br/>
                - Winning auto-claims a one-time bonus to your wallet (rate-limited daily).<br/>
                - Draws/losses do not qualify, but still count for XP and streaks.<br/>
                - Maintain your streak by completing challenges daily!
              </div>
            </details>
            
            <button
              className={`px-5 py-3 rounded-lg text-white w-full ${
                dailyStatus?.completed 
                  ? 'bg-[#70FF5A] cursor-default' 
                  : 'bg-[#70FF5A] hover:bg-[#5cef4a]'
              }`}
              disabled={!dailySeed || isLoading || dailyStatus?.completed}
              onClick={handlePlayChallenge}
            >
              {!dailySeed ? 'Loading…' : 
               dailyStatus?.completed ? 'Challenge Completed Today' : 
               'Play Today\'s Challenge'}
            </button>
            
            <div className="mt-4 text-sm text-[#4b4b4f]">
              {address ? (
                dailyStatus?.completed ? 
                  'Great job! Come back tomorrow for the next challenge.' :
                  'Complete today\'s challenge to maintain your streak!'
              ) : (
                'Connect wallet to track streak'
              )}
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </>
  );
}


