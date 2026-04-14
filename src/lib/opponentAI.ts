import type { Card, GamePhase, PlayerAction } from "./types";
import { evaluateHand } from "./handEvaluator";
import { HandRank } from "./types";

// ═══════════════════════════════════════════════════════════════
//  HELPER: PREFLOP HAND CLASSIFICATION (opponent-internal)
// ═══════════════════════════════════════════════════════════════

/**
 * Classifies the opponent's two-card starting hand into one of three
 * strength tiers. Kept private to this module so it stays decoupled
 * from the player-facing classification in tutorial.ts.
 *
 * Tiers:
 * - "strong" — pocket pair 10+, AK, AQ (suited or unsuited)
 * - "decent" — any other pocket pair, any two cards both 10+,
 *              suited connectors 9-10 or higher
 * - "weak"   — everything else
 *
 * @param holeCards - The opponent's two private cards.
 * @returns "strong", "decent", or "weak".
 */
function classifyOpponentStartingHand(
  holeCards: Card[]
): "strong" | "decent" | "weak" {
  const rank1: number = holeCards[0].rank;
  const rank2: number = holeCards[1].rank;
  const highRank: number = Math.max(rank1, rank2);
  const lowRank: number = Math.min(rank1, rank2);
  const isPair: boolean = rank1 === rank2;
  const isSuited: boolean = holeCards[0].suit === holeCards[1].suit;

  // --- Strong hands ---
  // Pocket pair of tens or higher (TT, JJ, QQ, KK, AA).
  if (isPair && highRank >= 10) {
    return "strong";
  }

  // Ace-King or Ace-Queen, any suits.
  if (highRank === 14 && lowRank >= 12) {
    return "strong";
  }

  // --- Decent hands ---
  // Any other pocket pair (22 through 99).
  if (isPair) {
    return "decent";
  }

  // Any two cards both ranked 10 or higher (e.g. KQ, KJ, QJ, KT, QT, JT).
  if (lowRank >= 10) {
    return "decent";
  }

  // Suited connectors 9-10 or higher (e.g. 9s-Ts, Ts-Js, Js-Qs, Qs-Ks).
  // "9-10 or higher" means both cards are 9 or above and they are consecutive.
  const isConnector: boolean = Math.abs(rank1 - rank2) === 1;
  if (isSuited && isConnector && lowRank >= 9) {
    return "decent";
  }

  // --- Weak hands ---
  return "weak";
}

// ═══════════════════════════════════════════════════════════════
//  HELPER: POST-FLOP HAND CLASSIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Classifies the opponent's best made hand (post-flop) into three tiers.
 *
 * - "strong" — trips or better (ThreeOfAKind and above)
 * - "medium" — two pair, or one pair with rank >= 10 (tens or better)
 * - "weak"   — high card, or one pair with rank <= 9
 *
 * @param holeCards      - The opponent's two private cards.
 * @param communityCards - The community cards on the board.
 * @returns "strong", "medium", or "weak".
 */
function classifyOpponentMadeHand(
  holeCards: Card[],
  communityCards: Card[]
): "strong" | "medium" | "weak" {
  const evaluated = evaluateHand(holeCards, communityCards);
  const rank: HandRank = evaluated.rank;

  // Strong made hand: three of a kind, straight, flush, full house, quads,
  // straight flush, or royal flush.
  if (rank >= HandRank.ThreeOfAKind) {
    return "strong";
  }

  // Two pair is a medium made hand.
  if (rank === HandRank.TwoPair) {
    return "medium";
  }

  // One pair is medium only when the pair rank is 10 or higher (tens or better).
  // To extract the pair rank we look for the card rank that appears twice.
  if (rank === HandRank.OnePair) {
    const rankCounts: Map<number, number> = new Map();
    for (const card of [...holeCards, ...communityCards]) {
      rankCounts.set(card.rank, (rankCounts.get(card.rank) ?? 0) + 1);
    }
    for (const [cardRank, count] of rankCounts.entries()) {
      if (count >= 2 && cardRank >= 10) {
        return "medium";
      }
    }
    // One pair, but the pair is nines or lower.
    return "weak";
  }

  // High card only.
  return "weak";
}

// ═══════════════════════════════════════════════════════════════
//  EXPORTED: OPPONENT ACTION DECISION
// ═══════════════════════════════════════════════════════════════

/**
 * Decides what the opponent should do in response to the player's action.
 *
 * Decision rules:
 *
 * **Preflop** (based on starting hand tier):
 * - Player raises: strong → raise, decent → call, weak → fold
 * - Player calls:  strong → raise, decent → call, weak → call (limp)
 *
 * **Post-flop** (based on evaluated made hand tier):
 * - Player raises: strong → raise, medium → call, weak → fold
 * - Player calls:  strong → raise, medium → call, weak → call
 *
 * @param phase             - The current game phase.
 * @param opponentHoleCards - The opponent's 2 private cards.
 * @param communityCards    - Shared cards (0–5).
 * @param playerAction      - What the player just did ("call" or "raise").
 * @returns "fold" | "call" | "raise"
 */
export function getOpponentAction(
  phase: GamePhase,
  opponentHoleCards: Card[],
  communityCards: Card[],
  playerAction: "call" | "raise"
): PlayerAction {
  // ── Preflop ───────────────────────────────────────────────────
  if (phase === "preflop") {
    const tier = classifyOpponentStartingHand(opponentHoleCards);

    if (playerAction === "raise") {
      if (tier === "strong") return "raise";
      if (tier === "decent") return "call";
      // weak — fold against aggression
      return "fold";
    }

    // playerAction === "call"
    if (tier === "strong") return "raise";
    // decent or weak — limp along when action is cheap
    return "call";
  }

  // ── Post-flop (flop, turn, river) ─────────────────────────────
  const tier = classifyOpponentMadeHand(opponentHoleCards, communityCards);

  if (playerAction === "raise") {
    if (tier === "strong") return "raise";
    if (tier === "medium") return "call";
    // weak — fold against aggression
    return "fold";
  }

  // playerAction === "call"
  if (tier === "strong") return "raise";
  // medium or weak — check/call; never fold when there's no bet to face
  return "call";
}
