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
- **Suggested actions with rationale** — highlights the recommended move and explains *why* in one sentence, grounded in your hand strength, draws, and the opponent's action
- **Hand breakdown panel** — always-visible view of your current best 5 cards with their label, plus a plain-English description of any draw ("You need any heart — ~35% by the river")
- **Draw-aware coaching** — structured detection for flush draws, open-ended straights, gutshots, straight-flush draws, and overcards, with outs counts and rough equity
- **Hand strength meter** — a color-coded bar (Weak to Nuts) that shows how strong your current hand is at a glance
- **Smarter rule-based opponent** — folds weak hands to raises, calls medium hands, raises premium hands; no randomness so behavior is predictable for teaching
- **Multi-hand sessions** — chip stacks persist across hands, blinds escalate every 5 hands, and the session ends when someone busts out
- **Position rotation** — dealer button rotates each hand with SB/BB badges shown next to each player; when the opponent has the button, they act first preflop
- **Guided blind teaching** — on the first hand, the coach explains which blind you are and how many chips you posted; subsequent hands get a concise button-position note
- **Detailed showdown** — names both hands, explains why one beats the other, and teaches hand hierarchy when the ranks are close
- **Phase stepper** — a visual progress bar showing all five streets with completed, current, and upcoming phases
- **Quick-play mode** — skip the tutorial pauses and play at speed, with coaching hints still visible
- **Hand rankings guide** — a slide-out reference panel showing all 10 poker hand types with example cards, accessible during play
- **Fold showdown reveal** — when you fold, the app reveals what both players had and explains whether folding was the right call
- **Session persistence** — chip stacks, hand number, dealer button, blind level, and mode preference survive a browser refresh via localStorage, with a visible "Clear saved game" escape hatch

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
    PokerTable.tsx         — main game layout with dealer button + SB/BB badges
    CardView.tsx           — individual card rendering (face-up / face-down)
    ActionButtons.tsx      — fold / call / raise with suggested action badge + rationale
    CoachPanel.tsx         — coaching panel with hand strength meter + draw alerts
    HandBreakdownPanel.tsx — always-visible panel showing your best 5 cards + draw outs
    TutorialOverlay.tsx    — guided mode pause-and-explain overlay
    PhaseBanner.tsx        — phase stepper with progress visualization + pot display
    ModeSelector.tsx       — guided / quick-play segmented control
    HandGuideButton.tsx    — toggle button for the hand rankings panel
    HandRankingsPanel.tsx  — slide-out drawer showing all 10 hand types with examples
  lib/
    types.ts                   — all shared types and enums
    constants.ts               — shared rank and suit name maps
    deck.ts                    — deck creation, shuffle, deal
    handEvaluator.ts           — hand ranking, scoring, comparison, best 5-card selection
    handEvaluator.test.ts      — unit tests for all hand types + card ordering
    handExamples.ts            — example card data for the hand rankings guide
    opponentAI.ts              — rule-based opponent decisions (fold / call / raise)
    opponentAI.test.ts         — unit tests for every decision path
    blinds.ts                  — blind escalation helper (doubles every 5 hands)
    blinds.test.ts             — unit tests for blind level progression
    tutorial.ts                — coaching messages, recommendations, rationale, draw details
    tutorial.test.ts           — unit tests for draw detection and rationale composition
  store/
    usePokerStore.ts           — Zustand store managing session, game, and tutorial state
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

The test suite (63 tests) covers all 10 hand types, ace-low straight edge cases, kicker tie-breaking, best-hand selection from 7 cards, opponent AI decision paths, blind escalation, draw detection, and rationale composition.

## Architecture Decisions

**Rule-based coaching over AI.** The coach uses simple hand-strength heuristics and pattern matching, not an LLM. This means zero latency, zero API costs, and completely predictable behavior — which matters more than sophistication for a teaching tool.

**Guided mode pauses gameplay.** After each phase (flop, turn, river), the app pauses and shows the coach's explanation in an overlay. The player clicks "Continue" when they're ready. This prevents the common tutorial problem of information flying past too fast.

**Deterministic rule-based opponent.** The opponent uses simple tier rules rather than randomness or an LLM, so every scenario is reproducible and testable. Strong hands raise, medium hands call, weak hands fold to aggression — enough texture to feel like a real opponent without introducing variance that would fight against the teaching goal.

**Session continuity over one-shot hands.** Chip stacks carry over between hands, the button rotates, blinds escalate, and the session ends when someone busts. This exposes beginners to the shape of a real session (decisions compound, you can't just reset every hand) without the complexity of a full multi-table format.

**Rationale alongside every suggestion.** The coach's recommendations always come with a one-sentence "because…" explanation built from hand strength, draw presence, and the opponent's last action. The goal is to teach the reasoning pattern, not just the answer.

**Explicit hand breakdown.** A persistent panel shows the player's current best 5-card hand laid out, with a plain-English label and (if applicable) exactly what card they need to improve. Beginners can't read a table at a glance yet — this makes the evaluator's conclusion visible instead of implicit.

**Single Zustand store.** All game state, session state, tutorial state, and actions live in one store. This makes the data flow easy to follow and avoids prop drilling across components.

## What's Next

### Gameplay depth
- Post-flop position-aware action order (button acts last after the flop, not just first preflop)
- Opponent aggression tiers (tight, loose) so the AI can feel like different personalities between sessions

### Teaching features
- Post-hand history review with play-by-play breakdown
- "Why did I lose?" analysis that points at the key decision points in the replay
- Beginner quizzes between hands (e.g., "which of these hands is stronger?")

### Polish
- Highlight draw cards directly on the table (flush suit glow, straight connectors)
- Card deal and reveal animations
- Sound effects for actions and showdown
- Mobile-responsive layout
- Clean up article grammar in outs descriptions ("a eight" → "an eight")

### Infrastructure
- Deploy to Vercel
- Analytics on which hands and decisions beginners struggle with most
