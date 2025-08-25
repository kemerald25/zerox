/* Re-export of Play tab extracted from page.tsx */
'use client';
import React from 'react';
import Home from '../page';
import BottomNav from '../components/BottomNav';

export default function PlayPage() {
  return (
    <>
      <div className="min-h-screen" style={{ backgroundColor: '#141414' }}>
        <Home />
      </div>
      <BottomNav />
    </>
  );
}


