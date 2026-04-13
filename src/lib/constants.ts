// ═══════════════════════════════════════════════════════════════
//  SHARED CONSTANTS
// ═══════════════════════════════════════════════════════════════
//
// Centralized rank-name mappings used across the codebase.
// Previously duplicated in handEvaluator.ts and tutorial.ts —
// consolidated here as the single source of truth.

/**
 * Maps a numeric rank (2–14) to its singular human-readable name.
 *
 * Used for labels like "Ace-high Flush" or "King-high Straight",
 * and for building starting-hand descriptions like "Ace-King suited".
 */
export const RANK_NAMES: Record<number, string> = {
  2: "Two",
  3: "Three",
  4: "Four",
  5: "Five",
  6: "Six",
  7: "Seven",
  8: "Eight",
  9: "Nine",
  10: "Ten",
  11: "Jack",
  12: "Queen",
  13: "King",
  14: "Ace",
};

/**
 * Maps a numeric rank (2–14) to its plural human-readable name.
 *
 * Used for labels like "Pair of Kings" or "Three Jacks".
 */
export const RANK_NAMES_PLURAL: Record<number, string> = {
  2: "Twos",
  3: "Threes",
  4: "Fours",
  5: "Fives",
  6: "Sixes",
  7: "Sevens",
  8: "Eights",
  9: "Nines",
  10: "Tens",
  11: "Jacks",
  12: "Queens",
  13: "Kings",
  14: "Aces",
};
