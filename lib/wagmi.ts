import { http, createConfig } from 'wagmi';
import { base, baseSepolia, mainnet } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

const CHAIN_ENV = process.env.NEXT_PUBLIC_CHAIN || 'base-sepolia';
export const SELECTED_CHAIN = CHAIN_ENV === 'base'
  ? base
  : CHAIN_ENV === 'mainnet'

    : baseSepolia;

const PUBLIC_RPC = process.env.NEXT_PUBLIC_RPC_URL;

export const config = createConfig({
  chains: [SELECTED_CHAIN],
  transports: {
    [base.id]: http(PUBLIC_RPC),
    [baseSepolia.id]: http(PUBLIC_RPC)
  },
  connectors: [farcasterMiniApp()],
});