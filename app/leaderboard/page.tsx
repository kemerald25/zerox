'use client';
import React from 'react';
import BottomNav from '../components/BottomNav';
import LeaderboardContent from '../page';

export default function LeaderboardPage() {
  return (
    <>
      {/* Reuse content from page.tsx where LeaderboardTab and SprintSection are exported if needed */}
      <LeaderboardShell />
      <BottomNav />
    </>
  );
}

function LeaderboardShell() {
  // Lightweight wrapper calling the existing content components inside page.tsx via dynamic import isn't setup;
  // For now render a small bridge by reusing the exported functions indirectly.
  // As an MVP, we can copy the implementation into this file later if required.
  const Dynamic = React.useMemo(() => require('../page').default, []);
  return <Dynamic />;
}

'use client';

import Home from '../page';

export default function LeaderboardPage() {
  return <Home />;
}


