import type { Card } from "./types";
import { HandRank } from "./types";

// ═══════════════════════════════════════════════════════════════
//  HAND EXAMPLES DATA
// ═══════════════════════════════════════════════════════════════

/**
 * A single entry in the hand rankings reference guide.
 *
 * Each entry contains a canonical example hand that clearly illustrates
 * the hand type — chosen for visual clarity over edge-case coverage.
 */
export interface HandExample {
  /** The HandRank enum value for this hand type. */
  rank: HandRank;
  /** Display name shown in the guide, e.g. "Royal Flush". */
  name: string;
  /** One-sentence beginner-friendly explanation of what makes this hand. */
  description: string;
  /** Exactly 5 Card objects that form a clear example of this hand type. */
  cards: Card[];
}

/**
 * All 10 poker hand types with example hands, ordered from strongest (#1)
 * to weakest (#10).
 *
 * Cards use numeric ranks: 2–10 are face value, 11 = Jack, 12 = Queen,
 * 13 = King, 14 = Ace. Suits are "hearts" | "diamonds" | "clubs" | "spades".
 *
 * @example
 * HAND_EXAMPLES[0].name // → "Royal Flush"
 * HAND_EXAMPLES[9].name // → "High Card"
 */
export const HAND_EXAMPLES: HandExample[] = [
  // ── #1: Royal Flush ──────────────────────────────────────────
  // A-K-Q-J-10 all in the same suit — the best hand in poker.
  {
    rank: HandRank.RoyalFlush,
    name: "Royal Flush",
    description: "The best possible hand — A-K-Q-J-10 all in the same suit.",
    cards: [
      { suit: "spades", rank: 14 }, // A♠
      { suit: "spades", rank: 13 }, // K♠
      { suit: "spades", rank: 12 }, // Q♠
      { suit: "spades", rank: 11 }, // J♠
      { suit: "spades", rank: 10 }, // 10♠
    ],
  },

  // ── #2: Straight Flush ───────────────────────────────────────
  // Five cards in sequential order, all the same suit.
  {
    rank: HandRank.StraightFlush,
    name: "Straight Flush",
    description: "Five cards in a row, all the same suit.",
    cards: [
      { suit: "hearts", rank: 9 }, // 9♥
      { suit: "hearts", rank: 8 }, // 8♥
      { suit: "hearts", rank: 7 }, // 7♥
      { suit: "hearts", rank: 6 }, // 6♥
      { suit: "hearts", rank: 5 }, // 5♥
    ],
  },

  // ── #3: Four of a Kind ───────────────────────────────────────
  // Four cards of the same rank, plus any fifth card.
  {
    rank: HandRank.FourOfAKind,
    name: "Four of a Kind",
    description: "Four cards of the same rank.",
    cards: [
      { suit: "clubs",   rank: 13 }, // K♣
      { suit: "diamonds",rank: 13 }, // K♦
      { suit: "hearts",  rank: 13 }, // K♥
      { suit: "spades",  rank: 13 }, // K♠
      { suit: "diamonds",rank: 7  }, // 7♦
    ],
  },

  // ── #4: Full House ───────────────────────────────────────────
  // Three of a kind combined with a pair.
  {
    rank: HandRank.FullHouse,
    name: "Full House",
    description: "Three of a kind plus a pair.",
    cards: [
      { suit: "hearts",  rank: 12 }, // Q♥
      { suit: "spades",  rank: 12 }, // Q♠
      { suit: "diamonds",rank: 12 }, // Q♦
      { suit: "clubs",   rank: 8  }, // 8♣
      { suit: "spades",  rank: 8  }, // 8♠
    ],
  },

  // ── #5: Flush ────────────────────────────────────────────────
  // Five cards of the same suit, non-sequential.
  {
    rank: HandRank.Flush,
    name: "Flush",
    description: "Five cards of the same suit, any order.",
    cards: [
      { suit: "diamonds", rank: 14 }, // A♦
      { suit: "diamonds", rank: 11 }, // J♦
      { suit: "diamonds", rank: 9  }, // 9♦
      { suit: "diamonds", rank: 6  }, // 6♦
      { suit: "diamonds", rank: 3  }, // 3♦
    ],
  },

  // ── #6: Straight ─────────────────────────────────────────────
  // Five cards in sequential order, mixed suits.
  {
    rank: HandRank.Straight,
    name: "Straight",
    description: "Five cards in sequential order, mixed suits.",
    cards: [
      { suit: "clubs",   rank: 10 }, // 10♣
      { suit: "diamonds",rank: 9  }, // 9♦
      { suit: "spades",  rank: 8  }, // 8♠
      { suit: "hearts",  rank: 7  }, // 7♥
      { suit: "clubs",   rank: 6  }, // 6♣
    ],
  },

  // ── #7: Three of a Kind ──────────────────────────────────────
  // Three cards of the same rank, two unrelated kickers.
  {
    rank: HandRank.ThreeOfAKind,
    name: "Three of a Kind",
    description: "Three cards of the same rank.",
    cards: [
      { suit: "spades",  rank: 7  }, // 7♠
      { suit: "hearts",  rank: 7  }, // 7♥
      { suit: "diamonds",rank: 7  }, // 7♦
      { suit: "clubs",   rank: 13 }, // K♣
      { suit: "spades",  rank: 2  }, // 2♠
    ],
  },

  // ── #8: Two Pair ─────────────────────────────────────────────
  // Two separate pairs plus a kicker card.
  {
    rank: HandRank.TwoPair,
    name: "Two Pair",
    description: "Two different pairs in one hand.",
    cards: [
      { suit: "clubs",   rank: 11 }, // J♣
      { suit: "spades",  rank: 11 }, // J♠
      { suit: "hearts",  rank: 4  }, // 4♥
      { suit: "diamonds",rank: 4  }, // 4♦
      { suit: "spades",  rank: 14 }, // A♠
    ],
  },

  // ── #9: One Pair ─────────────────────────────────────────────
  // Two cards of the same rank, three unrelated kickers.
  {
    rank: HandRank.OnePair,
    name: "One Pair",
    description: "Two cards of the same rank.",
    cards: [
      { suit: "hearts",  rank: 10 }, // 10♥
      { suit: "diamonds",rank: 10 }, // 10♦
      { suit: "clubs",   rank: 14 }, // A♣
      { suit: "spades",  rank: 8  }, // 8♠
      { suit: "hearts",  rank: 5  }, // 5♥
    ],
  },

  // ── #10: High Card ───────────────────────────────────────────
  // No matching cards — the highest card in the hand plays.
  {
    rank: HandRank.HighCard,
    name: "High Card",
    description: "No matching cards — highest card plays.",
    cards: [
      { suit: "hearts",  rank: 14 }, // A♥
      { suit: "clubs",   rank: 11 }, // J♣
      { suit: "diamonds",rank: 8  }, // 8♦
      { suit: "spades",  rank: 5  }, // 5♠
      { suit: "clubs",   rank: 2  }, // 2♣
    ],
  },
];
