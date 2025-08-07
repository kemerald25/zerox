# Blockchain Tic-Tac-Toe

A decentralized Tic-Tac-Toe game built with Next.js and blockchain technology. Play against friends and track your scores on the blockchain!

## Features

- 🎮 Classic Tic-Tac-Toe gameplay
- ⛓️ Blockchain-based score tracking
- 👛 Wallet integration for player identification
- 🏆 Persistent scoreboard using smart contracts
- 🔔 Real-time notifications for game events
- 🌓 Dark/light mode support

## Tech Stack

- [Next.js](https://nextjs.org) - React framework for the frontend
- [MiniKit](https://docs.base.org/builderkits/minikit/overview) - Base blockchain integration
- [OnchainKit](https://www.base.org/builders/onchainkit) - Blockchain utilities
- [Tailwind CSS](https://tailwindcss.com) - Styling
- Solidity Smart Contracts - For scoreboard functionality

## Getting Started

1. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

2. Set up environment variables:
Copy `.env.example` to `.env.local` and fill in the required values:

```bash
# Shared/OnchainKit variables
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=
NEXT_PUBLIC_URL=
NEXT_PUBLIC_ICON_URL=
NEXT_PUBLIC_ONCHAINKIT_API_KEY=

# Frame metadata
FARCASTER_HEADER=
FARCASTER_PAYLOAD=
FARCASTER_SIGNATURE=
NEXT_PUBLIC_APP_ICON=
NEXT_PUBLIC_APP_SUBTITLE=
NEXT_PUBLIC_APP_DESCRIPTION=
NEXT_PUBLIC_APP_SPLASH_IMAGE=
NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR=
NEXT_PUBLIC_APP_PRIMARY_CATEGORY=
NEXT_PUBLIC_APP_HERO_IMAGE=
NEXT_PUBLIC_APP_TAGLINE=
NEXT_PUBLIC_APP_OG_TITLE=
NEXT_PUBLIC_APP_OG_DESCRIPTION=
NEXT_PUBLIC_APP_OG_IMAGE=

# Redis config for notifications
REDIS_URL=
REDIS_TOKEN=
```

3. Start the development server:
```bash
npm run dev
```

The game will be available at [http://localhost:3000](http://localhost:3000).

## Game Components

- `GameBoard.tsx` - The main game board interface
- `GameControls.tsx` - Game control buttons and player actions
- `GameStatus.tsx` - Current game state display
- `Scoreboard.tsx` - Blockchain-based score tracking
- `WalletCheck.tsx` - Wallet connection management

## Smart Contracts

The game uses the `TicTacToeScoreboard.sol` smart contract to track player scores on the blockchain. The contract includes:

- Player statistics tracking
- Win/loss/draw recording
- Historical game data storage

## Notifications

The game includes a Redis-backed notification system that alerts players about:

- Game turns
- Game completion
- Score updates
- Opponent actions

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT license.

## Learn More

- [MiniKit Documentation](https://docs.base.org/builderkits/minikit/overview)
- [OnchainKit Documentation](https://docs.base.org/builderkits/onchainkit/getting-started)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)