'use client';

import { useScoreboard } from '@/lib/useScoreboard';
import { motion } from 'framer-motion';
import { useAccount, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

export function Scoreboard() {
  const { address } = useAccount();
  const { connect } = useConnect();
  const { score } = useScoreboard();

  const GREEN = '#66c800';
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
    <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: LIME_GREEN }}>
      <h3 className="text-lg font-bold mb-2" style={{ color: GREEN }}>
        Your Score
      </h3>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold" style={{ color: GREEN }}>
            {score.wins}
          </div>
          <div className="text-sm" style={{ color: GREEN }}>
            Wins
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold" style={{ color: GREEN }}>
            {score.losses}
          </div>
          <div className="text-sm" style={{ color: GREEN }}>
            Losses
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold" style={{ color: GREEN }}>
            {score.draws}
          </div>
          <div className="text-sm" style={{ color: GREEN }}>
            Draws
          </div>
        </div>
      </div>
    </div>
  );
}