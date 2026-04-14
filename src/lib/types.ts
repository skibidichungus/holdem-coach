// ─── Card Types ──────────────────────────────────────────────

// The four suits in a standard deck of cards.
export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

// Card ranks represented as numbers for easy comparison.
// Face cards: 11 = Jack, 12 = Queen, 13 = King, 14 = Ace (Ace high).
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

// A single playing card — every card has exactly one suit and one rank.
export interface Card {
  suit: Suit;
  rank: Rank;
}

// ─── Hand Evaluation ─────────────────────────────────────────

// All ten possible poker hand rankings, ordered from weakest to strongest.
// The numeric value makes it easy to compare two hands:
//   if (handA.rank > handB.rank) → handA wins.
export enum HandRank {
  HighCard = 1, // No matching cards — winner decided by highest card
  OnePair = 2, // Two cards of the same rank
  TwoPair = 3, // Two separate pairs
  ThreeOfAKind = 4, // Three cards of the same rank
  Straight = 5, // Five cards in sequential order (any suits)
  Flush = 6, // Five cards of the same suit (any order)
  FullHouse = 7, // Three of a kind + a pair
  FourOfAKind = 8, // Four cards of the same rank
  StraightFlush = 9, // A straight where all five cards share a suit
  RoyalFlush = 10, // A-K-Q-J-10, all the same suit — the best hand possible
}

// The result of evaluating a player's best five-card hand.
export interface EvaluatedHand {
  rank: HandRank; // Which of the ten hand types this is
  score: number; // A composite number for tie-breaking (e.g. rank * 1000 + kickers)
  label: string; // A human-readable description, e.g. "Pair of Kings"
  /** The best 5 cards that make up this hand, ordered by relevance (primary made-hand cards first, then kickers). */
  cards: Card[];
}

// ─── Player ──────────────────────────────────────────────────

// Represents one player at the table.
export interface Player {
  name: string; // Display name (e.g. "You", "Bot 1")
  hand: Card[]; // The two hole cards dealt to this player
  chips: number; // How many chips the player currently has
  isFolded: boolean; // True if the player has folded this round
}

// ─── Game State ──────────────────────────────────────────────

// The five phases of a Texas Hold'em round, in order:
//   preflop → flop (3 community cards) → turn (+1) → river (+1) → showdown
export type GamePhase = "preflop" | "flop" | "turn" | "river" | "showdown";

// The three actions a player can take on their turn.
export type PlayerAction = "fold" | "call" | "raise";

// "guided" = step-by-step tutorial with hints;
// "quick"  = free-play mode with no hand-holding.
export type GameMode = "guided" | "quick";

/** Who is on the dealer button this hand. The button holder is the small blind in heads-up. */
export type Position = "player" | "opponent";

// ─── Tutorial ────────────────────────────────────────────────

// A rough 0–100 hand strength estimate with a human-readable tier label.
// Used by the hand strength indicator bar in the CoachPanel.
export interface HandStrength {
  level: "Nothing Yet" | "Weak" | "Decent" | "Strong" | "Monster" | "Nuts";
  percentage: number; // 0–100 — fills the strength bar in the UI
}

/** The kinds of drawing hands the coach can recognize. */
export type DrawType =
  | "flush"
  | "open-ended-straight"
  | "gutshot"
  | "straight-flush"
  | "open-ended-straight-flush"
  | "overcards";

/** A structured representation of a drawing hand, used to generate rationale text. */
export interface DrawDetails {
  type: DrawType;
  /** Number of cards in the remaining deck that complete the draw. */
  outs: number;
  /** Rough probability (0-100) of completing by the river, given current phase. */
  equity: number;
  /** Short human-friendly label, e.g. "flush draw", "open-ended straight draw". */
  label: string;
  /** Plain-English description of what card(s) complete the draw, e.g. "any heart", "a 6", "a 4 or a 9". */
  outsDescription: string;
}

// Tracks where the learner is inside the guided tutorial flow.
export interface TutorialState {
  step: number; // Current step index (starts at 0)
  message: string; // Instructional text shown to the player
  recommendedAction: PlayerAction | null; // Suggested action, or null if no suggestion
  awaitingContinue: boolean; // True when the UI is waiting for the player to click "Continue"
  handStrength: HandStrength; // Current hand strength level and percentage
  drawMessage: string | null; // Draw detection message (flush/straight draw, etc.) or null
  /** Structured draw info if a draw is present, null otherwise. */
  drawDetails: DrawDetails | null;
  /** One-sentence explanation for the current recommendation. Null before first recommendation. */
  rationale: string | null;
}
