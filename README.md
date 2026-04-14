# Hold'em Coach

A guided Texas Hold'em tutorial app that teaches beginners how to play poker by doing — not by reading walls of text.

Instead of dumping rules on you, the app deals you into a hand and coaches you through every decision with short, real-time feedback. No AI required — the coaching engine is entirely rule-based for instant, predictable responses.

## How It Works

You're dealt hole cards and guided through a full hand of poker: preflop, flop, turn, river, and showdown. At each stage, a built-in coach explains what's happening, suggests an action, and gives you feedback after you act.

The app supports two modes: **guided mode**, where gameplay pauses between phases so you can read the coach's explanation before making a move, and **quick-play mode**, which skips the pauses and lets you play at your own pace while still showing coaching hints. Every action — fold, call, or raise — gets a short, encouraging response that explains whether your choice was solid, risky, or aggressive.

## Features

- **Learn by playing** — no separate tutorial or rules page, the game teaches you as you go
- **Rule-based coach** — instant feedback on every action with no API calls or loading
- **Hand evaluation** — full poker hand ranking engine that detects all 10 hand types, including edge cases like ace-low straights
- **Phase-by-phase teaching** — explains hole cards, community cards, and hand strength at every street
- **Suggested actions** — highlights the recommended move with a visual badge, without forcing you to follow it
- **Hand strength meter** — a color-coded bar (Weak to Nuts) that shows how strong your current hand is at a glance
- **Draw detection** — alerts you when you're one card away from a flush, straight, or have overcards on the board
- **Detailed showdown** — names both hands, explains why one beats the other, and teaches hand hierarchy when the ranks are close
- **Phase stepper** — a visual progress bar showing all five streets with completed, current, and upcoming phases
- **Quick-play mode** — skip the tutorial pauses and play at speed, with coaching hints still visible
- **Hand rankings guide** — a slide-out reference panel showing all 10 poker hand types with example cards, accessible during play
- **Fold showdown reveal** — when you fold, the app reveals what both players had and explains whether folding was the right call

## Tech Stack

- **Next.js 15** (App Router) — React framework
- **TypeScript** — strict mode throughout
- **Tailwind CSS 4** — utility-first styling
- **Zustand 5** — lightweight state management
- **Vitest** — unit testing for game logic

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
    CoachPanel.tsx        — coaching panel with hand strength meter + draw alerts
    TutorialOverlay.tsx   — guided mode pause-and-explain overlay
    PhaseBanner.tsx       — phase stepper with progress visualization + pot display
    ModeSelector.tsx      — guided / quick-play segmented control
    HandGuideButton.tsx   — toggle button for the hand rankings panel
    HandRankingsPanel.tsx — slide-out drawer showing all 10 hand types with examples
  lib/
    types.ts                   — all shared types and enums
    constants.ts               — shared rank-name maps (single source of truth)
    deck.ts                    — deck creation, shuffle, deal
    handEvaluator.ts           — hand ranking, scoring, and comparison
    handEvaluator.test.ts      — unit tests (20 tests, all hand types + edge cases)
    handExamples.ts            — example card data for the hand rankings guide
    tutorial.ts                — coaching messages, recommendations, feedback, hand strength, draw detection
  store/
    usePokerStore.ts           — Zustand store managing all game + tutorial state
```

## Getting Started

```bash
git clone https://github.com/skibidichungus/holdem-coach.git
cd holdem-coach
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play.

## Running Tests

```bash
npm test          # run all tests once
npm run test:watch  # watch mode — re-runs on file changes
```

The test suite covers all 10 hand types, ace-low straight edge cases, kicker tie-breaking, and best-hand selection from 7 cards.

## Architecture Decisions

**Rule-based coaching over AI.** The coach uses simple hand-strength heuristics and pattern matching, not an LLM. This means zero latency, zero API costs, and completely predictable behavior — which matters more than sophistication for a teaching tool.

**Guided mode pauses gameplay.** After each phase (flop, turn, river), the app pauses and shows the coach's explanation in an overlay. The player clicks "Continue" when they're ready. This prevents the common tutorial problem of information flying past too fast.

**Passive opponent.** The computer opponent never folds or raises — they always call. This keeps the focus on the player's learning rather than on opponent strategy, which is a separate skill.

**Single Zustand store.** All game state, tutorial state, and actions live in one store. This makes the data flow easy to follow and avoids prop drilling across components.

## What's Next

### Gameplay depth
- Smarter opponent that actually makes decisions (folds weak hands, occasionally raises)
- Multi-hand sessions with chip tracking across rounds and blind escalation
- Position awareness (button, small blind, big blind rotation)

### Teaching features
- Post-session hand history review with play-by-play breakdown
- "Why did I lose?" analysis that explains the key decision points
- Beginner quizzes between hands (e.g., "which of these hands is stronger?")

### Polish
- Card deal and reveal animations
- Sound effects for actions and showdown
- Mobile-responsive layout

### Infrastructure
- Persistent state across sessions (localStorage)
- Deploy to Vercel
- Analytics on which hands and decisions beginners struggle with most
