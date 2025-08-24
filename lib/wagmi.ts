import { http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

const CHAIN_ENV = process.env.NEXT_PUBLIC_CHAIN || 'base-sepolia';
export const SELECTED_CHAIN = CHAIN_ENV === 'base-sepolia'
  ? baseSepolia
  : base;

const PUBLIC_RPC = process.env.NEXT_PUBLIC_RPC_URL;
const ACTIVE_RPC = PUBLIC_RPC || (SELECTED_CHAIN.id === base.id
  ? 'https://mainnet.base.org'
  : 'https://sepolia.base.org');

export const config = createConfig({
  chains: [SELECTED_CHAIN],
  transports: {
    [base.id]: http(SELECTED_CHAIN.id === base.id ? ACTIVE_RPC : 'https://mainnet.base.org'),
    [baseSepolia.id]: http(SELECTED_CHAIN.id === baseSepolia.id ? ACTIVE_RPC : 'https://sepolia.base.org')
  },
  connectors: [farcasterMiniApp()],
});