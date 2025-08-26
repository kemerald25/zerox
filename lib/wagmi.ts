import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

// Use Base mainnet only since that's where the contract is deployed
export const SELECTED_CHAIN = base;

// Use Base mainnet RPC
const ACTIVE_RPC = 'https://mainnet.base.org';

export const config = createConfig({
  chains: [SELECTED_CHAIN],
  transports: {
    [base.id]: http(ACTIVE_RPC)
  },
  connectors: [
    // Only use Farcaster Mini App connector
    farcasterMiniApp()
  ],
});