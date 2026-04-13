import type { Card, Rank, EvaluatedHand } from "./types";
import { HandRank } from "./types";
import { RANK_NAMES, RANK_NAMES_PLURAL } from "./constants";

// ── Scoring base ────────────────────────────────────────────
//
// We encode every hand as a single number so any two hands can be
// compared with a simple subtraction (a.score - b.score).
//
// Formula:
//   score = handRank × BASE⁵  +  k₁ × BASE⁴  +  k₂ × BASE³  + …
//
// BASE is 15 because the highest rank value is 14 (Ace).
// Using 15 guarantees that no combination of lower-order kickers
// can "overflow" into the next higher-order slot.
const KICKER_BASE: number = 15;

/**
 * Precomputed powers of KICKER_BASE for exponents 0–5.
 * Avoids calling Math.pow in the hot scoring path.
 *
 * KICKER_POWERS[5] = 15⁵ = 759375  (used for hand rank)
 * KICKER_POWERS[4] = 15⁴ = 50625   (used for first kicker)
 * …down to…
 * KICKER_POWERS[0] = 15⁰ = 1       (used for fifth kicker)
 */
const KICKER_POWERS: number[] = Array.from(
  { length: 6 },
  (_, i: number) => Math.pow(KICKER_BASE, i)
);

// ═══════════════════════════════════════════════════════════════
//  HELPER: NAMING
// ═══════════════════════════════════════════════════════════════

/**
 * Returns the singular name for a rank.
 * @example rankName(14) → "Ace"
 */
function rankName(rank: Rank): string {
  return RANK_NAMES[rank];
}

/**
 * Returns the plural name for a rank.
 * @example rankNamePlural(13) → "Kings"
 */
function rankNamePlural(rank: Rank): string {
  return RANK_NAMES_PLURAL[rank];
}

// ═══════════════════════════════════════════════════════════════
//  HELPER: SCORE COMPUTATION
// ═══════════════════════════════════════════════════════════════

/**
 * Builds a single composite number that fully represents a hand's strength.
 *
 * The `handRank` (1–10) occupies the highest-order position, and the
 * `kickers` array fills the remaining positions in descending importance.
 *
 * Two identical hands (same rank, same kickers) always produce the
 * exact same score, and a stronger hand always scores higher.
 *
 * @param handRank - The HandRank enum value (1 = High Card … 10 = Royal Flush).
 * @param kickers  - Up to 5 rank values, ordered from most to least significant.
 * @returns A single number encoding the full hand strength.
 *
 * @example
 * // Pair of Kings with A-9-4 kickers
 * computeScore(HandRank.OnePair, [13, 14, 9, 4])
 */
function computeScore(handRank: HandRank, kickers: number[]): number {
  let score: number = handRank * KICKER_POWERS[5];

  for (let i: number = 0; i < kickers.length; i++) {
    score += kickers[i] * KICKER_POWERS[4 - i];
  }

  return score;
}

// ═══════════════════════════════════════════════════════════════
//  HELPER: COMBINATION GENERATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Generates every possible combination of `size` cards from the `cards` array.
 *
 * In Texas Hold'em we always choose 5 cards from a pool of 5–7:
 *   - 5 cards (flop)  → C(5,5) =  1 combination
 *   - 6 cards (turn)  → C(6,5) =  6 combinations
 *   - 7 cards (river) → C(7,5) = 21 combinations
 *
 * Uses recursive backtracking:
 *   At each step, either include the current card or skip it,
 *   then move on to the next card. When we've chosen enough
 *   cards, we save that combination.
 *
 * @param cards - The full pool of available cards.
 * @param size  - How many cards to choose (always 5 for poker).
 * @returns An array of all possible `size`-length card arrays.
 */
function getCombinations(cards: Card[], size: number): Card[][] {
  const results: Card[][] = [];

  /**
   * Recursively builds combinations.
   *
   * @param startIndex - The index in `cards` to consider next.
   * @param current    - The cards we've chosen so far for this combination.
   */
  function backtrack(startIndex: number, current: Card[]): void {
    // Base case: we've chosen enough cards — save this combination.
    if (current.length === size) {
      // Spread into a new array so future mutations to `current` don't
      // affect the saved combination.
      results.push([...current]);
      return;
    }

    // Pruning: if there aren't enough cards left to fill the remaining
    // slots, there's no point continuing down this branch.
    const cardsRemaining: number = cards.length - startIndex;
    const slotsToFill: number = size - current.length;
    if (cardsRemaining < slotsToFill) {
      return;
    }

    for (let i: number = startIndex; i < cards.length; i++) {
      current.push(cards[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return results;
}

// ═══════════════════════════════════════════════════════════════
//  HELPER: RANK FREQUENCY MAP
// ═══════════════════════════════════════════════════════════════

/**
 * Counts how many times each rank appears in a set of cards.
 *
 * This is the workhorse behind detecting pairs, three-of-a-kind,
 * four-of-a-kind, and full houses.
 *
 * @param cards - The five cards to analyze.
 * @returns A Map where each key is a Rank and the value is how many
 *          cards of that rank are present.
 *
 * @example
 * // Given [K♠, K♥, 7♦, 7♣, 2♠]
 * getRankCounts(cards) → Map { 13 → 2, 7 → 2, 2 → 1 }
 */
function getRankCounts(cards: Card[]): Map<Rank, number> {
  const counts: Map<Rank, number> = new Map();

  for (const card of cards) {
    const currentCount: number = counts.get(card.rank) ?? 0;
    counts.set(card.rank, currentCount + 1);
  }

  return counts;
}

// ═══════════════════════════════════════════════════════════════
//  HELPER: FLUSH DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Checks whether all five cards share the same suit.
 *
 * @param cards - Exactly five cards to check.
 * @returns `true` if every card has the same suit, `false` otherwise.
 */
function isFlush(cards: Card[]): boolean {
  const targetSuit = cards[0].suit;

  for (const card of cards) {
    if (card.suit !== targetSuit) {
      return false;
    }
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════
//  HELPER: STRAIGHT DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Determines whether the five cards form a straight (five consecutive ranks).
 *
 * Returns the high card of the straight, or `null` if the cards aren't a straight.
 *
 * **Special case — the "wheel" (A-2-3-4-5):**
 * This is the lowest valid straight in poker. The Ace plays as a 1,
 * so the high card of the wheel is 5 (not 14).
 *
 * @param cards - Exactly five cards to check.
 * @returns The highest rank in the straight, or `null`.
 */
function getStraightHighCard(cards: Card[]): Rank | null {
  // 1. Collect the unique ranks present in the hand.
  //    We use a Set to discard duplicates (though a valid straight won't
  //    have any duplicates among 5 cards, this keeps the logic defensive).
  const uniqueRanks: number[] = [...new Set(cards.map((card) => card.rank))];

  // A straight needs exactly 5 distinct ranks. If there are duplicates,
  // it can't be a straight (e.g. a pair would give us only 4 unique ranks).
  if (uniqueRanks.length !== 5) {
    return null;
  }

  // Sort descending so the highest rank is first.
  uniqueRanks.sort((a: number, b: number) => b - a);

  // 2. Normal straight check:
  //    In a straight, the difference between the highest and lowest rank
  //    is exactly 4. Example: [10, 9, 8, 7, 6] → 10 − 6 = 4 ✓
  const highestRank: number = uniqueRanks[0];
  const lowestRank: number = uniqueRanks[4];

  if (highestRank - lowestRank === 4) {
    return highestRank as Rank;
  }

  // 3. Ace-low straight ("the wheel"): A-5-4-3-2
  //    Sorted descending this looks like [14, 5, 4, 3, 2].
  //    The normal check fails (14 − 2 = 12 ≠ 4), so we handle it explicitly.
  const isWheel: boolean =
    uniqueRanks[0] === 14 && // Ace
    uniqueRanks[1] === 5 &&
    uniqueRanks[2] === 4 &&
    uniqueRanks[3] === 3 &&
    uniqueRanks[4] === 2;

  if (isWheel) {
    // The Ace wraps around to play as a 1, so the high card is 5.
    return 5 as Rank;
  }

  // Not a straight.
  return null;
}

// ═══════════════════════════════════════════════════════════════
//  HELPER: LABEL BUILDER
// ═══════════════════════════════════════════════════════════════

/**
 * Creates a human-readable label describing a poker hand.
 *
 * @param handRank       - The detected HandRank (e.g. HandRank.OnePair).
 * @param primaryKickers - The most important ranks for this hand type,
 *                         used to fill in the label template.
 * @returns A string like "Pair of Kings" or "Ace-high Flush".
 *
 * @example
 * buildLabel(HandRank.FullHouse, [10, 6]) → "Tens full of Sixes"
 * buildLabel(HandRank.HighCard, [14])     → "Ace High"
 */
function buildLabel(handRank: HandRank, primaryKickers: Rank[]): string {
  switch (handRank) {
    case HandRank.RoyalFlush:
      return "Royal Flush";

    case HandRank.StraightFlush:
      return `${rankName(primaryKickers[0])}-high Straight Flush`;

    case HandRank.FourOfAKind:
      return `Four ${rankNamePlural(primaryKickers[0])}`;

    case HandRank.FullHouse:
      // "Tens full of Sixes" means three Tens and two Sixes.
      return `${rankNamePlural(primaryKickers[0])} full of ${rankNamePlural(primaryKickers[1])}`;

    case HandRank.Flush:
      return `${rankName(primaryKickers[0])}-high Flush`;

    case HandRank.Straight:
      return `${rankName(primaryKickers[0])}-high Straight`;

    case HandRank.ThreeOfAKind:
      return `Three ${rankNamePlural(primaryKickers[0])}`;

    case HandRank.TwoPair:
      // "Kings and Sevens" — the two pair ranks, high pair listed first.
      return `${rankNamePlural(primaryKickers[0])} and ${rankNamePlural(primaryKickers[1])}`;

    case HandRank.OnePair:
      return `Pair of ${rankNamePlural(primaryKickers[0])}`;

    case HandRank.HighCard:
      return `${rankName(primaryKickers[0])} High`;

    default:
      return "Unknown Hand";
  }
}

// ═══════════════════════════════════════════════════════════════
//  CORE: EVALUATE EXACTLY FIVE CARDS
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluates a single 5-card hand and returns its rank, score, and label.
 *
 * This is the core evaluation engine. The public `evaluateHand` function
 * calls this once per 5-card combination and keeps the best result.
 *
 * **Detection order:** We check from the strongest hand downward
 * (Royal Flush → … → High Card) and return immediately upon the first match.
 * This is correct because the categories are mutually exclusive at each level
 * (e.g. a hand can't be both a full house and a flush).
 *
 * @param cards - Exactly 5 cards to evaluate.
 * @returns An EvaluatedHand with the rank, a comparable score, and a label.
 */
function evaluateFiveCards(cards: Card[]): EvaluatedHand {
  // ── Step 1: Gather fundamental information about the hand ──

  const flush: boolean = isFlush(cards);
  const straightHighCard: Rank | null = getStraightHighCard(cards);
  const straight: boolean = straightHighCard !== null;
  const rankCounts: Map<Rank, number> = getRankCounts(cards);

  // Sort all five ranks descending — used for kicker comparison later.
  const sortedRanks: Rank[] = cards
    .map((card: Card) => card.rank)
    .sort((a: number, b: number) => b - a) as Rank[];

  // ── Step 2: Categorize ranks by their frequency ──
  //
  // Separate the ranks into groups based on how many cards share that rank.
  // For example, with [K, K, 7, 7, 2]:
  //   quads = [], trips = [], pairs = [13, 7], singles = [2]

  const quads: Rank[] = []; // Ranks that appear exactly 4 times
  const trips: Rank[] = []; // Ranks that appear exactly 3 times
  const pairs: Rank[] = []; // Ranks that appear exactly 2 times
  const singles: Rank[] = []; // Ranks that appear exactly 1 time

  for (const [rank, count] of rankCounts.entries()) {
    if (count === 4) {
      quads.push(rank);
    } else if (count === 3) {
      trips.push(rank);
    } else if (count === 2) {
      pairs.push(rank);
    } else {
      singles.push(rank);
    }
  }

  // Sort each group descending so the highest rank comes first.
  // This matters for tie-breaking (e.g. two pair: K-K-7-7 beats Q-Q-7-7).
  quads.sort((a: number, b: number) => b - a);
  trips.sort((a: number, b: number) => b - a);
  pairs.sort((a: number, b: number) => b - a);
  singles.sort((a: number, b: number) => b - a);

  // ── Step 3: Check hands from strongest to weakest ──

  // --- Royal Flush ---
  // A straight flush (same suit + consecutive ranks) with Ace high.
  // This is the best possible hand in poker.
  if (flush && straight && straightHighCard === 14) {
    return {
      rank: HandRank.RoyalFlush,
      score: computeScore(HandRank.RoyalFlush, [14]),
      label: buildLabel(HandRank.RoyalFlush, []),
    };
  }

  // --- Straight Flush ---
  // Five cards of the same suit in consecutive order.
  // The high card is the only kicker needed — all 5 cards are determined by it.
  if (flush && straight) {
    return {
      rank: HandRank.StraightFlush,
      score: computeScore(HandRank.StraightFlush, [straightHighCard!]),
      label: buildLabel(HandRank.StraightFlush, [straightHighCard!]),
    };
  }

  // --- Four of a Kind ---
  // Four cards of the same rank plus one kicker.
  if (quads.length === 1) {
    const quadRank: Rank = quads[0];
    const kicker: Rank = singles[0]; // The one card that isn't part of the quad.
    return {
      rank: HandRank.FourOfAKind,
      score: computeScore(HandRank.FourOfAKind, [quadRank, kicker]),
      label: buildLabel(HandRank.FourOfAKind, [quadRank]),
    };
  }

  // --- Full House ---
  // Three of a kind combined with a pair.
  // The trips rank is the primary kicker (e.g. "Kings full of Fives" beats
  // "Queens full of Aces" because K trips > Q trips).
  if (trips.length === 1 && pairs.length === 1) {
    const tripRank: Rank = trips[0];
    const pairRank: Rank = pairs[0];
    return {
      rank: HandRank.FullHouse,
      score: computeScore(HandRank.FullHouse, [tripRank, pairRank]),
      label: buildLabel(HandRank.FullHouse, [tripRank, pairRank]),
    };
  }

  // --- Flush ---
  // All five cards share the same suit but do NOT form a straight.
  // All five ranks matter for tie-breaking (e.g. A-K-9-7-3 flush beats
  // A-K-9-7-2 flush because the fifth kicker 3 > 2).
  if (flush) {
    return {
      rank: HandRank.Flush,
      score: computeScore(HandRank.Flush, sortedRanks),
      label: buildLabel(HandRank.Flush, [sortedRanks[0]]),
    };
  }

  // --- Straight ---
  // Five consecutive ranks, but NOT all the same suit.
  // Only the high card matters — no other kickers are possible.
  if (straight) {
    return {
      rank: HandRank.Straight,
      score: computeScore(HandRank.Straight, [straightHighCard!]),
      label: buildLabel(HandRank.Straight, [straightHighCard!]),
    };
  }

  // --- Three of a Kind ---
  // Three cards of the same rank; the other two are unrelated singles.
  // Kickers: trip rank first, then the two singles in descending order.
  if (trips.length === 1 && pairs.length === 0) {
    const tripRank: Rank = trips[0];
    return {
      rank: HandRank.ThreeOfAKind,
      score: computeScore(HandRank.ThreeOfAKind, [tripRank, ...singles]),
      label: buildLabel(HandRank.ThreeOfAKind, [tripRank]),
    };
  }

  // --- Two Pair ---
  // Two different pairs plus one kicker.
  // Kickers: high pair, low pair, then the single card.
  if (pairs.length === 2) {
    const highPair: Rank = pairs[0]; // Already sorted descending above.
    const lowPair: Rank = pairs[1];
    const kicker: Rank = singles[0];
    return {
      rank: HandRank.TwoPair,
      score: computeScore(HandRank.TwoPair, [highPair, lowPair, kicker]),
      label: buildLabel(HandRank.TwoPair, [highPair, lowPair]),
    };
  }

  // --- One Pair ---
  // Exactly one pair plus three kickers.
  // Kickers: pair rank first, then all three singles descending.
  if (pairs.length === 1) {
    const pairRank: Rank = pairs[0];
    return {
      rank: HandRank.OnePair,
      score: computeScore(HandRank.OnePair, [pairRank, ...singles]),
      label: buildLabel(HandRank.OnePair, [pairRank]),
    };
  }

  // --- High Card ---
  // No pairs, no straight, no flush — the hand is defined entirely
  // by its five individual card ranks in descending order.
  return {
    rank: HandRank.HighCard,
    score: computeScore(HandRank.HighCard, sortedRanks),
    label: buildLabel(HandRank.HighCard, [sortedRanks[0]]),
  };
}

// ═══════════════════════════════════════════════════════════════
//  EXPORTED: EVALUATE THE BEST HAND
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluates the best possible 5-card poker hand from a player's
 * hole cards combined with the community cards on the board.
 *
 * Works at every street:
 *   - **Flop** (2 hole + 3 community = 5 cards) → 1 possible hand
 *   - **Turn** (2 hole + 4 community = 6 cards) → 6 possible hands
 *   - **River / Showdown** (2 hole + 5 community = 7 cards) → 21 possible hands
 *
 * The function generates every valid 5-card combination, evaluates
 * each one, and returns the strongest hand found.
 *
 * @param holeCards      - The 2 private cards dealt to the player.
 * @param communityCards - The 3–5 shared community cards on the board.
 * @returns The strongest {@link EvaluatedHand} among all valid 5-card combinations.
 *
 * @example
 * const result = evaluateHand(
 *   [{ suit: "hearts", rank: 14 }, { suit: "hearts", rank: 13 }],
 *   [{ suit: "hearts", rank: 12 }, { suit: "hearts", rank: 11 }, { suit: "hearts", rank: 10 }]
 * );
 * // result.rank  → HandRank.RoyalFlush
 * // result.label → "Royal Flush"
 */
export function evaluateHand(
  holeCards: Card[],
  communityCards: Card[]
): EvaluatedHand {
  // Merge hole cards and community cards into a single pool.
  const allCards: Card[] = [...holeCards, ...communityCards];

  // Generate every possible way to pick 5 cards from the pool.
  const fiveCardCombos: Card[][] = getCombinations(allCards, 5);

  // Evaluate the first combination to establish a baseline.
  let bestHand: EvaluatedHand = evaluateFiveCards(fiveCardCombos[0]);

  // Evaluate all remaining combinations and keep the highest-scoring one.
  for (let i: number = 1; i < fiveCardCombos.length; i++) {
    const candidate: EvaluatedHand = evaluateFiveCards(fiveCardCombos[i]);

    // A higher score always means a stronger hand (by construction of computeScore).
    if (candidate.score > bestHand.score) {
      bestHand = candidate;
    }
  }

  return bestHand;
}

// ═══════════════════════════════════════════════════════════════
//  EXPORTED: HAND COMPARISON
// ═══════════════════════════════════════════════════════════════

/**
 * Compares two evaluated hands to determine a winner.
 *
 * Because `score` already encodes both the hand rank and all kickers,
 * a simple subtraction is all we need.
 *
 * @param a - The first evaluated hand.
 * @param b - The second evaluated hand.
 * @returns A **positive** number if hand `a` wins,
 *          a **negative** number if hand `b` wins,
 *          or **0** if the hands are tied.
 *
 * @example
 * const result = compareHands(handA, handB);
 * if (result > 0) console.log("Hand A wins!");
 * if (result < 0) console.log("Hand B wins!");
 * if (result === 0) console.log("It's a tie!");
 */
export function compareHands(a: EvaluatedHand, b: EvaluatedHand): number {
  return a.score - b.score;
}
