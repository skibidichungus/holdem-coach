// ═══════════════════════════════════════════════════════════════
//  BLIND STRUCTURE CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** The small blind doubles every this many hands. */
export const HANDS_PER_BLIND_LEVEL: number = 5;

/** The small blind at the start of a session. The big blind is always 2× this. */
export const STARTING_SMALL_BLIND: number = 10;

// ═══════════════════════════════════════════════════════════════
//  BLIND ESCALATION HELPER
// ═══════════════════════════════════════════════════════════════

/**
 * Returns the small blind amount for the given hand number within a session.
 *
 * The blind level advances every `HANDS_PER_BLIND_LEVEL` hands, doubling the
 * small blind each time:
 *
 * | Hands      | Level | Small blind |
 * |------------|-------|-------------|
 * | 1–5        | 0     | 10          |
 * | 6–10       | 1     | 20          |
 * | 11–15      | 2     | 40          |
 * | 16–20      | 3     | 80          |
 *
 * @param handNumber - The 1-indexed hand number within the session.
 * @returns The small blind amount for that hand.
 */
export function getSmallBlindForHand(handNumber: number): number {
  const level: number = Math.floor((handNumber - 1) / HANDS_PER_BLIND_LEVEL);
  return STARTING_SMALL_BLIND * Math.pow(2, level);
}
