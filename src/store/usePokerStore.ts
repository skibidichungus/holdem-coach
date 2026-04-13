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
import { createDeck, shuffleDeck, dealCards } from "../lib/deck";
import { evaluateHand, compareHands } from "../lib/handEvaluator";
import {
  getPhaseMessage,
  getRecommendedAction,
  getActionFeedback,
  getHandStrength,
  getDrawInfo,
  getShowdownMessage,
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

  // ── Showdown reveal ──
  /** The human-readable label of the player's best hand (set at showdown). */
  playerHandLabel: string | null;
  /** The human-readable label of the opponent's best hand (set at showdown). */
  opponentHandLabel: string | null;

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
  /** Switch between guided and quick mode. Restarts the hand if one is in progress. */
  setMode: (mode: GameMode) => void;
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
  // Reset hand labels so they don't bleed from the previous hand.
  playerHandLabel: null,
  opponentHandLabel: null,

  // ═════════════════════════════════════════════════════════════
  //  ACTION: INITIALIZE GAME
  // ═════════════════════════════════════════════════════════════

  /**
   * Starts a new hand: shuffles a fresh deck, deals hole cards to both
   * players, generates the opening tutorial state, and resets all round fields.
   */
  initializeGame: (): void => {
    const freshDeck: Card[] = shuffleDeck(createDeck());

    const playerDeal = dealCards(freshDeck, 2);
    const playerHand: Card[] = playerDeal.dealt;

    const opponentDeal = dealCards(playerDeal.remaining, 2);
    const opponentHand: Card[] = opponentDeal.dealt;

    const remainingDeck: Card[] = opponentDeal.remaining;

    const preflopMessage: string = getPhaseMessage(
      "preflop",
      playerHand,
      []
    );

    const preflopRecommendation: PlayerAction | null = getRecommendedAction(
      "preflop",
      playerHand,
      []
    );

    const preflopStrength = getHandStrength("preflop", playerHand, []);

    const currentMode: GameMode = get().mode;

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
      playerHandLabel: null,
      opponentHandLabel: null,
      tutorial: {
        step: 0,
        message: preflopMessage,
        recommendedAction: preflopRecommendation,
        // In guided mode, pause so the player can read the tutorial message.
        awaitingContinue: currentMode === "guided",
        handStrength: preflopStrength,
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
   */
  playerFold: (): void => {
    const state = get();
    const currentPhase: GamePhase = state.phase;
    const playerHand: Card[] = state.player.hand;
    const community: Card[] = state.communityCards;

    const feedback: string = getActionFeedback(
      "fold",
      state.tutorial.recommendedAction,
      currentPhase,
      playerHand,
      community
    );

    set({
      player: { ...state.player, isFolded: true },
      winner: "opponent",
      phase: "showdown",
      actionHistory: [
        ...state.actionHistory,
        { phase: currentPhase, action: "fold" as PlayerAction },
      ],
      tutorial: {
        ...state.tutorial,
        step: state.tutorial.step + 1,
        message: feedback,
        recommendedAction: null,
        awaitingContinue: false,
      },
    });
  },

  // ═════════════════════════════════════════════════════════════
  //  ACTION: PLAYER CALL
  // ═════════════════════════════════════════════════════════════

  /**
   * The player calls — they match the current bet to stay in the hand.
   * The passive opponent always matches.
   */
  playerCall: (): void => {
    const state = get();
    const currentPhase: GamePhase = state.phase;
    const playerHand: Card[] = state.player.hand;
    const community: Card[] = state.communityCards;
    const betAmount: number = state.currentBet;

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
      pot: state.pot + potIncrease,
      player: {
        ...state.player,
        chips: state.player.chips - betAmount,
      },
      opponent: {
        ...state.opponent,
        chips: state.opponent.chips - betAmount,
      },
      actionHistory: [
        ...state.actionHistory,
        { phase: currentPhase, action: "call" as PlayerAction },
      ],
      tutorial: {
        ...state.tutorial,
        step: state.tutorial.step + 1,
        message: feedback,
        recommendedAction: null,
        awaitingContinue: false,
      },
    });

    get().advancePhase();
  },

  // ═════════════════════════════════════════════════════════════
  //  ACTION: PLAYER RAISE
  // ═════════════════════════════════════════════════════════════

  /**
   * The player raises — they increase the bet by the given amount.
   * The passive opponent always calls the raise.
   *
   * @param amount - The additional chips to raise on top of the current bet.
   */
  playerRaise: (amount: number): void => {
    const state = get();
    const currentPhase: GamePhase = state.phase;
    const playerHand: Card[] = state.player.hand;
    const community: Card[] = state.communityCards;

    const newBet: number = state.currentBet + amount;

    const feedback: string = getActionFeedback(
      "raise",
      state.tutorial.recommendedAction,
      currentPhase,
      playerHand,
      community
    );

    // The opponent is passive and always matches the raise.
    const potIncrease: number = newBet * 2;

    set({
      currentBet: newBet,
      pot: state.pot + potIncrease,
      player: {
        ...state.player,
        chips: state.player.chips - newBet,
      },
      opponent: {
        ...state.opponent,
        chips: state.opponent.chips - newBet,
      },
      actionHistory: [
        ...state.actionHistory,
        { phase: currentPhase, action: "raise" as PlayerAction },
      ],
      tutorial: {
        ...state.tutorial,
        step: state.tutorial.step + 1,
        message: feedback,
        recommendedAction: null,
        awaitingContinue: false,
      },
    });

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

    const dealResult = dealCards(currentDeck, cardsToDeal);
    const newCommunityCards: Card[] = [
      ...currentCommunity,
      ...dealResult.dealt,
    ];

    // evaluateHand generates all C(n,5) five-card combinations — expensive.
    // Evaluate once and pass the result to all three tutorial functions.
    const evaluated = evaluateHand(playerHand, newCommunityCards);

    const phaseMessage: string = getPhaseMessage(
      nextPhase,
      playerHand,
      newCommunityCards,
      evaluated
    );

    const recommendation: PlayerAction | null = getRecommendedAction(
      nextPhase,
      playerHand,
      newCommunityCards,
      evaluated
    );

    const handStrength = getHandStrength(nextPhase, playerHand, newCommunityCards, evaluated);

    const drawMessage: string | null = getDrawInfo(playerHand, newCommunityCards);

    set({
      phase: nextPhase,
      deck: dealResult.remaining,
      communityCards: newCommunityCards,
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
   */
  resolveShowdown: (): void => {
    const state = get();
    const community: Card[] = state.communityCards;
    const playerHand: Card[] = state.player.hand;
    const opponentHand: Card[] = state.opponent.hand;

    const playerEval = evaluateHand(playerHand, community);
    const opponentEval = evaluateHand(opponentHand, community);

    const comparison: number = compareHands(playerEval, opponentEval);

    let result: "player" | "opponent" | "tie";
    if (comparison > 0) {
      result = "player";
    } else if (comparison < 0) {
      result = "opponent";
    } else {
      result = "tie";
    }

    const showdownMessage: string = getShowdownMessage(
      playerEval,
      opponentEval,
      result
    );

    // Reuse the player's already-evaluated hand to avoid a redundant evaluateHand call.
    const showdownStrength = getHandStrength("showdown", playerHand, community, playerEval);

    set({
      phase: "showdown",
      winner: result,
      playerHandLabel: playerEval.label,
      opponentHandLabel: opponentEval.label,
      tutorial: {
        ...state.tutorial,
        step: state.tutorial.step + 1,
        message: showdownMessage,
        recommendedAction: null,
        awaitingContinue: false,
        handStrength: showdownStrength,
        drawMessage: null,
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

  // ═════════════════════════════════════════════════════════════
  //  ACTION: SET MODE
  // ═════════════════════════════════════════════════════════════

  /**
   * Switches between "guided" and "quick" mode. If a hand is in
   * progress, reinitializes so the new mode takes effect immediately.
   */
  setMode: (mode: GameMode): void => {
    set({ mode });
    if (get().player.hand.length > 0) {
      get().initializeGame();
    }
  },
}));
