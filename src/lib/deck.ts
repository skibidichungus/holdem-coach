import type { Card, Rank, Suit } from "./types";

// ─── Constants ───────────────────────────────────────────────

// Every suit in a standard deck — used to generate all 52 cards.
const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];

// Every rank from 2 through Ace (14) — used alongside SUITS to build the deck.
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

// ─── createDeck ──────────────────────────────────────────────

/**
 * Creates and returns a fresh, unshuffled 52-card deck.
 *
 * Each suit is paired with every rank, producing all 52 unique cards.
 * The deck is returned in a predictable order (hearts first, then
 * diamonds, clubs, spades — each from 2 through Ace).
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];

  // Loop through every suit…
  for (const suit of SUITS) {
    // …and pair it with every rank to create one card each.
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }

  return deck; // 4 suits × 13 ranks = 52 cards
}

// ─── shuffleDeck ─────────────────────────────────────────────

/**
 * Returns a randomly shuffled copy of the given deck.
 *
 * Uses the Fisher-Yates (Knuth) algorithm — the gold-standard
 * approach for an unbiased shuffle. The original array is never
 * mutated so callers can safely reuse it.
 *
 * How it works:
 *   Start at the last card and walk backward. At each position,
 *   pick a random card from the remaining unshuffled portion
 *   (index 0 through i) and swap it into place.
 */
export function shuffleDeck(deck: Card[]): Card[] {
  // Spread into a new array so we don't modify the original deck.
  const shuffled: Card[] = [...deck];

  // Walk backward from the last index to 1.
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Pick a random index from 0 to i (inclusive).
    const randomIndex: number = Math.floor(Math.random() * (i + 1));

    // Swap the card at position i with the card at the random index.
    // This uses array destructuring — a clean, modern way to swap two values.
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled;
}

// ─── dealCards ────────────────────────────────────────────────

/**
 * Deals `count` cards off the top of the deck.
 *
 * Returns an object with two arrays:
 *   • dealt     — the cards that were drawn
 *   • remaining — everything left in the deck
 *
 * Neither the original deck array nor its cards are mutated,
 * making this safe to call at any point without side effects.
 */
export function dealCards(
  deck: Card[],
  count: number
): { dealt: Card[]; remaining: Card[] } {
  // slice(0, count) grabs the first `count` cards (the "top" of the deck).
  const dealt: Card[] = deck.slice(0, count);

  // slice(count) grabs everything after the dealt cards.
  const remaining: Card[] = deck.slice(count);

  return { dealt, remaining };
}
