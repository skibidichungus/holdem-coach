"use client";

import type { HandStrength } from "../lib/types";

interface CoachPanelProps {
  /** The tutorial message to display to the player. */
  message: string;
  /** Current hand strength — drives the visual meter. */
  handStrength: HandStrength;
  /** Draw detection message (flush draw, OESD, etc.), or null if none. */
  drawMessage: string | null;
}

// Map each level to a Tailwind background color for the strength bar fill.
const LEVEL_BAR_COLOR: Record<HandStrength["level"], string> = {
  "Nothing Yet": "bg-gray-500",
  Weak: "bg-red-500",
  Decent: "bg-yellow-400",
  Strong: "bg-emerald-400",
  Monster: "bg-emerald-500",
  Nuts: "bg-green-400",
};

/**
 * A persistent panel that displays the tutorial coach's message,
 * a hand strength meter, and (when present) a draw detection callout.
 *
 * Styled as a speech-bubble / coach card — always visible so the
 * player can reference the guidance at any time. Sits below the
 * main table area.
 */
export default function CoachPanel({
  message,
  handStrength,
  drawMessage,
}: CoachPanelProps) {
  // Don't render anything until the first hand is dealt.
  if (!message) {
    return <></>;
  }

  const barColor: string = LEVEL_BAR_COLOR[handStrength.level];

  return (
    <div
      className="
        relative
        bg-emerald-900/80 backdrop-blur-sm
        border border-emerald-600/40
        rounded-xl
        px-5 py-4
        max-w-xl
        shadow-lg
        space-y-4
      "
    >
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-emerald-300">C</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
          Coach
        </span>
      </div>

      <p className="text-sm leading-relaxed text-emerald-50">
        {message}
      </p>

      {/* ── Hand Strength Meter ── */}
      {/*
        Renders a horizontal bar that fills left-to-right based on the
        percentage value, changing colour from red (weak) to green (strong).
      */}
      <div className="space-y-1.5">
      {/* Label row: level name on the right */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
            Hand Strength
          </span>
          <span className="text-xs font-semibold text-white">
            {handStrength.level}
          </span>
        </div>

        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          {/* Animated fill bar */}
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
            style={{ width: `${handStrength.percentage}%` }}
          />
        </div>
      </div>

      {/* ── Draw Detection Callout ── */}
      {/*
        Only rendered when a draw is detected (flush draw, straight draw, etc.).
        Uses a slightly different visual style to distinguish it from the
        main coach message.
      */}
      {drawMessage !== null && (
        <div
          className="
            flex items-start gap-2
            bg-amber-900/40
            border border-amber-600/30
            rounded-lg
            px-3 py-2.5
          "
        >
          <span className="text-amber-400 text-sm font-bold mt-0.5">!</span>
          <p className="text-xs leading-relaxed text-amber-200">
            {drawMessage}
          </p>
        </div>
      )}

      {/* ── Speech-bubble tail (decorative) ── */}
      {/* A small CSS triangle pointing upward, connecting the panel to the table */}
      <div
        className="
          absolute -top-2 left-8
          w-4 h-4
          bg-emerald-900/80
          border-l border-t border-emerald-600/40
          rotate-45
        "
      />
    </div>
  );
}
