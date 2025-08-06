'use client';

import { useEffect } from 'react';
import { useMiniApp } from '@coinbase/onchainkit/minikit';

export function useMiniAppReady() {
  const sdk = useMiniApp();

  useEffect(() => {
    if (sdk) {
      sdk.actions.ready();
    }
  }, [sdk]);
}