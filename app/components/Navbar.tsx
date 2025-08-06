'use client';

import { motion, useScroll, useSpring } from 'framer-motion';
import Link from 'next/link';
import { useAccount, useConnect } from 'wagmi';

export function Navbar() {
  const { scrollYProgress } = useScroll();
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

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
              {isConnected ? (
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