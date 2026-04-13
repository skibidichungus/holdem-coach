"use client";

import type { GamePhase } from "../lib/types";

// ─── Props ──────────────────────────────────────────────────
interface PhaseBannerProps {
  /** The current game phase (preflop, flop, turn, river, showdown). */
  phase: GamePhase;
  /** The total chips in the pot. */
  pot: number;
}

// ─── Phase Display Map ──────────────────────────────────────
// Maps internal phase names to user-friendly labels.
const PHASE_LABELS: Record<GamePhase, string> = {
  preflop: "Pre-Flop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  showdown: "Showdown",
};

// ─── Component ──────────────────────────────────────────────
/**
 * A small banner showing the current phase name and the pot size.
 *
 * Sits above the community cards area in the center of the table.
 * Uses the gold accent colour for the pot amount to draw attention.
 */
export default function PhaseBanner({
  phase,
  pot,
}: PhaseBannerProps): JSX.Element {
  const phaseLabel: string = PHASE_LABELS[phase];

  return (
    <div
      className="
        inline-flex items-center gap-4
        bg-black/30 backdrop-blur-sm
        border border-white/10
        rounded-full
        px-5 py-2
        text-sm font-medium
        select-none
      "
    >
      {/* Phase name */}
      <span className="uppercase tracking-wider text-emerald-200">
        {phaseLabel}
      </span>

      {/* Divider dot */}
      <span className="w-1 h-1 rounded-full bg-white/30" />

      {/* Pot amount with gold accent */}
      <span style={{ color: "var(--gold-accent)" }}>
        Pot: {pot} chips
      </span>
    </div>
  );
}
