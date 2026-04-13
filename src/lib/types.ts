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

// ─── Tutorial ────────────────────────────────────────────────

// Tracks where the learner is inside the guided tutorial flow.
export interface TutorialState {
  step: number; // Current step index (starts at 0)
  message: string; // Instructional text shown to the player
  recommendedAction: PlayerAction | null; // Suggested action, or null if no suggestion
  awaitingContinue: boolean; // True when the UI is waiting for the player to click "Continue"
}
