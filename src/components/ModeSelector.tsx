"use client";

import type { GameMode } from "../lib/types";
import { usePokerStore } from "../store/usePokerStore";

interface ModeOption {
  value: GameMode;
  label: string;
  subtitle: string;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    value: "guided",
    label: "Guided",
    subtitle: "Step-by-step with coaching",
  },
  {
    value: "quick",
    label: "Quick Play",
    subtitle: "No pauses, play at your pace",
  },
];

/**
 * A two-segment control that switches the game between "guided"
 * and "quick" modes. Restarts the hand on switch so the change
 * takes effect without a stale half-guided state.
 */
export default function ModeSelector() {
  const mode: GameMode = usePokerStore((state) => state.mode);
  const setMode = usePokerStore((state) => state.setMode);

  return (
    <div className="flex flex-col items-center gap-1.5">

      {/* ── Label above the segmented control ── */}
      <span className="text-xs font-medium uppercase tracking-wider text-emerald-400/70">
        Game Mode
      </span>

      {/* ── Segmented control container ── */}
      {/*
        A pill-shaped container with a dark background.
        Each segment sits inside as a button with conditional styling.
      */}
      <div
        className="
          flex
          bg-black/30
          border border-white/10
          rounded-full
          p-1
          gap-1
        "
      >
        {MODE_OPTIONS.map((option: ModeOption) => {
          // Is this the currently active mode?
          const isActive: boolean = mode === option.value;

          // Active segment: filled emerald (guided) or filled amber (quick).
          // Inactive segment: transparent with muted text.
          const activeClass: string =
            option.value === "guided"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-amber-600 text-white shadow-sm";

          const inactiveClass: string =
            "bg-transparent text-white/40 hover:text-white/70";

          return (
            <button
              key={option.value}
              id={`mode-${option.value}`}
              onClick={() => setMode(option.value)}
              // Don't trigger a re-click if we're already on this mode.
              disabled={isActive}
              className={`
                flex flex-col items-center
                px-5 py-1.5
                rounded-full
                transition-all duration-200
                cursor-pointer
                disabled:cursor-default
                ${isActive ? activeClass : inactiveClass}
              `}
            >
              <span className="text-sm font-semibold leading-tight whitespace-nowrap">
                {option.label}
              </span>

              <span
                className={`
                  text-[10px] leading-tight whitespace-nowrap
                  ${isActive ? "text-white/70" : "text-white/30"}
                `}
              >
                {option.subtitle}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
