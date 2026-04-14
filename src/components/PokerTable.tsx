"use client";

import { usePokerStore } from "../store/usePokerStore";
import type { Card, Position } from "../lib/types";
import { getBlindRoles } from "../store/usePokerStore";

import CardView from "./CardView";
import ActionButtons from "./ActionButtons";
import CoachPanel from "./CoachPanel";
import PhaseBanner from "./PhaseBanner";
import TutorialOverlay from "./TutorialOverlay";
import { HandBreakdownPanel } from "./HandBreakdownPanel";

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
export default function PokerTable()  {
  // ── Pull all needed state from the store ──
  const player = usePokerStore((state) => state.player);
  const opponent = usePokerStore((state) => state.opponent);
  const communityCards: Card[] = usePokerStore((state) => state.communityCards);
  const pot: number = usePokerStore((state) => state.pot);
  const phase = usePokerStore((state) => state.phase);
  const winner = usePokerStore((state) => state.winner);
  const tutorial = usePokerStore((state) => state.tutorial);
  const continueTutorial = usePokerStore((state) => state.continueTutorial);
  const startNextHand = usePokerStore((state) => state.startNextHand);
  const startNewSession = usePokerStore((state) => state.startNewSession);
  // Hand labels are populated at showdown so the player can see both hands.
  const playerHandLabel: string | null = usePokerStore((state) => state.playerHandLabel);
  const opponentHandLabel: string | null = usePokerStore((state) => state.opponentHandLabel);
  const opponentLastAction = usePokerStore((state) => state.opponentLastAction);
  // Session state
  const dealerButton: Position = usePokerStore((state) => state.dealerButton);
  const smallBlind: number = usePokerStore((state) => state.smallBlind);
  const handNumber: number = usePokerStore((state) => state.handNumber);
  const sessionOver: boolean = usePokerStore((state) => state.sessionOver);

  // Derive SB/BB roles for both seats from the current button position.
  const blindRoles = getBlindRoles(dealerButton);

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

        {/* ────────────────────────────────────────────────
            SECTION 1: OPPONENT'S CARDS (top of the table)
        ──────────────────────────────────────────────── */}
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-emerald-300/70">
              {opponent.name}
            </span>
            {/* Dealer button badge — shown when opponent holds the button */}
            {dealerButton === "opponent" && (
              <span className="bg-amber-500/90 border border-amber-400/50 text-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                D
              </span>
            )}
            {/* SB/BB blind role badge */}
            <BlindRoleBadge role={blindRoles.opponent} />
          </div>

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

          {/* Opponent's hand label badge — only visible at showdown */}
          {showOpponentCards && opponentHandLabel !== null && (
            <HandLabelBadge label={opponentHandLabel} side="opponent" />
          )}

          {/* Opponent's last action badge — visible whenever the opponent has acted */}
          {opponentLastAction !== null && (
            <OpponentActionBadge action={opponentLastAction} />
          )}
        </div>

        {/* ────────────────────────────────────────────────
            SECTION 2: PHASE BANNER + COMMUNITY CARDS (center)
        ──────────────────────────────────────────────── */}
        <div className="relative z-10 flex flex-col items-center gap-4 my-2">
          {/* Phase banner + community cards */}
          <PhaseBanner phase={phase} pot={pot} />

          {/* Blind level and hand number — small, muted, near the pot/banner */}
          <span className="text-xs text-slate-400">
            Blinds {smallBlind}/{smallBlind * 2} · Hand #{handNumber}
          </span>

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
            SECTION 2.5: HAND BREAKDOWN PANEL
            Shows the player's best 5-card hand as card visuals,
            with a plain-English label and draw info if applicable.
            Visible from deal through showdown in both modes.
        ──────────────────────────────────────────────────── */}
        <div className="relative z-10 w-full px-2">
          <HandBreakdownPanel />
        </div>

        {/* ────────────────────────────────────────────────────
            SECTION 3: PLAYER'S CARDS + ACTIONS (bottom)
        ──────────────────────────────────────────────────── */}
        <div className="relative z-10 flex flex-col items-center gap-4">
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

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-emerald-300/70">
              {player.name} — {player.chips} chips
            </span>
            {/* Dealer button badge — shown when player holds the button */}
            {dealerButton === "player" && (
              <span className="bg-amber-500/90 border border-amber-400/50 text-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                D
              </span>
            )}
            {/* SB/BB blind role badge */}
            <BlindRoleBadge role={blindRoles.player} />
          </div>

          {/* Player's hand label badge — only visible at showdown */}
          {phase === "showdown" && playerHandLabel !== null && (
            <HandLabelBadge label={playerHandLabel} side="player" />
          )}

          {/* ── Action buttons or result display ── */}
          {winner !== null ? (
            // Hand is over — show result, then a context-aware continuation button.
            <ResultBanner
              winner={winner}
              sessionOver={sessionOver}
              onNextHand={startNextHand}
              onNewSession={startNewSession}
            />
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
//  SUB-COMPONENT: HAND LABEL BADGE
// ═══════════════════════════════════════════════════════════════

interface HandLabelBadgeProps {
  /** The evaluated hand label, e.g. "Pair of Kings" or "Ace-high Flush". */
  label: string;
  /** Which side this badge belongs to — affects the accent colour. */
  side: "player" | "opponent";
}

/**
 * A small pill badge that shows a hand's name at showdown.
 * Appears just below the cards for both the player and the opponent.
 * Uses emerald for the player and slate for the opponent to make
 * it easy to tell whose hand is whose at a glance.
 */
function HandLabelBadge({ label, side }: HandLabelBadgeProps)  {
  // Player gets a bright emerald badge; opponent gets a neutral slate one.
  const colorClass: string =
    side === "player"
      ? "bg-emerald-600/80 border-emerald-500/40 text-emerald-100"
      : "bg-slate-600/80 border-slate-500/40 text-slate-200";

  return (
    <div
      className={`
        inline-flex items-center gap-1.5
        px-3 py-1
        rounded-full
        border
        text-xs font-semibold
        animate-card-in
        ${colorClass}
      `}
    >
      <span className="font-bold">*</span>
      <span>{label}</span>
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
function CardPlaceholder()  {
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
  /** True when the session has ended due to a player busting out. */
  sessionOver: boolean;
  /** Callback to deal the next hand in the current session. */
  onNextHand: () => void;
  /** Callback to start a brand new session (resets everything). */
  onNewSession: () => void;
}

/**
 * Displayed at showdown once a winner is determined.
 * Shows the result, then either a "Next Hand" button (session continues)
 * or a "New Session" button (session ended due to bust).
 */
function ResultBanner({
  winner,
  sessionOver,
  onNextHand,
  onNewSession,
}: ResultBannerProps)  {
  // Build the result text and pick a symbol.
  let resultText: string;
  let symbol: string;

  if (winner === "player") {
    resultText = "You win!";
    symbol = "W";
  } else if (winner === "opponent") {
    resultText = "Opponent wins";
    symbol = "L";
  } else {
    resultText = "It's a tie!";
    symbol = "T";
  }

  return (
    <div className="flex flex-col items-center gap-3 animate-card-in">
      <div
        className="
          flex items-center gap-2
          bg-black/30 backdrop-blur-sm
          rounded-full
          px-6 py-2
        "
      >
        <span className="text-2xl font-bold">{symbol}</span>
        <span
          className="text-lg font-bold"
          style={{ color: "var(--gold-accent)" }}
        >
          {resultText}
        </span>
      </div>

      {sessionOver ? (
        // Session ended — one player is busted.
        <button
          id="new-session-btn"
          onClick={onNewSession}
          className="
            px-6 py-2.5
            bg-amber-600 hover:bg-amber-500
            active:bg-amber-700
            text-white font-semibold text-sm
            rounded-lg
            transition-colors duration-150
            shadow-md hover:shadow-lg
            cursor-pointer
          "
        >
          New Session
        </button>
      ) : (
        // Session continues — deal the next hand.
        <button
          id="next-hand-btn"
          onClick={onNextHand}
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
          Next Hand
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SUB-COMPONENT: OPPONENT ACTION BADGE
// ═══════════════════════════════════════════════════════════════

interface OpponentActionBadgeProps {
  /** The opponent's most recent action. */
  action: "fold" | "call" | "raise";
}

/**
 * A small pill badge that shows the opponent's last action.
 * Appears just below the opponent's cards after every phase they act.
 *
 * Color scheme:
 *   fold  → red/danger
 *   call  → slate/neutral
 *   raise → amber/warning
 */
function OpponentActionBadge({ action }: OpponentActionBadgeProps) {
  const colorClass: string =
    action === "fold"
      ? "bg-red-600/80 border-red-500/40 text-red-100"
      : action === "raise"
        ? "bg-amber-600/80 border-amber-500/40 text-amber-100"
        : "bg-slate-600/80 border-slate-500/40 text-slate-200";

  const label: string =
    action === "fold" ? "Folds" : action === "raise" ? "Raises" : "Calls";

  return (
    <div
      className={`
        inline-flex items-center gap-1.5
        px-3 py-1
        rounded-full
        border
        text-xs font-semibold
        animate-card-in
        ${colorClass}
      `}
    >
      <span>{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SUB-COMPONENT: BLIND ROLE BADGE
// ═══════════════════════════════════════════════════════════════

interface BlindRoleBadgeProps {
  /** The blind role for this seat — either the small blind or big blind. */
  role: "SB" | "BB";
}

/**
 * A small pill badge that shows whether a seat is the small blind (SB)
 * or the big blind (BB) this hand. Intentionally lighter than the dealer
 * button badge — the button is the newer concept worth emphasizing.
 *
 * Color scheme:
 *   SB → sky-600   (smaller obligation; acts first preflop in heads-up)
 *   BB → violet-600 (larger obligation; acts last preflop in heads-up)
 */
function BlindRoleBadge({ role }: BlindRoleBadgeProps) {
  const colorClass: string =
    role === "SB"
      ? "bg-sky-600/80 border border-sky-500/40 text-sky-100"
      : "bg-violet-600/80 border border-violet-500/40 text-violet-100";

  return (
    <span
      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${colorClass}`}
    >
      {role}
    </span>
  );
}
