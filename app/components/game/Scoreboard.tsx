'use client';

import { useScoreboard } from '@/lib/useScoreboard';
import { motion } from 'framer-motion';
import { useAccount, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

export function Scoreboard() {
  const { address } = useAccount();
  const { connect } = useConnect();
  const { score } = useScoreboard();

  const GREEN = '#70FF5A';
  const LIME_GREEN = '#b6f569';

  if (!address) {
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => connect({ connector: injected() })}
        className="mt-4 px-4 py-2 rounded-lg font-bold"
        style={{
          backgroundColor: LIME_GREEN,
          color: GREEN,
          border: `2px solid ${GREEN}`,
        }}
      >
        Connect Wallet to View Score
      </motion.button>
    );
  }

  if (!score) {
    return (
      <div className="mt-4 text-center" style={{ color: GREEN }}>
        No games recorded yet
      </div>
    );
  }

  return (
    <div className="mt-2 w-full max-w-md px-3 py-2 rounded-lg flex items-center justify-center gap-6 text-sm" style={{ backgroundColor: LIME_GREEN }}>
      <div className="flex items-center gap-2" style={{ color: GREEN }}>
        <span className="font-semibold">Wins</span>
        <span className="text-xl font-bold">{score.wins}</span>
      </div>
      <div className="flex items-center gap-2" style={{ color: GREEN }}>
        <span className="font-semibold">Losses</span>
        <span className="text-xl font-bold">{score.losses}</span>
      </div>
      <div className="flex items-center gap-2" style={{ color: GREEN }}>
        <span className="font-semibold">Draws</span>
        <span className="text-xl font-bold">{score.draws}</span>
      </div>
    </div>
  );
}