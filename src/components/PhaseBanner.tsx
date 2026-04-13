"use client";

import type { GamePhase } from "../lib/types";

// ─── Props ──────────────────────────────────────────────────
interface PhaseBannerProps {
  /** The current game phase (preflop, flop, turn, river, showdown). */
  phase: GamePhase;
  /** The total chips in the pot. */
  pot: number;
}

// ─── Phase Order ────────────────────────────────────────────
// All five phases in the order they occur during a hand.
// The index in this array determines "how far along" we are.
const PHASES: GamePhase[] = ["preflop", "flop", "turn", "river", "showdown"];

// Human-readable label for each phase, shown below each step dot.
const PHASE_LABELS: Record<GamePhase, string> = {
  preflop: "Pre-Flop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  showdown: "Showdown",
};

// ─── Component ──────────────────────────────────────────────
/**
 * A horizontal phase stepper that shows all five stages of a Texas Hold'em
 * hand, with visual feedback for completed, current, and upcoming phases.
 *
 * Layout (each step):
 *   [dot] — line — [dot] — line — [dot] ...
 *    Label         Label         Label
 *
 * The pot amount is displayed centred below the stepper.
 */
export default function PhaseBanner({
  phase,
  pot,
}: PhaseBannerProps): JSX.Element {
  // Find the index of the current phase so we can compare against it.
  const currentIndex: number = PHASES.indexOf(phase);

  return (
    <div className="flex flex-col items-center gap-2 select-none">

      {/* ── STEPPER ROW ── */}
      <div className="flex items-center">
        {PHASES.map((p: GamePhase, i: number) => {
          // Classify each step relative to the current phase.
          const isDone: boolean = i < currentIndex;    // already passed
          const isCurrent: boolean = i === currentIndex; // happening now
          // Future phases are neither done nor current.

          return (
            <div key={p} className="flex items-center">

              {/* ── STEP NODE ── */}
              <div className="flex flex-col items-center gap-1">

                {/* Dot / circle for this step */}
                <div
                  className={`
                    w-3 h-3 rounded-full
                    transition-all duration-300
                    ${isCurrent
                      ? "bg-emerald-400 ring-2 ring-emerald-400/40 ring-offset-1 ring-offset-transparent scale-125"
                      : isDone
                        ? "bg-emerald-600"           // completed — solid but dimmer
                        : "bg-white/15"              // upcoming — faded
                    }
                  `}
                >
                  {/* Checkmark inside completed dots (rendered as a tiny ✓) */}
                  {isDone && (
                    <span className="flex items-center justify-center w-full h-full text-[6px] font-bold text-emerald-200">
                      ✓
                    </span>
                  )}
                </div>

                {/* Phase label below the dot */}
                <span
                  className={`
                    text-[10px] font-medium whitespace-nowrap
                    transition-colors duration-300
                    ${isCurrent
                      ? "text-emerald-300 font-semibold"  // current — bright
                      : isDone
                        ? "text-emerald-600"               // done — muted green
                        : "text-white/25"                  // upcoming — very faint
                    }
                  `}
                >
                  {PHASE_LABELS[p]}
                </span>
              </div>

              {/* ── CONNECTOR LINE between steps (not after the last one) ── */}
              {i < PHASES.length - 1 && (
                <div className="relative w-10 h-[2px] mx-1 mb-4 rounded-full bg-white/10">
                  {/* Filled portion of the connector — covers completed segments */}
                  <div
                    className={`
                      absolute inset-0 rounded-full
                      bg-emerald-600
                      transition-all duration-500
                      ${
                        // Fill fully if this segment is behind the current phase,
                        // half-fill if it leads INTO the current phase, else empty.
                        i < currentIndex - 1
                          ? "w-full"
                          : i === currentIndex - 1
                            ? "w-full"   // the segment just before current is complete
                            : "w-0"
                      }
                    `}
                  />
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* ── POT DISPLAY ── */}
      {/* Centred below the stepper, using the gold accent colour. */}
      <div
        className="
          text-xs font-semibold tracking-wide
          px-3 py-0.5
          bg-black/20 rounded-full
          border border-white/10
        "
        style={{ color: "var(--gold-accent)" }}
      >
        Pot: {pot} chips
      </div>

    </div>
  );
}
