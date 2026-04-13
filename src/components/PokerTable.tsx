"use client";

import { usePokerStore } from "../store/usePokerStore";
import type { Card } from "../lib/types";

// ── Child components ──
import CardView from "./CardView";
import ActionButtons from "./ActionButtons";
import CoachPanel from "./CoachPanel";
import PhaseBanner from "./PhaseBanner";
import TutorialOverlay from "./TutorialOverlay";

// ═══════════════════════════════════════════════════════════════
//  POKER TABLE — MAIN GAME LAYOUT
// ═══════════════════════════════════════════════════════════════

/**
 * The main game layout component. Arranges the table sections:
 *
 *   ┌──────────────────────────────────────┐
 *   │          Opponent's cards            │  (face-down until showdown)
 *   │                                      │
 *   │       Phase Banner  ·  Pot           │
 *   │      [ Community Cards ]             │  (0–5 cards)
 *   │                                      │
 *   │          Player's cards              │  (always face-up)
 *   │     [ Fold ] [ Call ] [ Raise ]      │
 *   └──────────────────────────────────────┘
 *   │           Coach Panel                │  (tutorial message)
 *   └──────────────────────────────────────┘
 *
 * When `tutorial.awaitingContinue` is true, a TutorialOverlay covers
 * the table. When there's a winner, a result banner replaces the buttons.
 */
export default function PokerTable(): JSX.Element {
  // ── Pull all needed state from the store ──
  const player = usePokerStore((state) => state.player);
  const opponent = usePokerStore((state) => state.opponent);
  const communityCards: Card[] = usePokerStore((state) => state.communityCards);
  const pot: number = usePokerStore((state) => state.pot);
  const phase = usePokerStore((state) => state.phase);
  const winner = usePokerStore((state) => state.winner);
  const tutorial = usePokerStore((state) => state.tutorial);
  const continueTutorial = usePokerStore((state) => state.continueTutorial);
  const resetGame = usePokerStore((state) => state.resetGame);

  // Should the opponent's cards be visible?
  // Only at showdown (so the player can see what they were up against).
  const showOpponentCards: boolean = phase === "showdown";

  return (
    <div className="relative w-full max-w-3xl mx-auto flex flex-col gap-5">
      {/* ── THE TABLE ── */}
      {/* A rounded rectangle styled to look like a green felt poker table. */}
      <div
        className="
          relative
          rounded-3xl
          border-4 border-emerald-800/60
          shadow-2xl
          px-6 py-8
          flex flex-col items-center gap-6
          overflow-hidden
        "
        style={{ backgroundColor: "var(--felt-green)" }}
      >
        {/* Subtle inner shadow to create a "recessed" felt effect */}
        <div
          className="
            absolute inset-0
            rounded-3xl
            pointer-events-none
          "
          style={{
            boxShadow: "inset 0 4px 30px rgba(0, 0, 0, 0.3)",
          }}
        />

        {/* ────────────────────────────────────────────────────
            SECTION 1: OPPONENT'S CARDS (top of the table)
        ──────────────────────────────────────────────────── */}
        <div className="relative z-10 flex flex-col items-center gap-2">
          {/* Opponent label */}
          <span className="text-xs font-medium uppercase tracking-wider text-emerald-300/70">
            {opponent.name}
          </span>

          {/* Opponent's two cards */}
          <div className="flex gap-2">
            {opponent.hand.length > 0 ? (
              opponent.hand.map((card: Card, index: number) => (
                <CardView
                  key={`opp-${index}`}
                  card={card}
                  // Face-down unless we're at showdown.
                  faceDown={!showOpponentCards}
                />
              ))
            ) : (
              // Placeholder slots before cards are dealt.
              <>
                <CardPlaceholder />
                <CardPlaceholder />
              </>
            )}
          </div>
        </div>

        {/* ────────────────────────────────────────────────────
            SECTION 2: PHASE BANNER + COMMUNITY CARDS (center)
        ──────────────────────────────────────────────────── */}
        <div className="relative z-10 flex flex-col items-center gap-4 my-2">
          {/* Phase + pot banner */}
          <PhaseBanner phase={phase} pot={pot} />

          {/* Community cards — shown as they're dealt (3 on flop, +1 turn, +1 river) */}
          <div className="flex gap-2 min-h-[100px] items-center">
            {communityCards.length > 0 ? (
              communityCards.map((card: Card, index: number) => (
                <CardView
                  key={`comm-${index}`}
                  card={card}
                  faceDown={false}
                />
              ))
            ) : (
              // Show empty placeholders before the flop.
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4].map((i: number) => (
                  <CardPlaceholder key={`placeholder-${i}`} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ────────────────────────────────────────────────────
            SECTION 3: PLAYER'S CARDS + ACTIONS (bottom)
        ──────────────────────────────────────────────────── */}
        <div className="relative z-10 flex flex-col items-center gap-4">
          {/* Player's two hole cards — always face-up */}
          <div className="flex gap-2">
            {player.hand.length > 0 ? (
              player.hand.map((card: Card, index: number) => (
                <CardView
                  key={`player-${index}`}
                  card={card}
                  faceDown={false}
                />
              ))
            ) : (
              <>
                <CardPlaceholder />
                <CardPlaceholder />
              </>
            )}
          </div>

          {/* Player label */}
          <span className="text-xs font-medium uppercase tracking-wider text-emerald-300/70">
            {player.name} — {player.chips} chips
          </span>

          {/* ── Action buttons or result display ── */}
          {winner !== null ? (
            // Hand is over — show result and a "Play Again" button.
            <ResultBanner winner={winner} onPlayAgain={resetGame} />
          ) : (
            // Hand is still in progress — show action buttons.
            <ActionButtons />
          )}
        </div>

        {/* ────────────────────────────────────────────────────
            TUTORIAL OVERLAY (covers the entire table when paused)
        ──────────────────────────────────────────────────── */}
        {tutorial.awaitingContinue && (
          <TutorialOverlay
            message={tutorial.message}
            onContinue={continueTutorial}
          />
        )}
      </div>

      {/* ── COACH PANEL (below the table) ── */}
      {/* Always visible so the player can re-read guidance at any time. */}
      {!tutorial.awaitingContinue && (
        <CoachPanel
          message={tutorial.message}
          handStrength={tutorial.handStrength}
          drawMessage={tutorial.drawMessage}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SUB-COMPONENT: CARD PLACEHOLDER
// ═══════════════════════════════════════════════════════════════

/**
 * An empty dotted-outline rectangle that marks where a card will appear.
 * Shown before cards are dealt to preserve layout spacing.
 */
function CardPlaceholder(): JSX.Element {
  return (
    <div
      className="
        w-[72px] h-[100px]
        rounded-lg
        border-2 border-dashed border-emerald-600/30
        bg-emerald-800/20
      "
    />
  );
}

// ═══════════════════════════════════════════════════════════════
//  SUB-COMPONENT: RESULT BANNER
// ═══════════════════════════════════════════════════════════════

interface ResultBannerProps {
  /** Who won: "player", "opponent", or "tie". */
  winner: "player" | "opponent" | "tie";
  /** Callback to start a new hand. */
  onPlayAgain: () => void;
}

/**
 * Displayed at showdown once a winner is determined.
 * Shows the result with an appropriate emoji and a "Play Again" button.
 */
function ResultBanner({
  winner,
  onPlayAgain,
}: ResultBannerProps): JSX.Element {
  // Build the result text and pick an emoji.
  let resultText: string;
  let emoji: string;

  if (winner === "player") {
    resultText = "You win!";
    emoji = "🏆";
  } else if (winner === "opponent") {
    resultText = "Opponent wins";
    emoji = "😔";
  } else {
    resultText = "It's a tie!";
    emoji = "🤝";
  }

  return (
    <div className="flex flex-col items-center gap-3 animate-card-in">
      {/* Result text */}
      <div
        className="
          flex items-center gap-2
          bg-black/30 backdrop-blur-sm
          rounded-full
          px-6 py-2
        "
      >
        <span className="text-2xl">{emoji}</span>
        <span
          className="text-lg font-bold"
          style={{ color: "var(--gold-accent)" }}
        >
          {resultText}
        </span>
      </div>

      {/* Play Again button */}
      <button
        id="play-again-btn"
        onClick={onPlayAgain}
        className="
          px-6 py-2.5
          bg-emerald-600 hover:bg-emerald-500
          active:bg-emerald-700
          text-white font-semibold text-sm
          rounded-lg
          transition-colors duration-150
          shadow-md hover:shadow-lg
          cursor-pointer
        "
      >
        Play Again
      </button>
    </div>
  );
}
