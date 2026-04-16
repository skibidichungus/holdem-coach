"use client";

import { useState } from "react";
import { usePokerStore } from "../store/usePokerStore";
import { evaluateHand } from "../lib/handEvaluator";
import { HandRank } from "../lib/types";
import type { Card } from "../lib/types";
import CardView from "./CardView";

// ═══════════════════════════════════════════════════════════════
//  HAND BREAKDOWN PANEL
// ═══════════════════════════════════════════════════════════════

/**
 * A supplemental reading aid that shows the player's current best 5-card hand
 * as actual card visuals, with a plain-English label and optional draw commentary.
 *
 * Hidden entirely preflop (the hole cards rendered below the table are sufficient).
 * Post-flop the panel is collapsible: expanded by default, but the user can click
 * the header to collapse it to a single summary row.
 *
 * Collapse state is ephemeral — it does NOT persist across refreshes.
 */
export function HandBreakdownPanel() {
  // ── Local collapse state — default open so beginners see the full breakdown ──
  const [expanded, setExpanded] = useState(true);

  // ── Pull state from the store ──
  const player = usePokerStore((state) => state.player);
  const communityCards: Card[] = usePokerStore((state) => state.communityCards);
  const drawDetails = usePokerStore((state) => state.tutorial.drawDetails);

  // Hidden preflop and before cards are dealt.
  // The hole cards rendered directly below the table are sufficient preflop.
  if (player.hand.length < 2 || communityCards.length === 0) return null;

  // ── Evaluate the best 5-card hand ──
  const evaluated = evaluateHand(player.hand, communityCards);
  const bestCards: Card[] = evaluated.cards;

  // ── Build the supplemental commentary line ──
  let commentary: string | null = null;
  if (drawDetails !== null) {
    commentary = `Drawing to: ${drawDetails.label}. You need ${drawDetails.outsDescription} (~${drawDetails.equity}% by the river).`;
  } else if (evaluated.rank === HandRank.HighCard) {
    commentary = "Only a high card — you'll need to improve to win most showdowns.";
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/60 w-full overflow-hidden">

      {/* ── Toggle header ── */}
      {/*
        Full-width button that serves as both the title and the collapse toggle.
        Keeps the hand label visible even when collapsed so the user always has
        information scent without the full card-visual weight.
      */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between text-left px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700/40 transition-colors rounded-t"
        aria-expanded={expanded}
        aria-controls="hand-breakdown-body"
      >
        <span className="flex items-center gap-2">
          <span className="text-slate-400 text-xs uppercase tracking-wide">
            Your best hand
          </span>
          <span className="font-semibold">{evaluated.label}</span>
        </span>
        {/* Plain-text chevron — aria-hidden so screen readers use aria-expanded instead */}
        <span className="text-slate-400 text-xs" aria-hidden="true">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {/* ── Expanded body: card row + optional commentary ── */}
      {expanded && (
        <div id="hand-breakdown-body" className="px-3 pb-3 pt-1 space-y-2">
          <div className="flex gap-1.5 flex-wrap justify-center">
            {bestCards.map((card: Card, i: number) => (
              <CardView key={`breakdown-best-${i}`} card={card} faceDown={false} />
            ))}
          </div>
          {commentary !== null && (
            <p className="text-xs text-slate-400 text-center max-w-xs mx-auto leading-relaxed">
              {commentary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
