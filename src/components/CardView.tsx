"use client";

import type { Card, Rank, Suit } from "../lib/types";

interface CardViewProps {
  /** The card data to render (suit + rank). */
  card: Card;
  /** If true, show the card back instead of the face. */
  faceDown?: boolean;
}

// Maps the numeric rank values to the symbols shown on a playing card.
const RANK_DISPLAY: Record<Rank, string> = {
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
};

// Maps suit names to their Unicode symbols.
const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

/**
 * Renders a single playing card.
 *
 * - When face-up: shows the rank and suit in the appropriate color
 *   (red for hearts/diamonds, black for clubs/spades) on a white card.
 * - When face-down: shows a decorative card-back pattern.
 *
 * Uses a clean, rounded-rectangle design that looks like an actual card.
 */
export default function CardView({
  card,
  faceDown = false,
}: CardViewProps) {
  // ── Face-down card ──
  if (faceDown) {
    return (
      <div
        className="
          w-[72px] h-[100px] rounded-lg
          border-2 border-slate-500/50
          shadow-md
          flex items-center justify-center
          animate-card-in
          relative overflow-hidden
        "
        style={{ backgroundColor: "var(--card-back)" }}
        aria-label="Face-down card"
      >
        {/* Decorative diamond pattern on the card back */}
        <div
          className="absolute inset-2 rounded border-2 opacity-30"
          style={{ borderColor: "var(--card-back-accent)" }}
        />
        <div
          className="absolute inset-3 rounded border opacity-20"
          style={{ borderColor: "var(--card-back-accent)" }}
        />
        <span className="text-xl opacity-40 text-blue-200">♠</span>
      </div>
    );
  }

  // ── Face-up card ──

  const isRed: boolean = card.suit === "hearts" || card.suit === "diamonds";
  const textColor: string = isRed ? "text-red-600" : "text-gray-900";

  const rankStr: string = RANK_DISPLAY[card.rank];
  const suitStr: string = SUIT_SYMBOL[card.suit];

  return (
    <div
      className={`
        w-[72px] h-[100px] rounded-lg
        bg-white
        border border-gray-300
        shadow-md
        flex flex-col justify-between
        p-1.5
        animate-card-in
        select-none
        ${textColor}
      `}
      aria-label={`${rankStr} of ${card.suit}`}
    >
      {/* ── Top-left corner: rank + suit ── */}
      <div className="flex flex-col items-start leading-none">
        <span className="text-sm font-bold">{rankStr}</span>
        <span className="text-xs">{suitStr}</span>
      </div>

      {/* ── Center: large suit symbol ── */}
      <div className="flex items-center justify-center flex-1">
        <span className="text-2xl">{suitStr}</span>
      </div>

      {/* ── Bottom-right corner: rank + suit (inverted) ── */}
      <div className="flex flex-col items-end leading-none rotate-180">
        <span className="text-sm font-bold">{rankStr}</span>
        <span className="text-xs">{suitStr}</span>
      </div>
    </div>
  );
}
