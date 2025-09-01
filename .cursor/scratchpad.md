# ZeroX – Sleek UX Plan (Planner)

## Background and Motivation
Elevate ZeroX from functional to delightful: sleek, minimal, mobile‑first gameplay that feels native inside Farcaster/Base Mini App. Priorities: clarity, speed, and legibility with brand green (#70FF5A) + lime (#b6f569), dark greys for contrast.

## Key Challenges and Analysis
- Mixed UI density: controls and info compete with the board on small screens.
- Inconsistent component styling (buttons, toasts) increases cognitive load.
- Variants (4x4/5x5) need responsive tuning to stay tappable.
- Mini‑app safe areas and overlays can block interactions.

## High-level Task Breakdown
1) Design tokens
   - Colors, spacing scale (4/8/12), radii (md/lg/xl), shadows (subtle vs glow), type scale.
   - Success: tokens referenced in classNames or CSS vars with consistent usage.
2) Navbar cleanup
   - Left: logo + ZeroX text. Right: compact mute/volume. Progress bar remains.
   - Success: header height stable; no wrap on small devices.
3) Play layout
   - Top: compact control pills (Size 3/4/5, Misère, Blitz Off/7s/5s) with icon badges.
   - Middle: player card(s) optional; below: responsive board with reduced gaps.
   - Bottom: primary CTA row (Share Result / Challenge) shown only after game end.
   - Success: fits iPhone SE width without horizontal scroll.
4) Daily screen
   - Single hero card, bold CTA, accordion tips.
   - Success: 1‑scroll view; clear CTA.
5) Leaderboard/Sprint
   - Card list with avatar, alias, points; sprint panel matched style.
   - Success: uniform cards; text never overlaps.
6) Toasts and haptics
   - Unified toast style, top‑center; subtle haptics for key actions.
   - Success: no overlapping toasts; 2s auto‑dismiss.
7) A11y and responsive
   - Reduced motion toggle; ensure 4.5:1 contrast where text on color.
   - Success: passes quick contrast check; 44px min tap targets.

## Project Status Board
- [ ] Define ZeroX design tokens
- [ ] Simplify navbar
- [ ] Redesign Play layout controls as pills
- [ ] Tighten GameBoard responsiveness for 4x4/5x5 (done baseline)
- [ ] Standardize primary/secondary buttons
- [ ] Restyle Daily card
- [ ] Restyle Leaderboard/Sprint
- [ ] Standardize toast styles
- [ ] Add reduced motion + haptics toggles
- [ ] **NEW: Implement Rich Match Result Cards**
  - [ ] Design card component with game details layout
  - [ ] Add Farcaster frame metadata for rich embedding
  - [ ] Update match result sharing to use rich cards
  - [ ] Test card display in Farcaster feed

## Current Status / Progress Tracking
- Power‑ups, blitz, auto‑start after outcomes implemented.
- Initial responsive tweaks for board shipped.

## Executor's Feedback or Assistance Requests
- Confirm preferred typography: system stack vs imported font.
- Provide final logo sizes/variants (light/dark) if different from /public/logo.png.

## Lessons
- Avoid overlays (add‑mini‑app) when requiring payment action; hide during settlement.
1. Core Game
   - 3x3 grid with brand colors
   - Basic player vs AI gameplay
   - Two difficulty levels (Easy: random moves, Hard: minimax)
   - Simple symbol selection (X/O)
   - Win/Draw detection
   - Reset game button

2. Essential UI
   - Clean, responsive grid
   - Brand colors implementation
   - Basic move animations
   - Game status display
   - Minimal settings (symbol choice, difficulty)

## Technical Architecture (Simplified)
1. Components
   - `GameBoard`: Main game grid
   - `GameControls`: Difficulty & symbol selection
   - `GameStatus`: Current game state

2. State Management
   - React useState for game state
   - Simple props for component communication

## 1-Hour Task Breakdown (15-minute chunks)
1. 0-15 minutes:
   - Project setup
   - Basic game board implementation
   - Success Criteria: Visible 3x3 grid with brand colors

2. 15-30 minutes:
   - Game state management
   - Move handling
   - Success Criteria: Players can make moves

3. 30-45 minutes:
   - AI implementation (Easy & Hard modes)
   - Symbol selection
   - Success Criteria: Working AI opponent

4. 45-60 minutes:
   - Basic animations
   - Polish UI
   - Testing
   - Success Criteria: Playable game with clean UI

## Project Status Board
- [ ] Basic game board setup (15min)
- [ ] Game state implementation (15min)
- [ ] AI opponent (15min)
- [ ] Final polish (15min)

## Current Status / Progress Tracking
Ready to begin MVP implementation with 1-hour timeframe.

## Technical Dependencies (Minimal)
- Minikit for UI components
- TailwindCSS for styling
- TypeScript for type safety