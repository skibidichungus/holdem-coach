"use client";

import { usePokerStore } from "../store/usePokerStore";
import type { PlayerAction } from "../lib/types";

// ─── Component ──────────────────────────────────────────────
/**
 * Three action buttons: Fold, Call, and Raise.
 *
 * - Disabled when `tutorial.awaitingContinue` is true (player must
 *   read the tutorial first) or when the phase is "showdown" (hand is over).
 * - If `tutorial.recommendedAction` matches a button, that button gets a
 *   subtle golden glow + "Suggested" badge to guide the beginner.
 * - Raise uses a fixed amount: double the current bet. This keeps things
 *   simple for beginners (no manual bet-sizing).
 */
export default function ActionButtons(): JSX.Element {
  // ── Pull state and actions from the store ──
  const phase = usePokerStore((state) => state.phase);
  const currentBet: number = usePokerStore((state) => state.currentBet);
  const tutorial = usePokerStore((state) => state.tutorial);
  const playerFold = usePokerStore((state) => state.playerFold);
  const playerCall = usePokerStore((state) => state.playerCall);
  const playerRaise = usePokerStore((state) => state.playerRaise);

  // Buttons are disabled when the tutorial is paused or the hand is over.
  const isDisabled: boolean =
    tutorial.awaitingContinue || phase === "showdown";

  // The recommended action (if any) — used to highlight the suggested button.
  const recommended: PlayerAction | null = tutorial.recommendedAction;

  // Fixed raise amount: double the current bet.
  // This keeps the UI simple — beginners don't need to choose a bet size.
  const raiseAmount: number = currentBet;

  /**
   * Checks if a given action matches the recommendation.
   * Used to apply the golden glow effect.
   */
  function isRecommended(action: PlayerAction): boolean {
    return recommended === action;
  }

  return (
    <div className="flex items-center gap-3">
      {/* ── FOLD Button ── */}
      <ActionButton
        label="Fold"
        id="action-fold"
        onClick={playerFold}
        disabled={isDisabled}
        recommended={isRecommended("fold")}
        variant="danger"
      />

      {/* ── CALL Button ── */}
      <ActionButton
        label={`Call (${currentBet})`}
        id="action-call"
        onClick={playerCall}
        disabled={isDisabled}
        recommended={isRecommended("call")}
        variant="neutral"
      />

      {/* ── RAISE Button ── */}
      <ActionButton
        label={`Raise (${currentBet + raiseAmount})`}
        id="action-raise"
        onClick={() => playerRaise(raiseAmount)}
        disabled={isDisabled}
        recommended={isRecommended("raise")}
        variant="primary"
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SUB-COMPONENT: SINGLE ACTION BUTTON
// ═══════════════════════════════════════════════════════════════

interface ActionButtonProps {
  /** The button label text. */
  label: string;
  /** Unique HTML id for testing / accessibility. */
  id: string;
  /** Click handler when the player presses this action. */
  onClick: () => void;
  /** Whether the button is disabled (during tutorial pause or showdown). */
  disabled: boolean;
  /** Whether this action is the one the coach recommends. */
  recommended: boolean;
  /** Visual style variant: danger (fold), neutral (call), primary (raise). */
  variant: "danger" | "neutral" | "primary";
}

/**
 * A single action button with optional "Suggested" badge and glow effect.
 */
function ActionButton({
  label,
  id,
  onClick,
  disabled,
  recommended,
  variant,
}: ActionButtonProps): JSX.Element {
  // Choose base colours based on the variant.
  const variantClasses: Record<string, string> = {
    danger:
      "bg-red-700/80 hover:bg-red-600 active:bg-red-800 border-red-500/40",
    neutral:
      "bg-slate-600/80 hover:bg-slate-500 active:bg-slate-700 border-slate-400/40",
    primary:
      "bg-amber-600/80 hover:bg-amber-500 active:bg-amber-700 border-amber-400/40",
  };

  return (
    <div className="relative">
      <button
        id={id}
        onClick={onClick}
        disabled={disabled}
        className={`
          px-5 py-2.5
          rounded-lg
          border
          font-semibold text-sm
          text-white
          transition-all duration-150
          shadow-md
          cursor-pointer
          ${variantClasses[variant]}
          ${recommended ? "animate-glow-pulse ring-2 ring-amber-400/60" : ""}
          ${disabled ? "opacity-40 cursor-not-allowed !shadow-none" : "hover:shadow-lg hover:-translate-y-0.5"}
        `}
      >
        {label}
      </button>

      {/* "Suggested" badge — appears above the button when this action is recommended */}
      {recommended && !disabled && (
        <span
          className="
            absolute -top-2.5 left-1/2 -translate-x-1/2
            bg-amber-500 text-amber-950
            text-[10px] font-bold uppercase tracking-wide
            px-2 py-0.5
            rounded-full
            shadow-sm
            whitespace-nowrap
          "
        >
          Suggested
        </span>
      )}
    </div>
  );
}
