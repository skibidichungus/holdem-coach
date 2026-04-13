# Hold'em Coach

A guided Texas Hold'em tutorial app that teaches beginners how to play poker by doing — not by reading walls of text.

Instead of dumping rules on you, the app deals you into a hand and coaches you through every decision with short, real-time feedback. No AI required — the coaching engine is entirely rule-based for instant, predictable responses.

## How It Works

You're dealt hole cards and guided through a full hand of poker: preflop, flop, turn, river, and showdown. At each stage, a built-in coach explains what's happening, suggests an action, and gives you feedback after you act.

The app runs in **guided mode**, where gameplay pauses between phases so you can read the coach's explanation before making a move. Every action — fold, call, or raise — gets a short, encouraging response that explains whether your choice was solid, risky, or aggressive.

## Features

- **Learn by playing** — no separate tutorial or rules page, the game teaches you as you go
- **Rule-based coach** — instant feedback on every action with no API calls or loading
- **Hand evaluation** — full poker hand ranking engine that detects all 10 hand types, including edge cases like ace-low straights
- **Phase-by-phase teaching** — explains hole cards, community cards, and hand strength at every street
- **Suggested actions** — highlights the recommended move with a visual badge, without forcing you to follow it
- **Showdown resolution** — evaluates both hands and picks a winner with a clear explanation

## Tech Stack

- **Next.js 15** (App Router) — React framework
- **TypeScript** — strict mode throughout
- **Tailwind CSS 4** — utility-first styling
- **Zustand 5** — lightweight state management

## Project Structure

```
src/
  app/
    page.tsx              — main entry point
    layout.tsx            — root layout
    globals.css           — Tailwind + custom CSS variables + animations
  components/
    PokerTable.tsx        — main game layout
    CardView.tsx          — individual card rendering (face-up / face-down)
    ActionButtons.tsx     — fold / call / raise with suggested action badge
    CoachPanel.tsx        — persistent coaching feedback panel
    TutorialOverlay.tsx   — guided mode pause-and-explain overlay
    PhaseBanner.tsx       — current street + pot display
  lib/
    types.ts              — all shared types and enums
    deck.ts               — deck creation, shuffle, deal
    handEvaluator.ts      — hand ranking, scoring, and comparison
    tutorial.ts           — coaching messages, recommendations, and feedback
  store/
    usePokerStore.ts      — Zustand store managing all game + tutorial state
```

## Getting Started

```bash
git clone https://github.com/skibidichungus/holdem-coach.git
cd holdem-coach
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play.

## Architecture Decisions

**Rule-based coaching over AI.** The coach uses simple hand-strength heuristics and pattern matching, not an LLM. This means zero latency, zero API costs, and completely predictable behavior — which matters more than sophistication for a teaching tool.

**Guided mode pauses gameplay.** After each phase (flop, turn, river), the app pauses and shows the coach's explanation in an overlay. The player clicks "Continue" when they're ready. This prevents the common tutorial problem of information flying past too fast.

**Passive opponent.** The computer opponent never folds or raises — they always call. This keeps the focus on the player's learning rather than on opponent strategy, which is a separate skill.

**Single Zustand store.** All game state, tutorial state, and actions live in one store. This makes the data flow easy to follow and avoids prop drilling across components.

## What's Next

- Quick-play mode (no tutorial pauses)
- Draw detection in coach feedback (flush draws, straight draws)
- Multi-hand sessions with persistent chip counts
- Mobile-responsive layout
- Optional AI-powered deeper explanations
