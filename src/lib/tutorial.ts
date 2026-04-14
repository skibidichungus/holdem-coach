import type { Card, DrawDetails, EvaluatedHand, GamePhase, PlayerAction, Position, Rank, HandStrength } from "./types";
import { HandRank } from "./types";
import { evaluateHand } from "./handEvaluator";
import { RANK_NAMES, SUIT_NAMES } from "./constants";

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
 * @param preComputed    - Optional pre-evaluated hand to avoid redundant work.
 * @param handNumber     - Optional session hand number (1-indexed). Passed in guided mode only.
 * @param dealerButton   - Optional position that holds the dealer button. Passed in guided mode only.
 * @returns A beginner-friendly instructional message.
 *
 * @example
 * getPhaseMessage("preflop", [{ suit: "hearts", rank: 14 }, { suit: "spades", rank: 13 }], [])
 * // → "You've been dealt your hole cards — these are private to you. You have Ace-King offsuit cards — that's a strong starting hand!"
 */
export function getPhaseMessage(
  phase: GamePhase,
  holeCards: Card[],
  communityCards: Card[],
  preComputed?: EvaluatedHand,
  handNumber?: number,
  dealerButton?: Position
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

      // ── Blind prefix (guided mode only, when handNumber and dealerButton are provided) ──
      // Hand 1: full explanation of the heads-up blind structure.
      // Hand 2+: concise note about which position the player is in this hand.
      let blindPrefix: string = "";
      if (handNumber === 1 && dealerButton !== undefined) {
        blindPrefix =
          dealerButton === "player"
            ? "You're on the button this hand, which makes you the small blind (10 chips posted). The opponent is the big blind (20 chips). In heads-up poker, the button posts less but acts first preflop. "
            : "The opponent is on the button this hand, making them the small blind (10 chips posted). You're the big blind (20 chips). The big blind always puts in more, but gets to act last preflop after the button has decided. ";
      } else if (handNumber !== undefined && handNumber > 1 && dealerButton !== undefined) {
        blindPrefix =
          dealerButton === "player"
            ? "You have the button this hand — you're the small blind. "
            : "Opponent has the button this hand — you're the big blind. ";
      }

      return `${blindPrefix}You've been dealt your hole cards — these are private to you. You have ${card1Name}-${card2Name} ${description} — ${strengthComment}`;
    }

    case "flop": {
      const evaluated = preComputed ?? evaluateHand(holeCards, communityCards);
      const handLabel: string = friendlyHandLabel(evaluated.rank);

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
      const evaluated = preComputed ?? evaluateHand(holeCards, communityCards);
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
      const evaluated = preComputed ?? evaluateHand(holeCards, communityCards);
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
      const evaluated = preComputed ?? evaluateHand(holeCards, communityCards);

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
  communityCards: Card[],
  preComputed?: EvaluatedHand
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

  const evaluated = preComputed ?? evaluateHand(holeCards, communityCards);

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

// ═════════════════════════════════════════════════════════════
//  EXPORTED: HAND STRENGTH
// ═════════════════════════════════════════════════════════════

/**
 * Returns a rough hand strength level and percentage for the player's current hand.
 *
 * - Preflop: based on starting hand classification (strong/decent/weak).
 * - Post-flop: based on the HandRank returned by evaluateHand.
 *
 * The percentage is a rough 0–100 value intended to fill a visual bar,
 * not a mathematically precise equity calculation.
 *
 * @param phase          - The current game phase.
 * @param holeCards      - The player's two private hole cards.
 * @param communityCards - The community cards on the board (empty pre-flop).
 * @returns A HandStrength with a human-readable level and a 0–100 percentage.
 *
 * @example
 * getHandStrength("flop", holeCards, communityCards)
 * // → { level: "Decent", percentage: 35 }
 */
export function getHandStrength(
  phase: GamePhase,
  holeCards: Card[],
  communityCards: Card[],
  preComputed?: EvaluatedHand
): HandStrength {
  // ── Preflop: no community cards yet — use starting hand classification ──
  if (phase === "preflop" || communityCards.length === 0) {
    const strength: "strong" | "decent" | "weak" =
      classifyStartingHand(holeCards);

    if (strength === "strong") {
      // Premium hands like AA, KK, AK — well above average.
      return { level: "Strong", percentage: 70 };
    }
    if (strength === "decent") {
      // Suited connectors, medium pairs, etc. — playable.
      return { level: "Decent", percentage: 40 };
    }
    // Low offsuit junk — little equity preflop.
    return { level: "Weak", percentage: 15 };
  }

  // ── Post-flop: evaluate the actual best made hand ──
  const evaluated = preComputed ?? evaluateHand(holeCards, communityCards);
  const rank: HandRank = evaluated.rank;

  // Map each HandRank to a level and a representative percentage.
  // Percentages are intentionally round/simple — this is a teaching tool.
  if (rank === HandRank.HighCard) {
    // No pair, no draw — barely ahead of nothing.
    return { level: "Weak", percentage: 15 };
  }
  if (rank === HandRank.OnePair) {
    // One pair is decent — often enough to win a small pot.
    // The exact percentage varies with pair rank, but 35% is a good average.
    return { level: "Decent", percentage: 35 };
  }
  if (rank === HandRank.TwoPair) {
    // Two pair is a solid made hand.
    return { level: "Strong", percentage: 55 };
  }
  if (rank === HandRank.ThreeOfAKind) {
    // Trips is very strong; very few outs for opponents.
    return { level: "Strong", percentage: 70 };
  }
  if (rank === HandRank.Straight || rank === HandRank.Flush) {
    // Straights and flushes are near the top of the range.
    return { level: "Monster", percentage: 80 };
  }
  if (rank === HandRank.FullHouse) {
    // Full house is almost unbeatable short of quads or better.
    return { level: "Nuts", percentage: 90 };
  }
  if (rank === HandRank.FourOfAKind) {
    // Four of a kind — only a straight/royal flush beats this.
    return { level: "Nuts", percentage: 96 };
  }
  if (rank === HandRank.StraightFlush || rank === HandRank.RoyalFlush) {
    // The absolute best hands in poker.
    return { level: "Nuts", percentage: 100 };
  }

  // Fallback for any unlisted rank — should never be reached.
  return { level: "Nothing Yet", percentage: 0 };
}

// ═══════════════════════════════════════════════════════════════
//  EXPORTED: DRAW DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Returns structured draw details for the player's hand, or null if no draw is present.
 *
 * Uses the "rule of 4 and 2" for approximate equity:
 *   - Flop (2 cards to come): outs × 4
 *   - Turn (1 card to come):  outs × 2
 *
 * Priority order (strongest draw reported first):
 *   1. Open-ended straight flush (4 consecutive suited cards)
 *   2. Gutshot straight flush (4 suited cards missing one rank in a 5-card window)
 *   3. Flush draw (4 of same suit, no SF progression)
 *   4. Open-ended straight draw (4 consecutive ranks)
 *   5. Gutshot straight draw (one-gap)
 *   6. Overcards (both hole cards above every community card, no pair)
 *
 * Returns null on preflop and river (nothing to draw to), and when the
 * player already has a made hand stronger than one pair (except SF draws).
 *
 * @param holeCards      - The player's two private hole cards.
 * @param communityCards - The community cards currently on the board.
 * @param phase          - Current game phase.
 * @returns Structured draw info, or null.
 */
export function getDrawDetails(
  holeCards: Card[],
  communityCards: Card[],
  phase: GamePhase
): DrawDetails | null {
  // Only meaningful on flop (3 community cards) or turn (4 community cards).
  if (phase !== "flop" && phase !== "turn") return null;
  if (communityCards.length < 3 || communityCards.length > 4) return null;

  // Multiplier for the rule of 4 and 2.
  const equityMultiplier: number = phase === "flop" ? 4 : 2;

  const allCards: Card[] = [...holeCards, ...communityCards];

  // ── Check if the player already has a made hand > OnePair ──
  // If so, skip most draw reporting (they're not "drawing" in the usual sense).
  // Exception: SF draws are still reported even over made flushes.
  const currentEval = evaluateHand(holeCards, communityCards);
  const hasMadeHandAbovePair: boolean = currentEval.rank > HandRank.OnePair;

  // ── Group cards by suit for straight-flush detection ──
  const suitCards: Record<string, Card[]> = {};
  for (const card of allCards) {
    if (!suitCards[card.suit]) suitCards[card.suit] = [];
    suitCards[card.suit].push(card);
  }

  // ── 1. OPEN-ENDED STRAIGHT FLUSH: 4 consecutive suited cards ──
  for (const cards of Object.values(suitCards)) {
    if (cards.length < 4) continue;
    const suitedRanks: number[] = [...new Set(cards.map((c) => c.rank))].sort(
      (a, b) => a - b
    );
    if (suitedRanks.includes(14)) suitedRanks.unshift(1);
    // Slide a 4-wide window over the sorted suited ranks.
    for (let i = 0; i <= suitedRanks.length - 4; i++) {
      const w = suitedRanks.slice(i, i + 4);
      if (w[3] - w[0] === 3 && new Set(w).size === 4) {
        const outs = 15;
        // The two completing ranks are one below the window's low and one above its high.
        const suitName: string = SUIT_NAMES[cards[0].suit] ?? cards[0].suit;
        const lo: number = w[0] === 1 ? 2 : w[0];
        const hi: number = w[3];
        const loName: string = RANK_NAMES[lo] ?? String(lo);
        const hiName: string = RANK_NAMES[hi + 1] ?? String(hi + 1);
        const outsDescription = `a ${loName.toLowerCase()} of ${suitName} or a ${hiName.toLowerCase()} of ${suitName}`;
        return {
          type: "open-ended-straight-flush",
          outs,
          equity: Math.min(100, outs * equityMultiplier),
          label: "open-ended straight flush draw",
          outsDescription,
        };
      }
    }
  }

  // ── 2. GUTSHOT STRAIGHT FLUSH: 4 suited cards in a 5-card window with one gap ──
  for (const cards of Object.values(suitCards)) {
    if (cards.length < 4) continue;
    const suitedRanks: number[] = [...new Set(cards.map((c) => c.rank))].sort(
      (a, b) => a - b
    );
    if (suitedRanks.includes(14)) suitedRanks.unshift(1);
    for (let lo = 1; lo <= 10; lo++) {
      const window = [lo, lo + 1, lo + 2, lo + 3, lo + 4];
      const present = window.filter((r) => suitedRanks.includes(r));
      if (present.length === 4) {
        const suitName: string = SUIT_NAMES[cards[0].suit] ?? cards[0].suit;
        const missing: number = window.find((r) => !present.includes(r))!;
        const missingName: string = RANK_NAMES[missing] ?? String(missing);
        const outsDescription = `a ${missingName.toLowerCase()} of ${suitName}`;
        return {
          type: "straight-flush",
          outs: 1,
          equity: Math.min(100, 1 * equityMultiplier),
          label: "gutshot straight flush draw",
          outsDescription,
        };
      }
    }
  }

  // ── 3. FLUSH DRAW: 4 cards of the same suit ──
  for (const [suit, cards] of Object.entries(suitCards)) {
    if (cards.length === 4) {
      if (hasMadeHandAbovePair) return null;
      const suitName: string = SUIT_NAMES[suit] ?? suit;
      return {
        type: "flush",
        outs: 9,
        equity: Math.min(100, 9 * equityMultiplier),
        label: "flush draw",
        outsDescription: `any ${suitName}`,
      };
    }
  }

  if (hasMadeHandAbovePair) return null;

  // ── 4 & 5. STRAIGHT DRAWS: scan sorted unique ranks ──
  const rawRanks: number[] = allCards.map((c) => c.rank);
  const uniqueRanks: number[] = [...new Set(rawRanks)].sort((a, b) => a - b);
  if (uniqueRanks.includes(14)) uniqueRanks.unshift(1);

  let longestRun: number = 1;
  let currentRun: number = 1;
  let gutshotDetected: boolean = false;

  for (let i = 1; i < uniqueRanks.length; i++) {
    const gap: number = uniqueRanks[i] - uniqueRanks[i - 1];
    if (gap === 1) {
      currentRun++;
      longestRun = Math.max(longestRun, currentRun);
    } else if (gap === 2 && currentRun >= 3) {
      gutshotDetected = true;
      currentRun++;
      longestRun = Math.max(longestRun, currentRun);
    } else {
      currentRun = 1;
    }
  }

  // Open-ended straight draw: 4+ consecutive ranks, no gap.
  if (longestRun >= 4 && !gutshotDetected) {
    // Find the 4-card run and compute the two completing ranks.
    let runStart = 0;
    let runLen = 1;
    for (let i = 1; i < uniqueRanks.length; i++) {
      if (uniqueRanks[i] - uniqueRanks[i - 1] === 1) {
        runLen++;
        if (runLen >= 4) {
          runStart = i - runLen + 1;
        }
      } else {
        if (runLen < 4) runLen = 1;
      }
    }
    const runLow: number = uniqueRanks[runStart] === 1 ? 2 : uniqueRanks[runStart];
    const runHigh: number = uniqueRanks[runStart + runLen - 1];
    const lowName: string = RANK_NAMES[runLow - 1] ?? String(runLow - 1);
    const highName: string = RANK_NAMES[runHigh + 1] ?? String(runHigh + 1);
    const outsDescription = `a ${RANK_NAMES[runLow - 1] ? lowName.toLowerCase() : String(runLow - 1)} or a ${RANK_NAMES[runHigh + 1] ? highName.toLowerCase() : String(runHigh + 1)}`;
    return {
      type: "open-ended-straight",
      outs: 8,
      equity: Math.min(100, 8 * equityMultiplier),
      label: "open-ended straight draw",
      outsDescription,
    };
  }

  // Gutshot straight draw: 4 of 5 sequential ranks with one gap.
  if (gutshotDetected || longestRun >= 4) {
    // Find the gap rank by scanning for the 5-card window with 4 present.
    let missingRank: number = 0;
    outer: for (let lo = 1; lo <= 10; lo++) {
      const window = [lo, lo + 1, lo + 2, lo + 3, lo + 4];
      const present = window.filter((r) => uniqueRanks.includes(r));
      if (present.length === 4) {
        missingRank = window.find((r) => !present.includes(r))!;
        break outer;
      }
    }
    const missingName: string = RANK_NAMES[missingRank] ?? String(missingRank);
    return {
      type: "gutshot",
      outs: 4,
      equity: Math.min(100, 4 * equityMultiplier),
      label: "gutshot straight draw",
      outsDescription: `a ${missingName}`,
    };
  }

  // ── 6. OVERCARDS: both hole cards outrank every community card, no pair yet ──
  const maxCommunityRank: number = Math.max(
    ...communityCards.map((c) => c.rank)
  );
  const bothOvercards: boolean = holeCards.every(
    (c) => c.rank > maxCommunityRank
  );

  if (bothOvercards && currentEval.rank < HandRank.OnePair) {
    const r1: number = holeCards[0].rank;
    const r2: number = holeCards[1].rank;
    const highRankName: string = RANK_NAMES[Math.max(r1, r2)] ?? "";
    const lowRankName: string = RANK_NAMES[Math.min(r1, r2)] ?? "";
    return {
      type: "overcards",
      outs: 6,
      equity: Math.min(100, 6 * equityMultiplier),
      label: "overcard draw",
      outsDescription: `a ${highRankName} or a ${lowRankName} to pair up`,
    };
  }

  return null;
}

/**
 * Backward-compatible string wrapper around `getDrawDetails`.
 *
 * Retained so existing call sites that only need a display string continue to work.
 * For new code, prefer `getDrawDetails` to access the structured data.
 *
 * @param holeCards      - The player's two private hole cards.
 * @param communityCards - The community cards currently on the board.
 * @param phase          - Current game phase (defaults to "flop" for old call sites).
 * @returns A short draw message string, or null if no draw.
 */
export function getDrawInfo(
  holeCards: Card[],
  communityCards: Card[],
  phase: GamePhase = "flop"
): string | null {
  const details = getDrawDetails(holeCards, communityCards, phase);
  if (!details) return null;
  return `You have a ${details.label} — ${details.outs} outs, ~${details.equity}% to hit by the river.`;
}


// ═════════════════════════════════════════════════════════════
//  EXPORTED: SHOWDOWN COMPARISON MESSAGE
// ═════════════════════════════════════════════════════════════

// One-liner hierarchy hints shown when the hand ranks are close (within 3).
// Keyed by [winnerRank]-[loserRank] to keep lookups fast and readable.
// Only populated for adjacent/near pairs beginners might find confusing.
const HIERARCHY_HINTS: Record<string, string> = {
  // Pairs of adjacent ranks — most likely to confuse a beginner.
  "3-2": "Two pair always beats one pair.",
  "4-3": "Three of a kind beats two pair.",
  "5-4": "A straight beats three of a kind.",
  "6-5": "A flush beats a straight.",
  "7-6": "A full house beats a flush.",
  "8-7": "Four of a kind beats a full house.",
  "9-8": "A straight flush beats four of a kind.",
  // One rank apart from a fuller gap — still worth explaining.
  "5-3": "A straight beats two pair.",
  "6-4": "A flush beats three of a kind.",
  "7-5": "A full house beats a straight.",
  "8-6": "Four of a kind beats a flush.",
};

/**
 * Generates a detailed 2–3 sentence showdown recap that names both hands,
 * explains the outcome, and (when ranks are close) adds a brief hierarchy
 * or kicker explanation for the beginner.
 *
 * @param playerEval   - The player's evaluated best hand.
 * @param opponentEval - The opponent's evaluated best hand.
 * @param winner       - Who won: "player", "opponent", or "tie".
 * @returns A casual, encouraging showdown summary string.
 *
 * @example
 * getShowdownMessage(playerEval, opponentEval, "player")
 * // → "You had a Pair of Kings. Your opponent had a Pair of Nines.
 * //    Your Kings beat their Nines — well played!"
 */
export function getShowdownMessage(
  playerEval: { rank: HandRank; label: string },
  opponentEval: { rank: HandRank; label: string },
  winner: "player" | "opponent" | "tie"
): string {
  // Part 1: name both hands side by side.
  const handIntro: string =
    `You had ${playerEval.label}. Your opponent had ${opponentEval.label}.`;

  // Part 2: outcome sentence.
  let outcome: string;

  if (winner === "tie") {
    // Special case: both labels are the same hand type (e.g. both Pair of Aces).
    outcome = `You both had the same hand — it's a split pot!`;
  } else if (winner === "player") {
    outcome = `Your ${playerEval.label} beats their ${opponentEval.label} — nice hand!`;
  } else {
    outcome = `Their ${opponentEval.label} beats your ${playerEval.label} — tough luck, happens to everyone.`;
  }

  // Part 3 (optional): a short hierarchy or kicker explanation.
  // Only shown when the hand ranks are within 3 of each other — if the gap
  // is large, the result is obvious and the extra sentence would be noise.
  let hint: string = "";

  if (winner !== "tie") {
    const winnerRank: number =
      winner === "player" ? playerEval.rank : opponentEval.rank;
    const loserRank: number =
      winner === "player" ? opponentEval.rank : playerEval.rank;
    const rankGap: number = Math.abs(winnerRank - loserRank);

    if (rankGap === 0) {
      // Same hand category but different winner — this is a kicker situation.
      // e.g. Both have One Pair, but player's kicker card is higher.
      hint = `Both hands are the same type, but the higher cards (kickers) decided the winner.`;
    } else if (rankGap <= 3) {
      // Look up a pre-written hint for this rank matchup.
      const hintKey: string = `${winnerRank}-${loserRank}`;
      const hierarchyLine: string | undefined = HIERARCHY_HINTS[hintKey];
      if (hierarchyLine) {
        hint = hierarchyLine;
      }
    }
    // If rankGap > 3, the result speaks for itself — no hint needed.
  }

  // Combine the parts, including the hint only if one was found.
  return hint
    ? `${handIntro} ${outcome} ${hint}`
    : `${handIntro} ${outcome}`;
}

// ═══════════════════════════════════════════════════════════════
//  EXPORTED: RECOMMENDATION RATIONALE
// ═══════════════════════════════════════════════════════════════

/**
 * Returns a one-sentence explanation of why the coach is recommending the given action.
 *
 * Explains hand strength, draws, and risk trade-offs in beginner-friendly language.
 * Returns an empty string when there is no recommendation (prevents stale text in the UI).
 *
 * @param phase          - Current game phase.
 * @param holeCards      - Player's 2 hole cards.
 * @param communityCards - Shared board cards (empty for preflop).
 * @param recommendation - What the coach is suggesting (null if no suggestion).
 * @param opponentAction - What the opponent just did, if anything. Affects risk framing.
 * @param preComputed    - Optional pre-evaluated hand to avoid redundant evaluateHand calls.
 * @returns A one-sentence rationale string, or "" if no recommendation.
 */
export function getRecommendationRationale(
  phase: GamePhase,
  holeCards: Card[],
  communityCards: Card[],
  recommendation: PlayerAction | null,
  opponentAction: PlayerAction | null,
  preComputed?: EvaluatedHand
): string {
  if (recommendation === null) return "";

  // ── PREFLOP ──────────────────────────────────────────────────
  if (phase === "preflop") {
    const label: string = buildHoleCardsLabel(holeCards);
    const oppRaiseSuffix: string =
      opponentAction === "raise"
        ? " The opponent raised — be more selective than usual."
        : "";

    if (recommendation === "fold") {
      return `${label} rarely wins at showdown — folding now saves chips for stronger starting hands.`;
    }
    if (recommendation === "call") {
      return `${label} is playable but not strong enough to raise with — calling keeps you in cheaply.${oppRaiseSuffix}`;
    }
    // raise
    return `${label} is a premium starting hand. Raise now to build the pot while you're likely ahead.${oppRaiseSuffix}`;
  }

  // ── POST-FLOP (flop, turn, river) ────────────────────────────
  const evaluated: EvaluatedHand =
    preComputed ?? evaluateHand(holeCards, communityCards);
  const handRank: HandRank = evaluated.rank;
  const handLabel: string = friendlyHandLabel(handRank);

  // Ingredient 1: made hand strength sentence.
  let strengthSentence: string;
  if (handRank >= HandRank.ThreeOfAKind) {
    strengthSentence = `You've got ${handLabel} — one of the strongest hands at this stage.`;
  } else if (handRank === HandRank.TwoPair) {
    strengthSentence = `Two pair (${handLabel}) is strong but beatable by trips or straights.`;
  } else if (handRank === HandRank.OnePair) {
    // Determine the rank of the paired cards.
    const pairRank: number = getPairRank(holeCards, communityCards, evaluated);
    if (pairRank >= 10) {
      strengthSentence = `Top pair is worth playing, but watch for signs the opponent has two pair or trips.`;
    } else {
      strengthSentence = `A small pair can win unimproved but is easily beaten — don't inflate the pot.`;
    }
  } else {
    strengthSentence = `You don't have a made hand yet.`;
  }

  // Ingredient 2: draw sentence (only on flop and turn).
  let drawSentence: string = "";
  if (phase === "flop" || phase === "turn") {
    const draw = getDrawDetails(holeCards, communityCards, phase);
    if (draw) {
      if (
        draw.type === "straight-flush" ||
        draw.type === "open-ended-straight-flush"
      ) {
        drawSentence = `You're one card from a straight flush — this is a massive draw (~${draw.equity}% to hit). Raising is aggressive but the payoff is enormous.`;
      } else if (draw.type === "flush" || draw.type === "open-ended-straight") {
        drawSentence = `You have a ${draw.label} (${draw.outs} outs, ~${draw.equity}% to complete). Drawing hands play best as calls unless the pot is big.`;
      } else if (draw.type === "gutshot") {
        drawSentence = `A gutshot only hits about ${draw.equity}% of the time — worth a cheap call, never worth a raise.`;
      } else if (draw.type === "overcards") {
        drawSentence = `Your overcards can still improve (~${draw.equity}% to pair up), but they're a weak reason to raise.`;
      }
    }
  }

  // Edge case: weak hand + raise recommended (e.g. coach normally wouldn't suggest this).
  if (
    recommendation === "raise" &&
    handRank === HandRank.HighCard &&
    drawSentence === ""
  ) {
    return `The coach is suggesting a bluff — this is high-risk.`;
  }

  // Ingredient 3: action framing.
  let actionSentence: string;
  if (recommendation === "fold") {
    actionSentence = "Folding cuts your losses here.";
  } else if (recommendation === "call") {
    actionSentence = "Calling keeps you in without building a pot you might not win.";
  } else {
    actionSentence = "Raising charges the opponent to see the next card.";
  }

  // Compose the three ingredients, skipping empty ones, and trim excess whitespace.
  const parts = [strengthSentence, drawSentence, actionSentence].filter(
    (p) => p.length > 0
  );
  return parts.join(" ").replace(/\s{2,}/g, " ").trimEnd();
}

// ═══════════════════════════════════════════════════════════════
//  INTERNAL: RATIONALE HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Builds a human-readable label for a two-card starting hand.
 *
 * Examples: "Pocket aces", "King-queen suited", "Seven-two offsuit".
 *
 * @param holeCards - The player's two private cards.
 * @returns A friendly label string.
 */
export function buildHoleCardsLabel(holeCards: Card[]): string {
  const r1: number = holeCards[0].rank;
  const r2: number = holeCards[1].rank;
  const isPair: boolean = r1 === r2;
  const isSuited: boolean = holeCards[0].suit === holeCards[1].suit;

  if (isPair) {
    const name: string = RANK_NAMES[r1];
    const plural: string = name + "s";
    return `Pocket ${plural.toLowerCase()}`;
  }

  const high: number = Math.max(r1, r2);
  const low: number = Math.min(r1, r2);
  const highName: string = RANK_NAMES[high];
  const lowName: string = RANK_NAMES[low];
  const suitedLabel: string = isSuited ? "suited" : "offsuit";

  return `${highName}-${lowName.toLowerCase()} ${suitedLabel}`;
}

/**
 * Returns the numeric rank of the pair in a OnePair hand.
 * Falls back to 0 if no pair is found (should not happen when handRank === OnePair).
 *
 * @param holeCards      - The player's hole cards.
 * @param communityCards - The community cards.
 * @param evaluated      - The pre-evaluated hand.
 * @returns The rank of the pair.
 */
function getPairRank(
  holeCards: Card[],
  communityCards: Card[],
  evaluated: EvaluatedHand
): number {
  // The pair rank is embedded in the score. A one-pair score is:
  //   rank * 1_000_000 + pairRank * 10_000 + kickers...
  // Extracting: Math.floor((score % 1_000_000) / 10_000) gives pairRank.
  // Use a simple fallback: scan all cards for the first matching pair.
  const allCards: Card[] = [...holeCards, ...communityCards];
  const rankCounts: Record<number, number> = {};
  for (const card of allCards) {
    rankCounts[card.rank] = (rankCounts[card.rank] ?? 0) + 1;
  }
  // Return the highest-ranked card that appears exactly twice.
  const pairRanks: number[] = Object.entries(rankCounts)
    .filter(([, count]) => count >= 2)
    .map(([rank]) => Number(rank));
  if (pairRanks.length === 0) return 0;
  return Math.max(...pairRanks);
}
