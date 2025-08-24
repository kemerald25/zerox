/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { motion, useScroll, useSpring } from 'framer-motion';
import Link from 'next/link';
import { useAccount, useConnect } from 'wagmi';
import React, { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export function Navbar() {
  const { scrollYProgress } = useScroll();
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const [fcUser, setFcUser] = useState<{
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Ensure SDK is ready
        if ((sdk as any)?.actions?.ready) {
          await (sdk as any).actions.ready();
        }

        // Detect mini app environment before accessing context
        const isMini = Boolean((sdk as any)?.isMiniApp || (sdk as any)?.getCapabilities);

        if (!isMini) return;

        // Prefer getContext if available to avoid proxy traps
        let context: any = null;
        if (typeof (sdk as any)?.getContext === 'function') {
          context = await (sdk as any).getContext();
        } else if ((sdk as any)?.context) {
          context = (sdk as any).context;
        }

        // Materialize to a plain object to avoid proxy path traps
        let plainContext = context;
        try {
          plainContext = typeof structuredClone === 'function'
            ? structuredClone(context)
            : JSON.parse(JSON.stringify(context));
        } catch {}

        const user = plainContext?.user;
        if (!cancelled && user?.fid) {
          const maybePfp = (user as any)?.pfpUrl ?? (user as any)?.pfp ?? (user as any)?.profile?.pfp ?? (user as any)?.profile?.picture;
          const pickUrl = (val: unknown): string | undefined => {
            if (typeof val === 'string') return val;
            if (val && typeof val === 'object') {
              const obj = val as Record<string, unknown>;
              const keys = ['url', 'src', 'srcUrl', 'original', 'default', 'small', 'medium', 'large'];
              for (const k of keys) {
                const v = obj[k];
                if (typeof v === 'string') return v;
              }
            }
            return undefined;
          };
          const pfpUrl = pickUrl(maybePfp);
          const username = (user as any)?.username ?? (user as any)?.profile?.username;
          setFcUser({
            fid: user.fid,
            username,
            displayName: user.displayName,
            pfpUrl,
          });
        }
      } catch {
        // Ignore if not in mini app or context unavailable
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-[#66c800] origin-left z-50"
        style={{ scaleX }}
      />
      <nav className="sticky top-0 z-40 w-full backdrop-blur-sm bg-white/30 dark:bg-black/30 border-b border-[#b6f569]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link 
                href="/"
                className="text-lg font-semibold text-[#66c800] hover:text-[#b6f569] transition-colors"
              >
                TicTacToe
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {fcUser ? (
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#66c800]/10 text-[#66c800] transition-colors"
                >
                  {typeof fcUser.pfpUrl === 'string' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fcUser.pfpUrl} alt={fcUser.username || 'pfp'} className="w-8 h-8 rounded-full" />
                  ) : null}
                  <div className="leading-tight">
                    <div className="font-semibold">{fcUser.displayName || fcUser.username || `fid:${fcUser.fid}`}</div>
                    {fcUser.username ? (
                      <div className="text-xs opacity-80">@{fcUser.username}</div>
                    ) : null}
                  </div>
                </motion.div>
              ) : isConnected ? (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="px-4 py-2 rounded-lg bg-[#66c800]/10 text-[#66c800] transition-colors"
                >
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </motion.div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 rounded-lg bg-[#66c800]/10 text-[#66c800] hover:bg-[#66c800]/20 transition-colors cursor-pointer"
                  onClick={() => connect({ connector: connectors[0] })}
                >
                  Connect Wallet
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}