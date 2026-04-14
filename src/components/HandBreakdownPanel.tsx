"use client";

import { usePokerStore } from "../store/usePokerStore";
import { evaluateHand } from "../lib/handEvaluator";
import { buildHoleCardsLabel } from "../lib/tutorial";
import { HandRank } from "../lib/types";
import type { Card } from "../lib/types";
import CardView from "./CardView";

// ═══════════════════════════════════════════════════════════════
//  HAND BREAKDOWN PANEL
// ═══════════════════════════════════════════════════════════════

/**
 * A supplemental reading aid that shows the player's current best 5-card hand
 * as actual card visuals, with a plain-English label and draw commentary.
 *
 * Visible from deal through showdown in both guided and quick modes.
 * Renders nothing before any cards have been dealt.
 */
export function HandBreakdownPanel() {
  // ── Pull state from the store ──
  const player = usePokerStore((state) => state.player);
  const communityCards: Card[] = usePokerStore((state) => state.communityCards);
  const phase = usePokerStore((state) => state.phase);
  const drawDetails = usePokerStore((state) => state.tutorial.drawDetails);

  // No cards dealt yet — render nothing.
  if (player.hand.length < 2) return null;

  // ── Preflop: show only the 2 hole cards with a starting-hand label ──
  if (phase === "preflop" || communityCards.length === 0) {
    const preflopLabel: string = buildHoleCardsLabel(player.hand);
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-800/60 px-4 py-3 flex flex-col items-center gap-2 w-full">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          Your starting hand
        </span>
        <div className="flex gap-2 flex-wrap justify-center">
          {player.hand.map((card: Card, i: number) => (
            <CardView key={`breakdown-hole-${i}`} card={card} faceDown={false} />
          ))}
        </div>
        <p className="text-sm font-semibold text-slate-200 text-center">
          {preflopLabel}
        </p>
      </div>
    );
  }

  // ── Post-flop: evaluate the best 5-card hand and show it ──
  const evaluated = evaluateHand(player.hand, communityCards);
  const bestCards: Card[] = evaluated.cards;

  // Build supplemental commentary line.
  let commentary: string | null = null;
  if (drawDetails !== null) {
    commentary = `Drawing to: ${drawDetails.label}. You need ${drawDetails.outsDescription} (~${drawDetails.equity}% by the river).`;
  } else if (evaluated.rank === HandRank.HighCard) {
    commentary = "Only a high card — you'll need to improve to win most showdowns.";
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/60 px-4 py-3 flex flex-col items-center gap-2 w-full">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        Your best hand right now
      </span>
      <div className="flex gap-1.5 flex-wrap justify-center">
        {bestCards.map((card: Card, i: number) => (
          <CardView key={`breakdown-best-${i}`} card={card} faceDown={false} />
        ))}
      </div>
      <p className="text-sm font-semibold text-slate-200 text-center">
        {evaluated.label}
      </p>
      {commentary !== null && (
        <p className="text-xs text-slate-400 text-center max-w-xs leading-relaxed">
          {commentary}
        </p>
      )}
    </div>
  );
}
