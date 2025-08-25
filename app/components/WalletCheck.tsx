'use client';

import { motion } from 'framer-motion';
import { useAccount, useConnect } from 'wagmi';

export function WalletCheck({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  if (isConnected) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-4"
      >
        <h2 className="text-3xl font-bold" style={{ color: '#70FF5A' }}>
          Welcome to ZeroX
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Connect your Farcaster wallet to start playing
        </p>
      </motion.div>
      
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="px-6 py-3 rounded-lg bg-[#70FF5A] text-white font-semibold shadow-lg hover:bg-[#70FF5A]/90 transition-colors"
        onClick={() => connect({ connector: connectors[0] })}
      >
        Connect Wallet
      </motion.button>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mt-8 text-sm text-gray-500 dark:text-gray-400 max-w-md text-center"
      >
        Your game progress and scores will be saved on-chain
      </motion.div>
    </div>
  );
}