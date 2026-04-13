import type { Card, GamePhase, PlayerAction, Rank } from "./types";
import { HandRank } from "./types";
import { evaluateHand } from "./handEvaluator";

// ═══════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════

// Maps a numeric rank to its human-readable name.
// Used throughout this file for building feedback messages.
const RANK_NAMES: Record<number, string> = {
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

// Maps a HandRank enum value to a beginner-friendly label.
// These are simpler than the handEvaluator labels — no kickers, just the category.
const HAND_RANK_LABELS: Record<HandRank, string> = {
  [HandRank.HighCard]: "High Card",
  [HandRank.OnePair]: "One Pair",
  [HandRank.TwoPair]: "Two Pair",
  [HandRank.ThreeOfAKind]: "Three of a Kind",
  [HandRank.Straight]: "a Straight",
  [HandRank.Flush]: "a Flush",
  [HandRank.FullHouse]: "a Full House",
  [HandRank.FourOfAKind]: "Four of a Kind",
  [HandRank.StraightFlush]: "a Straight Flush",
  [HandRank.RoyalFlush]: "a Royal Flush",
};

// ═══════════════════════════════════════════════════════════════
//  HELPER: RANK NAMING
// ═══════════════════════════════════════════════════════════════

/**
 * Converts a numeric rank value to its readable name.
 *
 * @param rank - A card rank (2–14).
 * @returns The human-readable name, e.g. "Ace" for 14.
 */
function rankName(rank: Rank): string {
  return RANK_NAMES[rank];
}

// ═══════════════════════════════════════════════════════════════
//  HELPER: PREFLOP HAND CLASSIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Classifies a two-card starting hand into one of three strength tiers.
 *
 * The tiers are intentionally broad — this is a teaching tool, not a
 * GTO solver. The goal is to give beginners a rough sense of which
 * starting hands are worth playing.
 *
 * - "strong": Hands worth raising with (high pairs, AK, AQ).
 * - "decent": Hands worth calling with (medium pairs, suited connectors).
 * - "weak":   Hands that should usually be folded (low offsuit junk).
 *
 * @param holeCards - The player's two private cards.
 * @returns "strong", "decent", or "weak".
 */
function classifyStartingHand(holeCards: Card[]): "strong" | "decent" | "weak" {
  const rank1: Rank = holeCards[0].rank;
  const rank2: Rank = holeCards[1].rank;
  const highRank: Rank = Math.max(rank1, rank2) as Rank;
  const lowRank: Rank = Math.min(rank1, rank2) as Rank;
  const isPair: boolean = rank1 === rank2;
  const isSuited: boolean = holeCards[0].suit === holeCards[1].suit;

  // --- Strong hands ---
  // High pairs (10-10 through A-A) are premium starting hands.
  if (isPair && highRank >= 10) {
    return "strong";
  }

  // Ace-King and Ace-Queen are strong regardless of suits.
  if (highRank === 14 && lowRank >= 12) {
    return "strong";
  }

  // --- Decent hands ---
  // Medium pairs (6-6 through 9-9) can hit a set on the flop.
  if (isPair && highRank >= 6) {
    return "decent";
  }

  // Suited connectors (e.g. 8♥-9♥) have straight and flush potential.
  const isConnector: boolean = Math.abs(rank1 - rank2) === 1;
  if (isSuited && isConnector) {
    return "decent";
  }

  // Ace with a decent kicker (A-J, A-10) suited is playable.
  if (highRank === 14 && lowRank >= 10 && isSuited) {
    return "decent";
  }

  // Any Ace-suited hand has flush potential.
  if (highRank === 14 && isSuited) {
    return "decent";
  }

  // King-Queen is a solid broadway hand.
  if (highRank === 13 && lowRank === 12) {
    return "decent";
  }

  // Low pairs (2-2 through 5-5) still have set-mining value.
  if (isPair) {
    return "decent";
  }

  // --- Weak hands ---
  // Everything else — low offsuit cards with little straight/flush potential.
  return "weak";
}

/**
 * Returns a short, beginner-friendly description of the starting hand.
 *
 * @param holeCards - The player's two private cards.
 * @returns A descriptive snippet like "a pocket pair" or "suited connectors".
 */
function describeStartingHand(holeCards: Card[]): string {
  const rank1: Rank = holeCards[0].rank;
  const rank2: Rank = holeCards[1].rank;
  const isPair: boolean = rank1 === rank2;
  const isSuited: boolean = holeCards[0].suit === holeCards[1].suit;
  const isConnector: boolean = Math.abs(rank1 - rank2) === 1;

  if (isPair) {
    return `a pocket pair of ${rankName(rank1)}s`;
  }
  if (isSuited && isConnector) {
    return "suited connectors";
  }
  if (isSuited) {
    return "suited cards";
  }
  if (isConnector) {
    return "connectors";
  }
  return "offsuit cards";
}

// ═══════════════════════════════════════════════════════════════
//  HELPER: HAND RANK LABELS
// ═══════════════════════════════════════════════════════════════

/**
 * Returns a friendly label for a HandRank value, suitable for embedding
 * in a sentence (e.g. "you have a Straight").
 *
 * @param handRank - The HandRank enum value.
 * @returns A beginner-friendly string like "a Full House" or "One Pair".
 */
function friendlyHandLabel(handRank: HandRank): string {
  return HAND_RANK_LABELS[handRank];
}

// ═══════════════════════════════════════════════════════════════
//  EXPORTED: PHASE MESSAGE
// ═══════════════════════════════════════════════════════════════

/**
 * Returns a short teaching message (1–2 sentences) when a new phase begins.
 *
 * The message explains what just happened in the game and comments on the
 * player's current hand strength. It uses `evaluateHand` to assess the
 * hand whenever community cards are available.
 *
 * @param phase          - The current game phase (preflop, flop, turn, river, showdown).
 * @param holeCards      - The player's two private hole cards.
 * @param communityCards - The shared community cards on the board (empty for preflop).
 * @returns A beginner-friendly instructional message.
 *
 * @example
 * getPhaseMessage("preflop", [{ suit: "hearts", rank: 14 }, { suit: "spades", rank: 13 }], [])
 * // → "You've been dealt your hole cards — these are private to you. You have Ace-King offsuit cards — that's a strong starting hand!"
 */
export function getPhaseMessage(
  phase: GamePhase,
  holeCards: Card[],
  communityCards: Card[]
): string {
  switch (phase) {
    // ── Preflop: explain hole cards and comment on starting strength ──
    case "preflop": {
      const strength: "strong" | "decent" | "weak" =
        classifyStartingHand(holeCards);
      const description: string = describeStartingHand(holeCards);
      const card1Name: string = rankName(holeCards[0].rank);
      const card2Name: string = rankName(holeCards[1].rank);

      // Build a strength comment based on the tier.
      const strengthComment: string =
        strength === "strong"
          ? "that's a strong starting hand!"
          : strength === "decent"
            ? "that's a decent hand with potential."
            : "that's a weak hand — consider folding unless you want to bluff.";

      return `You've been dealt your hole cards — these are private to you. You have ${card1Name}-${card2Name} ${description} — ${strengthComment}`;
    }

    // ── Flop: three community cards appear, assess improvement ──
    case "flop": {
      // Evaluate the player's best hand using hole cards + the 3 community cards.
      const evaluated = evaluateHand(holeCards, communityCards);
      const handLabel: string = friendlyHandLabel(evaluated.rank);

      // Different messages depending on whether the flop helped.
      if (evaluated.rank >= HandRank.TwoPair) {
        // Strong hand — the flop connected well.
        return `The flop is down — 3 community cards everyone shares. Great news: you've made ${handLabel}! You're in a strong position.`;
      }
      if (evaluated.rank === HandRank.OnePair) {
        // Made a pair — solid but not amazing.
        return `The flop is down — 3 community cards everyone shares. You've got ${handLabel}. That's a solid start — see if the turn improves it.`;
      }
      // High card only — the flop didn't help much.
      return `The flop is down — 3 community cards everyone shares. You only have ${handLabel} right now. Watch for cards that could make a pair or better.`;
    }

    // ── Turn: one more community card, check for improvement ──
    case "turn": {
      const evaluated = evaluateHand(holeCards, communityCards);
      const handLabel: string = friendlyHandLabel(evaluated.rank);

      if (evaluated.rank >= HandRank.TwoPair) {
        return `The turn card is here — the 4th community card. You now have ${handLabel}. Looking strong heading into the river!`;
      }
      if (evaluated.rank === HandRank.OnePair) {
        return `The turn card is here — the 4th community card. You still have ${handLabel}. One more card to go — the river could change everything.`;
      }
      return `The turn card is here — the 4th community card. Still just ${handLabel}. You'll need the river to connect, or consider folding.`;
    }

    // ── River: the final community card ──
    case "river": {
      const evaluated = evaluateHand(holeCards, communityCards);
      const handLabel: string = friendlyHandLabel(evaluated.rank);

      if (evaluated.rank >= HandRank.TwoPair) {
        return `The river — the last community card. Your final hand is ${handLabel}. That's a strong finish!`;
      }
      if (evaluated.rank === HandRank.OnePair) {
        return `The river — the last community card. You ended up with ${handLabel}. It might hold up, but be cautious.`;
      }
      return `The river — the last community card. You've got ${handLabel}. It'll be tough to win without bluffing.`;
    }

    // ── Showdown: reveal the final hand evaluation ──
    case "showdown": {
      const evaluated = evaluateHand(holeCards, communityCards);

      // Use the detailed label from the evaluator (e.g. "Pair of Kings")
      // rather than the generic category label.
      return `Showdown! Your best hand is: ${evaluated.label}. Let's see how it stacks up!`;
    }

    default:
      return "A new phase has started.";
  }
}

// ═══════════════════════════════════════════════════════════════
//  EXPORTED: RECOMMENDED ACTION
// ═══════════════════════════════════════════════════════════════

/**
 * Returns a suggested action based on simple, rule-based heuristics.
 *
 * This is NOT a poker AI — it gives beginners a reasonable default
 * action so they can learn the basics of hand selection and betting.
 *
 * - **Preflop**: Based on starting hand strength classification.
 * - **Post-flop**: Based on the evaluated hand rank.
 * - Returns `null` if no clear recommendation can be made.
 *
 * @param phase          - The current game phase.
 * @param holeCards      - The player's two private hole cards.
 * @param communityCards - The shared community cards on the board.
 * @returns A recommended PlayerAction ("fold", "call", or "raise"), or null.
 *
 * @example
 * getRecommendedAction("preflop", [{ suit: "hearts", rank: 14 }, { suit: "spades", rank: 14 }], [])
 * // → "raise"  (pocket Aces — always raise!)
 */
export function getRecommendedAction(
  phase: GamePhase,
  holeCards: Card[],
  communityCards: Card[]
): PlayerAction | null {
  // ── Preflop: base the recommendation on starting hand classification ──
  if (phase === "preflop") {
    const strength: "strong" | "decent" | "weak" =
      classifyStartingHand(holeCards);

    // Strong hands → raise to build the pot and push out weak hands.
    if (strength === "strong") {
      return "raise";
    }
    // Decent hands → call to see the flop cheaply and hope to improve.
    if (strength === "decent") {
      return "call";
    }
    // Weak hands → fold to avoid losing chips on bad cards.
    return "fold";
  }

  // ── Showdown: no action to take — the hand is over ──
  if (phase === "showdown") {
    return null;
  }

  // ── Post-flop (flop, turn, river): base on evaluated hand strength ──
  // We need community cards to evaluate — if there are none, we can't recommend.
  if (communityCards.length === 0) {
    return null;
  }

  const evaluated = evaluateHand(holeCards, communityCards);

  // Two pair or better → raise. You likely have a winning hand.
  if (evaluated.rank >= HandRank.TwoPair) {
    return "raise";
  }

  // One pair → call. You have some showdown value, but it's not dominant.
  if (evaluated.rank === HandRank.OnePair) {
    return "call";
  }

  // High card only → fold. Without a pair, the odds are against you.
  return "fold";
}

// ═══════════════════════════════════════════════════════════════
//  EXPORTED: ACTION FEEDBACK
// ═══════════════════════════════════════════════════════════════

/**
 * Returns a short feedback message (1–2 sentences) after the player acts.
 *
 * Compares the player's chosen action against the recommended action and
 * gives encouraging, educational feedback. The tone is always casual and
 * supportive — the goal is to teach, never to judge.
 *
 * @param action            - The action the player actually took.
 * @param recommendedAction - The action that was recommended (or null).
 * @param phase             - The current game phase.
 * @param holeCards         - The player's two private hole cards.
 * @param communityCards    - The shared community cards on the board.
 * @returns A short, encouraging feedback message.
 *
 * @example
 * getActionFeedback("call", "call", "flop",
 *   [{ suit: "hearts", rank: 10 }, { suit: "hearts", rank: 11 }],
 *   [{ suit: "diamonds", rank: 10 }, { suit: "clubs", rank: 5 }, { suit: "spades", rank: 2 }]
 * )
 * // → "Good call — your One Pair gives you a solid chance here."
 */
export function getActionFeedback(
  action: PlayerAction,
  recommendedAction: PlayerAction | null,
  phase: GamePhase,
  holeCards: Card[],
  communityCards: Card[]
): string {
  // Determine the current hand strength for context in feedback messages.
  // Preflop uses starting hand classification; post-flop uses evaluated hand rank.
  const isPreflop: boolean = phase === "preflop";

  // Get a description of hand strength for use in feedback messages.
  const handDescription: string = isPreflop
    ? describeStartingHandStrength(holeCards)
    : describeEvaluatedHand(holeCards, communityCards);

  // ── Case 1: No recommendation was available — give generic feedback ──
  if (recommendedAction === null) {
    return getGenericFeedback(action, handDescription);
  }

  // ── Case 2: Player followed the recommendation ──
  if (action === recommendedAction) {
    return getAgreementFeedback(action, handDescription);
  }

  // ── Case 3: Player deviated from the recommendation ──
  return getDeviationFeedback(action, recommendedAction, handDescription);
}

// ═══════════════════════════════════════════════════════════════
//  INTERNAL: FEEDBACK MESSAGE BUILDERS
// ═══════════════════════════════════════════════════════════════

/**
 * Returns a description of preflop hand strength for feedback messages.
 *
 * @param holeCards - The player's two private cards.
 * @returns A snippet like "your strong starting hand" or "a weak hand".
 */
function describeStartingHandStrength(holeCards: Card[]): string {
  const strength: "strong" | "decent" | "weak" =
    classifyStartingHand(holeCards);

  if (strength === "strong") {
    return "a strong starting hand";
  }
  if (strength === "decent") {
    return "a decent starting hand";
  }
  return "a weak starting hand";
}

/**
 * Returns a description of the evaluated post-flop hand for feedback.
 *
 * @param holeCards      - The player's two private cards.
 * @param communityCards - The community cards on the board.
 * @returns A snippet like "your One Pair" or "your Two Pair".
 */
function describeEvaluatedHand(
  holeCards: Card[],
  communityCards: Card[]
): string {
  // Guard: if no community cards are available, fall back to preflop description.
  if (communityCards.length === 0) {
    return describeStartingHandStrength(holeCards);
  }

  const evaluated = evaluateHand(holeCards, communityCards);
  return `your ${friendlyHandLabel(evaluated.rank)}`;
}

/**
 * Generates feedback when no recommendation was available.
 * Gives a neutral, supportive comment about the player's choice.
 *
 * @param action          - The action the player took.
 * @param handDescription - A string describing the player's current hand.
 * @returns An encouraging feedback message.
 */
function getGenericFeedback(
  action: PlayerAction,
  handDescription: string
): string {
  switch (action) {
    case "fold":
      return `You folded — sometimes discretion is the better part of valor. No chips lost!`;
    case "call":
      return `You called with ${handDescription}. Let's see what comes next!`;
    case "raise":
      return `You raised with ${handDescription}. Confident play — let's see if it pays off!`;
    default:
      return "Interesting choice — let's see how it plays out!";
  }
}

/**
 * Generates positive feedback when the player followed the recommendation.
 *
 * @param action          - The action the player took (same as recommended).
 * @param handDescription - A string describing the player's current hand.
 * @returns An encouraging feedback message.
 */
function getAgreementFeedback(
  action: PlayerAction,
  handDescription: string
): string {
  switch (action) {
    case "fold":
      // Folding a weak hand is the disciplined play.
      return `Smart fold — with ${handDescription}, saving your chips is the right move.`;
    case "call":
      // Calling with a decent hand keeps you in without overcommitting.
      return `Good call — ${handDescription} gives you a solid chance here.`;
    case "raise":
      // Raising with strength is textbook poker.
      return `Great raise! With ${handDescription}, putting pressure on opponents is the way to go.`;
    default:
      return "Nice play — you're reading the situation well!";
  }
}

/**
 * Generates educational feedback when the player deviated from the recommendation.
 * The tone is always supportive — explains why the recommendation differed
 * without being condescending.
 *
 * @param action            - The action the player actually took.
 * @param recommendedAction - The action that was recommended.
 * @param handDescription   - A string describing the player's current hand.
 * @returns An encouraging, educational feedback message.
 */
function getDeviationFeedback(
  action: PlayerAction,
  recommendedAction: PlayerAction,
  handDescription: string
): string {
  // ── Folded when raise or call was recommended ──
  if (action === "fold" && recommendedAction === "raise") {
    return `Folding is always safe, but you had ${handDescription} — raising could've paid off big.`;
  }
  if (action === "fold" && recommendedAction === "call") {
    return `Playing it safe by folding, but ${handDescription} was worth seeing another card.`;
  }

  // ── Called when raise was recommended ──
  if (action === "call" && recommendedAction === "raise") {
    return `Calling works here, but with ${handDescription}, a raise could've built a bigger pot in your favor.`;
  }

  // ── Called when fold was recommended ──
  if (action === "call" && recommendedAction === "fold") {
    return `Staying in can work sometimes, but with ${handDescription}, you might be throwing chips away. Watch how it plays out.`;
  }

  // ── Raised when fold was recommended ──
  if (action === "raise" && recommendedAction === "fold") {
    return `Bold move — raising with ${handDescription} can bluff opponents, but it's risky. Use this sparingly!`;
  }

  // ── Raised when call was recommended ──
  if (action === "raise" && recommendedAction === "call") {
    return `Aggressive play! With ${handDescription}, calling was safer, but raising can put opponents on the back foot.`;
  }

  // Fallback — should rarely be reached given the exhaustive cases above.
  return "Interesting choice — every decision is a learning opportunity!";
}
