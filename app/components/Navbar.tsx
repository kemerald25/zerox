/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { motion, useScroll, useSpring } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useAccount, useConnect } from 'wagmi';
import React, { useEffect, useState } from 'react';
import { toggleMute, setVolume, getVolume } from '@/lib/sound';
import { useMiniKit, useIsInMiniApp } from '@coinbase/onchainkit/minikit';

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

  const { context, isFrameReady, setFrameReady } = useMiniKit();
  const { isInMiniApp } = useIsInMiniApp();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [isFrameReady, setFrameReady]);

  useEffect(() => {
    if (!isInMiniApp || !context?.user) return;

    const user: any = context.user as any;
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

    const maybePfp = user.pfpUrl ?? user.pfp ?? user.profile?.pfp ?? user.profile?.picture;
    const pfpUrl = pickUrl(maybePfp);
    const username = user.username ?? user.profile?.username;
    const displayName = user.displayName ?? user.profile?.displayName ?? user.profile?.name;

    setFcUser({
      fid: user.fid,
      username,
      displayName,
      pfpUrl,
    });
  }, [isInMiniApp, context]);

  const [isMuted, setIsMuted] = useState(false);
  const [vol, setVol] = useState(getVolume());

  useEffect(() => {
    setVolume(vol);
  }, [vol]);

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-[#70FF5A] origin-left z-50"
        style={{ scaleX }}
      />
      <nav className="sticky top-0 z-40 w-full bg-[#000000] border-b border-[#e5e7eb]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center gap-2">
                <Image src="/logo.png" alt="ZeroX" width={40} height={40} className="rounded" />
                <span className="text-lg font-semibold text-[#70FF5A] hover:text-[#b6f569] transition-colors">ZeroX</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center gap-2 mr-2">
                <button
                  aria-label="Toggle mute"
                  className="px-2 py-1 rounded bg-[#70FF5A]/10 text-[#70FF5A]"
                  onClick={() => { toggleMute(); setIsMuted(!isMuted); }}
                >{isMuted ? 'Unmute' : 'Mute'}</button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={vol}
                  onChange={(e) => setVol(parseFloat(e.target.value))}
                />
              </div>
              {fcUser ? (
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#70FF5A]/10 text-[#393535] transition-colors"
                >
                  {typeof fcUser.pfpUrl === 'string' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fcUser.pfpUrl} alt={fcUser.username || 'pfp'} className="w-14 h-10 rounded-md" />
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
                  className="px-4 py-2 rounded-lg bg-[#70FF5A]/60 text-[#ffffff] transition-colors"
                >
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </motion.div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 rounded-lg bg-[#70FF5A]/10 text-[#70FF5A] hover:bg-[#70FF5A]/20 transition-colors cursor-pointer"
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