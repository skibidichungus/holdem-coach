import { create } from "zustand";

// ─── Type imports ────────────────────────────────────────────
import type {
  Card,
  GamePhase,
  GameMode,
  Player,
  PlayerAction,
  TutorialState,
} from "../lib/types";

// ─── Logic imports ───────────────────────────────────────────
// Deck utilities for creating, shuffling, and dealing cards.
import { createDeck, shuffleDeck, dealCards } from "../lib/deck";

// Hand evaluation for determining winners at showdown.
import { evaluateHand, compareHands } from "../lib/handEvaluator";

// Tutorial coaching functions for guided mode messages & recommendations.
import {
  getPhaseMessage,
  getRecommendedAction,
  getActionFeedback,
  getHandStrength,
  getDrawInfo,
} from "../lib/tutorial";

// ═══════════════════════════════════════════════════════════════
//  STATE SHAPE
// ═══════════════════════════════════════════════════════════════

/**
 * A single entry in the action history log.
 * Records which phase the action was taken in and what the player did.
 */
interface ActionHistoryEntry {
  phase: GamePhase;
  action: PlayerAction;
}

/**
 * The complete state and action interface for the poker store.
 *
 * State fields represent the current snapshot of the game.
 * Action methods mutate the state to progress the game forward.
 */
interface PokerState {
  // ── Game configuration ──
  /** Whether the game is in "guided" (tutorial) or "quick" (free-play) mode. */
  mode: GameMode;

  // ── Card state ──
  /** The remaining deck of cards (cards are removed as they're dealt). */
  deck: Card[];
  /** The shared community cards on the board (0–5 cards). */
  communityCards: Card[];

  // ── Player state ──
  /** The human player. */
  player: Player;
  /** The computer opponent (passive — never folds, just calls). */
  opponent: Player;

  // ── Betting state ──
  /** The total chips in the pot this round. */
  pot: number;
  /** The current bet amount that must be matched to stay in the hand. */
  currentBet: number;

  // ── Round state ──
  /** The current phase of the hand (preflop → flop → turn → river → showdown). */
  phase: GamePhase;
  /** Who won the hand, or null if the hand is still in progress. */
  winner: "player" | "opponent" | "tie" | null;
  /** A log of every action the player has taken this hand. */
  actionHistory: ActionHistoryEntry[];

  // ── Tutorial state ──
  /** Tutorial coaching state — messages, recommendations, and flow control. */
  tutorial: TutorialState;

  // ── Actions ──
  /** Shuffle the deck, deal cards, and start a new hand. */
  initializeGame: () => void;
  /** Resume the game after a tutorial pause (dismiss "Continue" prompt). */
  continueTutorial: () => void;
  /** Player folds — forfeits the hand to the opponent. */
  playerFold: () => void;
  /** Player calls — matches the current bet to stay in. */
  playerCall: () => void;
  /** Player raises — increases the bet by the given amount. */
  playerRaise: (amount: number) => void;
  /** Advance to the next phase (deal community cards, update tutorial). */
  advancePhase: () => void;
  /** Evaluate both hands and determine the winner at showdown. */
  resolveShowdown: () => void;
  /** Reset everything and start a fresh hand (alias for initializeGame). */
  resetGame: () => void;
}

// ═══════════════════════════════════════════════════════════════
//  DEFAULT VALUES
// ═══════════════════════════════════════════════════════════════

// Starting chip count for both players.
const STARTING_CHIPS: number = 1000;

// The small blind / minimum bet — keeps the game simple for beginners.
const DEFAULT_BET: number = 20;

/**
 * Creates a fresh player object with default values.
 *
 * @param name - The display name for the player.
 * @returns A Player with no cards, full chips, and not folded.
 */
function createDefaultPlayer(name: string): Player {
  return {
    name,
    hand: [],
    chips: STARTING_CHIPS,
    isFolded: false,
  };
}

/**
 * Creates the default tutorial state — no message, no recommendation,
 * not waiting for the player to continue.
 */
function createDefaultTutorial(): TutorialState {
  return {
    step: 0,
    message: "",
    recommendedAction: null,
    awaitingContinue: false,
    // Default to "Nothing Yet" until the first hand is dealt.
    handStrength: { level: "Nothing Yet", percentage: 0 },
    drawMessage: null,
  };
}

// ═══════════════════════════════════════════════════════════════
//  STORE
// ═══════════════════════════════════════════════════════════════

/**
 * The main Zustand store for the Texas Hold'em tutorial app.
 *
 * Manages the full lifecycle of a poker hand: initialization, dealing,
 * player actions, phase progression, showdown resolution, and tutorial
 * coaching. All game logic is delegated to the lib/ modules — the store
 * only orchestrates state transitions.
 *
 * Usage:
 * ```ts
 * const phase = usePokerStore((state) => state.phase);
 * const initializeGame = usePokerStore((state) => state.initializeGame);
 * ```
 */
export const usePokerStore = create<PokerState>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────
  mode: "guided",
  deck: [],
  communityCards: [],
  player: createDefaultPlayer("You"),
  opponent: createDefaultPlayer("Opponent"),
  pot: 0,
  currentBet: DEFAULT_BET,
  phase: "preflop",
  winner: null,
  actionHistory: [],
  tutorial: createDefaultTutorial(),

  // ═════════════════════════════════════════════════════════════
  //  ACTION: INITIALIZE GAME
  // ═════════════════════════════════════════════════════════════

  /**
   * Starts a new hand from scratch.
   *
   * 1. Creates and shuffles a fresh 52-card deck.
   * 2. Deals 2 hole cards to the player and 2 to the opponent.
   * 3. Resets the pot, bets, winner, and action history.
   * 4. Sets the phase to "preflop".
   * 5. Generates the opening tutorial message and recommended action.
   */
  initializeGame: (): void => {
    // Step 1: Build and shuffle a fresh deck.
    const freshDeck: Card[] = shuffleDeck(createDeck());

    // Step 2: Deal 2 cards to the player from the top of the deck.
    const playerDeal = dealCards(freshDeck, 2);
    const playerHand: Card[] = playerDeal.dealt;

    // Step 3: Deal 2 cards to the opponent from the remaining deck.
    const opponentDeal = dealCards(playerDeal.remaining, 2);
    const opponentHand: Card[] = opponentDeal.dealt;

    // Step 4: The rest of the deck stays for community cards later.
    const remainingDeck: Card[] = opponentDeal.remaining;

    // Step 5: Generate the tutorial message for the preflop phase.
    // No community cards exist yet, so we pass an empty array.
    const preflopMessage: string = getPhaseMessage(
      "preflop",
      playerHand,
      []
    );

    // Step 6: Generate the recommended action for preflop.
    const preflopRecommendation: PlayerAction | null = getRecommendedAction(
      "preflop",
      playerHand,
      []
    );

    // Step 7: Compute hand strength for the preflop display bar.
    // No community cards yet, so pass an empty array.
    const preflopStrength = getHandStrength("preflop", playerHand, []);

    // Step 8: Determine the current mode to decide if we pause.
    const currentMode: GameMode = get().mode;

    // Step 9: Apply all state changes in a single update.
    set({
      deck: remainingDeck,
      communityCards: [],
      player: {
        name: "You",
        hand: playerHand,
        chips: STARTING_CHIPS,
        isFolded: false,
      },
      opponent: {
        name: "Opponent",
        hand: opponentHand,
        chips: STARTING_CHIPS,
        isFolded: false,
      },
      pot: DEFAULT_BET * 2, // Both players post a blind to seed the pot.
      currentBet: DEFAULT_BET,
      phase: "preflop",
      winner: null,
      actionHistory: [],
      tutorial: {
        step: 0,
        message: preflopMessage,
        recommendedAction: preflopRecommendation,
        // In guided mode, pause so the player can read the tutorial message.
        awaitingContinue: currentMode === "guided",
        handStrength: preflopStrength,
        // No draws are possible preflop.
        drawMessage: null,
      },
    });
  },

  // ═════════════════════════════════════════════════════════════
  //  ACTION: CONTINUE TUTORIAL
  // ═════════════════════════════════════════════════════════════

  /**
   * Dismisses the tutorial pause so the player can act.
   *
   * Called when the player clicks "Continue" in guided mode.
   * Simply sets `awaitingContinue` to false, which unblocks the UI.
   */
  continueTutorial: (): void => {
    const currentTutorial: TutorialState = get().tutorial;

    set({
      tutorial: {
        ...currentTutorial,
        awaitingContinue: false,
      },
    });
  },

  // ═════════════════════════════════════════════════════════════
  //  ACTION: PLAYER FOLD
  // ═════════════════════════════════════════════════════════════

  /**
   * The player folds — they forfeit the hand and the opponent wins.
   *
   * 1. Marks the player as folded.
   * 2. Sets the winner to "opponent".
   * 3. Moves the phase to "showdown" (the hand is over).
   * 4. Generates action feedback explaining the fold.
   */
  playerFold: (): void => {
    const state = get();
    const currentPhase: GamePhase = state.phase;
    const playerHand: Card[] = state.player.hand;
    const community: Card[] = state.communityCards;

    // Generate feedback for folding.
    // Pass the current recommendation so the feedback can compare.
    const feedback: string = getActionFeedback(
      "fold",
      state.tutorial.recommendedAction,
      currentPhase,
      playerHand,
      community
    );

    set({
      // Mark the player as folded.
      player: { ...state.player, isFolded: true },
      // The opponent wins by default when the player folds.
      winner: "opponent",
      // Jump straight to showdown — the hand is over.
      phase: "showdown",
      // Record this action in the history log.
      actionHistory: [
        ...state.actionHistory,
        { phase: currentPhase, action: "fold" as PlayerAction },
      ],
      // Update the tutorial with fold feedback.
      tutorial: {
        ...state.tutorial,
        step: state.tutorial.step + 1,
        message: feedback,
        recommendedAction: null, // No further action needed — hand is over.
        awaitingContinue: false,
      },
    });
  },

  // ═════════════════════════════════════════════════════════════
  //  ACTION: PLAYER CALL
  // ═════════════════════════════════════════════════════════════

  /**
   * The player calls — they match the current bet to stay in the hand.
   *
   * 1. Adds the current bet to the pot (player's contribution).
   * 2. Also adds the opponent's call (passive opponent always matches).
   * 3. Records the action in the history.
   * 4. Generates action feedback.
   * 5. Advances to the next phase.
   */
  playerCall: (): void => {
    const state = get();
    const currentPhase: GamePhase = state.phase;
    const playerHand: Card[] = state.player.hand;
    const community: Card[] = state.communityCards;
    const betAmount: number = state.currentBet;

    // Generate feedback for calling.
    const feedback: string = getActionFeedback(
      "call",
      state.tutorial.recommendedAction,
      currentPhase,
      playerHand,
      community
    );

    // Both players put chips in: the player calls, and the passive
    // opponent always matches (they never fold or raise).
    const potIncrease: number = betAmount * 2;

    set({
      // Add both players' bets to the pot.
      pot: state.pot + potIncrease,
      // Deduct chips from the player.
      player: {
        ...state.player,
        chips: state.player.chips - betAmount,
      },
      // Deduct chips from the opponent (passive — always calls).
      opponent: {
        ...state.opponent,
        chips: state.opponent.chips - betAmount,
      },
      // Record this action in the history log.
      actionHistory: [
        ...state.actionHistory,
        { phase: currentPhase, action: "call" as PlayerAction },
      ],
      // Show the feedback message before advancing.
      tutorial: {
        ...state.tutorial,
        step: state.tutorial.step + 1,
        message: feedback,
        recommendedAction: null,
        awaitingContinue: false,
      },
    });

    // After updating state, advance to the next phase.
    // We call this after `set` so the state is consistent.
    get().advancePhase();
  },

  // ═════════════════════════════════════════════════════════════
  //  ACTION: PLAYER RAISE
  // ═════════════════════════════════════════════════════════════

  /**
   * The player raises — they increase the bet by the given amount.
   *
   * 1. Increases the current bet by `amount`.
   * 2. Adds both players' contributions to the pot (opponent always calls).
   * 3. Records the action in the history.
   * 4. Generates action feedback.
   * 5. Advances to the next phase.
   *
   * @param amount - The additional chips to raise on top of the current bet.
   */
  playerRaise: (amount: number): void => {
    const state = get();
    const currentPhase: GamePhase = state.phase;
    const playerHand: Card[] = state.player.hand;
    const community: Card[] = state.communityCards;

    // The new bet is the old bet plus the raise amount.
    const newBet: number = state.currentBet + amount;

    // Generate feedback for raising.
    const feedback: string = getActionFeedback(
      "raise",
      state.tutorial.recommendedAction,
      currentPhase,
      playerHand,
      community
    );

    // Both players put in the new bet amount.
    // The opponent is passive and always matches the raise.
    const potIncrease: number = newBet * 2;

    set({
      // Update the current bet to the new higher amount.
      currentBet: newBet,
      // Add both players' bets to the pot.
      pot: state.pot + potIncrease,
      // Deduct chips from the player.
      player: {
        ...state.player,
        chips: state.player.chips - newBet,
      },
      // Deduct chips from the opponent (passive — always calls the raise).
      opponent: {
        ...state.opponent,
        chips: state.opponent.chips - newBet,
      },
      // Record this action in the history log.
      actionHistory: [
        ...state.actionHistory,
        { phase: currentPhase, action: "raise" as PlayerAction },
      ],
      // Show the feedback message before advancing.
      tutorial: {
        ...state.tutorial,
        step: state.tutorial.step + 1,
        message: feedback,
        recommendedAction: null,
        awaitingContinue: false,
      },
    });

    // After updating state, advance to the next phase.
    get().advancePhase();
  },

  // ═════════════════════════════════════════════════════════════
  //  ACTION: ADVANCE PHASE
  // ═════════════════════════════════════════════════════════════

  /**
   * Moves the game to the next phase and deals the appropriate community cards.
   *
   * Phase progression:
   *   preflop → flop (deal 3 community cards)
   *   flop    → turn (deal 1 community card)
   *   turn    → river (deal 1 community card)
   *   river   → showdown (no cards dealt, resolve the hand)
   *
   * After dealing, generates a new tutorial message and recommended action.
   * In guided mode, sets `awaitingContinue = true` so the UI pauses.
   */
  advancePhase: (): void => {
    const state = get();
    const currentPhase: GamePhase = state.phase;
    const currentDeck: Card[] = state.deck;
    const currentCommunity: Card[] = state.communityCards;
    const playerHand: Card[] = state.player.hand;
    const currentMode: GameMode = state.mode;

    // Determine the next phase and how many cards to deal.
    let nextPhase: GamePhase;
    let cardsToDeal: number;

    switch (currentPhase) {
      case "preflop":
        // Flop: deal 3 community cards face-up on the board.
        nextPhase = "flop";
        cardsToDeal = 3;
        break;
      case "flop":
        // Turn: deal 1 more community card.
        nextPhase = "turn";
        cardsToDeal = 1;
        break;
      case "turn":
        // River: deal the final community card.
        nextPhase = "river";
        cardsToDeal = 1;
        break;
      case "river":
        // Showdown: no more cards — evaluate hands and pick a winner.
        nextPhase = "showdown";
        cardsToDeal = 0;
        break;
      default:
        // Already at showdown or unknown phase — do nothing.
        return;
    }

    // If we're heading to showdown, skip dealing and resolve immediately.
    if (nextPhase === "showdown") {
      set({ phase: "showdown" });
      get().resolveShowdown();
      return;
    }

    // Deal the required number of cards from the deck.
    const dealResult = dealCards(currentDeck, cardsToDeal);
    const newCommunityCards: Card[] = [
      ...currentCommunity,
      ...dealResult.dealt,
    ];

    // Generate the tutorial message for the new phase.
    // This tells the player what just happened and evaluates their hand.
    const phaseMessage: string = getPhaseMessage(
      nextPhase,
      playerHand,
      newCommunityCards
    );

    // Generate a recommended action for the new phase.
    const recommendation: PlayerAction | null = getRecommendedAction(
      nextPhase,
      playerHand,
      newCommunityCards
    );

    // Compute the updated hand strength for the strength bar.
    const handStrength = getHandStrength(nextPhase, playerHand, newCommunityCards);

    // Detect any draws (only relevant on flop and turn).
    const drawMessage: string | null = getDrawInfo(playerHand, newCommunityCards);

    set({
      // Move to the next phase.
      phase: nextPhase,
      // Update the deck (cards have been removed).
      deck: dealResult.remaining,
      // Add the new community cards to the board.
      communityCards: newCommunityCards,
      // Update the tutorial with the new phase message and recommendation.
      tutorial: {
        ...state.tutorial,
        step: state.tutorial.step + 1,
        message: phaseMessage,
        recommendedAction: recommendation,
        // In guided mode, pause so the player can read the tutorial message
        // before they need to act. In quick mode, let them act immediately.
        awaitingContinue: currentMode === "guided",
        handStrength,
        drawMessage,
      },
    });
  },

  // ═════════════════════════════════════════════════════════════
  //  ACTION: RESOLVE SHOWDOWN
  // ═════════════════════════════════════════════════════════════

  /**
   * Evaluates both players' hands and determines the winner.
   *
   * Uses `evaluateHand` to find each player's best 5-card hand,
   * then `compareHands` to see who wins. Updates the winner field
   * and generates the showdown tutorial message.
   */
  resolveShowdown: (): void => {
    const state = get();
    const community: Card[] = state.communityCards;
    const playerHand: Card[] = state.player.hand;
    const opponentHand: Card[] = state.opponent.hand;

    // Evaluate the best 5-card hand for each player.
    const playerEval = evaluateHand(playerHand, community);
    const opponentEval = evaluateHand(opponentHand, community);

    // Compare the two hands.
    // Positive = player wins, negative = opponent wins, zero = tie.
    const comparison: number = compareHands(playerEval, opponentEval);

    // Determine the winner based on the comparison result.
    let result: "player" | "opponent" | "tie";
    if (comparison > 0) {
      result = "player";
    } else if (comparison < 0) {
      result = "opponent";
    } else {
      result = "tie";
    }

    // Generate the showdown tutorial message.
    // This announces what hand the player ended up with.
    const showdownMessage: string = getPhaseMessage(
      "showdown",
      playerHand,
      community
    );

    // Compute final hand strength for display at showdown.
    const showdownStrength = getHandStrength("showdown", playerHand, community);

    set({
      phase: "showdown",
      winner: result,
      tutorial: {
        ...state.tutorial,
        step: state.tutorial.step + 1,
        message: showdownMessage,
        recommendedAction: null, // No actions at showdown — the hand is over.
        awaitingContinue: false,
        handStrength: showdownStrength,
        drawMessage: null, // No draws at showdown — all cards are revealed.
      },
    });
  },

  // ═════════════════════════════════════════════════════════════
  //  ACTION: RESET GAME
  // ═════════════════════════════════════════════════════════════

  /**
   * Resets all state and starts a brand new hand.
   * This is a convenience wrapper around `initializeGame`.
   */
  resetGame: (): void => {
    get().initializeGame();
  },
}));
