"use client";

import CardView from "./CardView";
import { HAND_EXAMPLES } from "../lib/handExamples";
import type { HandExample } from "../lib/handExamples";

// ═══════════════════════════════════════════════════════════════
//  HAND RANKINGS PANEL
// ═══════════════════════════════════════════════════════════════

interface HandRankingsPanelProps {
  /** Whether the panel is currently visible. */
  isOpen: boolean;
  /** Callback to close the panel. */
  onClose: () => void;
}

/**
 * A slide-out drawer panel that lists all 10 poker hand types ranked
 * from strongest to weakest, each with a visual example using CardView.
 *
 * - Fixed position, slides in from the right edge of the viewport.
 * - Clicking the semi-transparent backdrop or the X button closes the panel.
 * - z-40 keeps it above the table but below the tutorial overlay (z-50).
 */
export default function HandRankingsPanel({
  isOpen,
  onClose,
}: HandRankingsPanelProps) {
  return (
    <>
      {/* ── Backdrop ── */}
      {/* Semi-transparent overlay behind the panel; clicking it closes the drawer. */}
      <div
        className={`
          fixed inset-0 z-40
          bg-black/30
          transition-opacity duration-300
          ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Slide-out Drawer ── */}
      <div
        role="dialog"
        aria-label="Hand Rankings Guide"
        aria-modal="true"
        className={`
          fixed top-0 right-0 z-40
          h-screen w-96 max-w-full
          bg-slate-900/95 backdrop-blur-md
          border-l border-slate-700
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* ── Panel Header ── */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-700 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">
              Hand Rankings
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Strongest to weakest</p>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close hand rankings panel"
            className="
              w-8 h-8 flex items-center justify-center
              rounded-full
              bg-slate-700/60 hover:bg-slate-600/60
              text-slate-300 hover:text-white
              text-sm font-bold
              transition-colors duration-150
              cursor-pointer
              shrink-0 ml-3
            "
          >
            X
          </button>
        </div>

        {/* ── Panel Body (scrollable) ── */}
        {/* Only render the 50 CardView components when the panel is open.
            When closed, the drawer is off-screen via translate-x-full anyway,
            so there's no reason to keep 50 card instances in the DOM. */}
        <div className="flex-1 overflow-y-auto">
          {isOpen && HAND_EXAMPLES.map((example: HandExample, index: number) => {
            // Rank number displayed as "#1" through "#10"
            const rankNumber: number = index + 1;

            // Tier-based color for the rank badge:
            //   #1–#3  → gold (top tier — very rare, very strong)
            //   #4–#7  → emerald (mid tier — solid made hands)
            //   #8–#10 → slate (low tier — common, weaker hands)
            const badgeColor: string =
              rankNumber <= 3
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : rankNumber <= 7
                  ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-slate-600/30 text-slate-400 border border-slate-500/30";

            return (
              <div
                key={example.rank}
                className="px-4 py-4 border-b border-slate-700/50 last:border-b-0"
              >
                {/* ── Row: rank badge + name + description ── */}
                <div className="flex items-center gap-3 mb-2">
                  {/* Rank circle badge */}
                  <span
                    className={`
                      inline-flex items-center justify-center
                      w-8 h-8 rounded-full
                      text-xs font-bold shrink-0
                      ${badgeColor}
                    `}
                  >
                    #{rankNumber}
                  </span>

                  {/* Name + description */}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white leading-tight">
                      {example.name}
                    </p>
                    <p className="text-xs text-slate-400 leading-snug mt-0.5">
                      {example.description}
                    </p>
                  </div>
                </div>

                {/* ── Example cards (scaled down) ── */}
                {/*
                  We scale the card row to 60% so the 5 cards fit comfortably
                  inside the 384px panel. transform-origin: top left prevents
                  the scaled content from being clipped on the right. The outer
                  div's height is set to 60px (100px card height × 0.6) so
                  the row doesn't leave a large gap below.
                */}
                <div style={{ height: "65px", overflow: "visible" }}>
                  <div
                    style={{
                      transform: "scale(0.6)",
                      transformOrigin: "top left",
                      display: "flex",
                      gap: "8px",
                    }}
                  >
                    {example.cards.map((card, cardIndex: number) => (
                      <CardView
                        key={`${example.rank}-card-${cardIndex}`}
                        card={card}
                        faceDown={false}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
