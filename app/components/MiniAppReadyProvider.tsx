'use client';

import { useMiniAppReady } from '@/lib/useMiniAppReady';

export function MiniAppReadyProvider({ children }: { children: React.ReactNode }) {
  useMiniAppReady();
  return <>{children}</>;
}