"use client";

import { type ReactNode } from "react";
import { SELECTED_CHAIN } from '@/lib/wagmi';
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { WagmiConfig } from 'wagmi';
import { config } from '@/lib/wagmi';

export function Providers(props: { children: ReactNode }) {
  return (
    <WagmiConfig config={config}>
      <MiniKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={SELECTED_CHAIN}
      config={{
        appearance: {
          mode: "auto",
          theme: "mini-app-theme",
          name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
          logo: process.env.NEXT_PUBLIC_ICON_URL,
        },
      }}
    >
      {props.children}
    </MiniKitProvider>
    </WagmiConfig>
  );
}
