import { create } from "zustand";

// ─── Type imports ────────────────────────────────────────────
import type {
  Card,
  GamePhase,
  GameMode,
  Player,
  PlayerAction,
  Position,
  TutorialState,
} from "../lib/types";

// ─── Logic imports ───────────────────────────────────────────
import { createDeck, shuffleDeck, dealCards } from "../lib/deck";
import { getOpponentAction } from "../lib/opponentAI";
import { evaluateHand, compareHands } from "../lib/handEvaluator";
import {
  getPhaseMessage,
  getRecommendedAction,
  getActionFeedback,
  getHandStrength,
  getDrawInfo,
  getDrawDetails,
  getRecommendationRationale,
  getShowdownMessage,
} from "../lib/tutorial";
import {
  getSmallBlindForHand,
  STARTING_SMALL_BLIND,
} from "../lib/blinds";

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

  // ── Session state ──
  /** Which hand number we're on in the current session (1-indexed). */
  handNumber: number;
  /** Who currently holds the dealer button. Rotates each hand. */
  dealerButton: Position;
  /** The small blind amount for the current hand. Escalates every 5 hands. */
  smallBlind: number;
  /** True once one of the players runs out of chips — the session is over. */
  sessionOver: boolean;
  /** Who won the overall session (set when sessionOver becomes true). */
  sessionWinner: "player" | "opponent" | null;

  // ── Card state ──
  /** The remaining deck of cards (cards are removed as they're dealt). */
  deck: Card[];
  /** The shared community cards on the board (0–5 cards). */
  communityCards: Card[];

  // ── Player state ──
  /** The human player. */
  player: Player;
  /** The computer opponent. */
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
  /** The opponent's most recent action this phase (shown in the UI). Null before they've acted. */
  opponentLastAction: PlayerAction | null;
  /** True when the opponent has folded this hand. */
  opponentFolded: boolean;

  // ── Tutorial state ──
  /** Tutorial coaching state — messages, recommendations, and flow control. */
  tutorial: TutorialState;

  // ── Showdown reveal ──
  /** The human-readable label of the player's best hand (set at showdown). */
  playerHandLabel: string | null;
  /** The human-readable label of the opponent's best hand (set at showdown). */
  opponentHandLabel: string | null;

  // ── Actions ──
  /** Deal cards and start the current hand — uses existing session fields. */
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
  /** Deal the next hand in the session — keeps chip stacks, rotates button, escalates blinds if needed. */
  startNextHand: () => void;
  /** Reset everything including chip stacks and hand number — begins a brand new session. */
  startNewSession: () => void;
  /** Reset everything and start a brand new session. */
  resetGame: () => void;
  /** Switch between guided and quick mode. Restarts the hand if one is in progress. */
  setMode: (mode: GameMode) => void;
}

// ═══════════════════════════════════════════════════════════════
//  DEFAULT VALUES
// ═══════════════════════════════════════════════════════════════

// Starting chip count for both players.
const STARTING_CHIPS: number = 1000;

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
    drawDetails: null,
    rationale: null,
  };
}

// ═══════════════════════════════════════════════════════════════
//  HELPER: BLIND ROLES
// ═══════════════════════════════════════════════════════════════

/**
 * In heads-up poker, the button holder is the small blind and the non-button
 * player is the big blind. Returns which role each player has this hand.
 *
 * @param dealerButton - Which position currently holds the dealer button.
 * @returns An object mapping each seat to its blind role (SB or BB).
 */
export function getBlindRoles(
  dealerButton: Position
): { player: "SB" | "BB"; opponent: "SB" | "BB" } {
  return dealerButton === "player"
    ? { player: "SB", opponent: "BB" }
    : { player: "BB", opponent: "SB" };
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
  // Session defaults — overwritten by startNewSession / startNextHand.
  handNumber: 1,
  dealerButton: "player",
  smallBlind: STARTING_SMALL_BLIND,
  sessionOver: false,
  sessionWinner: null,
  deck: [],
  communityCards: [],
  player: createDefaultPlayer("You"),
  opponent: createDefaultPlayer("Opponent"),
  pot: 0,
  currentBet: STARTING_SMALL_BLIND * 2,
  phase: "preflop",
  winner: null,
  actionHistory: [],
  opponentLastAction: null,
  opponentFolded: false,
  tutorial: createDefaultTutorial(),
  // Reset hand labels so they don't bleed from the previous hand.
  playerHandLabel: null,
  opponentHandLabel: null,

  // ═════════════════════════════════════════════════════════════
  //  ACTION: INITIALIZE GAME
  // ═════════════════════════════════════════════════════════════

  /**
   * Deals a new hand using the current session fields (handNumber, dealerButton,
   * smallBlind, and both players' existing chip counts).
   *
   * Posts blinds, seeds the pot, deals hole cards, generates tutorial state,
   * and resets all per-hand fields. Does NOT touch session-level fields.
   *
   * When the opponent holds the button they act first preflop (heads-up rules).
   */
  initializeGame: (): void => {
    const state = get();
    const { dealerButton, smallBlind, mode: currentMode } = state;
    const bigBlind: number = smallBlind * 2;

    // ── Determine blind amounts capped at each player's chip count ──
    const playerChips: number = state.player.chips;
    const opponentChips: number = state.opponent.chips;

    // Button holder is small blind in heads-up.
    const playerSB: number =
      dealerButton === "player"
        ? Math.min(smallBlind, playerChips)
        : Math.min(bigBlind, playerChips);
    const opponentSB: number =
      dealerButton === "opponent"
        ? Math.min(smallBlind, opponentChips)
        : Math.min(bigBlind, opponentChips);

    const seedPot: number = playerSB + opponentSB;

    // ── Deal cards ──
    const freshDeck: Card[] = shuffleDeck(createDeck());
    const playerDeal = dealCards(freshDeck, 2);
    const playerHand: Card[] = playerDeal.dealt;
    const opponentDeal = dealCards(playerDeal.remaining, 2);
    const opponentHand: Card[] = opponentDeal.dealt;
    const remainingDeck: Card[] = opponentDeal.remaining;

    // ── Tutorial state (preflop, before opponent acts) ──
    const { handNumber } = state;
    const preflopMessage: string = getPhaseMessage(
      "preflop",
      playerHand,
      [],
      undefined,
      currentMode === "guided" ? handNumber : undefined,
      currentMode === "guided" ? dealerButton : undefined
    );
    const preflopRecommendation: PlayerAction | null = getRecommendedAction(
      "preflop",
      playerHand,
      []
    );
    const preflopStrength = getHandStrength("preflop", playerHand, []);
    const preflopRationale: string = getRecommendationRationale(
      "preflop",
      playerHand,
      [],
      preflopRecommendation,
      null
    );

    // ── Commit hand-reset state ──
    set({
      deck: remainingDeck,
      communityCards: [],
      player: {
        name: "You",
        hand: playerHand,
        chips: playerChips - playerSB,
        isFolded: false,
      },
      opponent: {
        name: "Opponent",
        hand: opponentHand,
        chips: opponentChips - opponentSB,
        isFolded: false,
      },
      pot: seedPot,
      currentBet: bigBlind,
      phase: "preflop",
      winner: null,
      actionHistory: [],
      opponentLastAction: null,
      opponentFolded: false,
      playerHandLabel: null,
      opponentHandLabel: null,
      tutorial: {
        step: 0,
        message: preflopMessage,
        recommendedAction: preflopRecommendation,
        awaitingContinue: currentMode === "guided",
        handStrength: preflopStrength,
        drawMessage: null,
        drawDetails: null,
        rationale: preflopRationale,
      },
    });


    // ── Position-aware preflop: opponent acts first when they hold the button ──
    if (dealerButton === "opponent") {
      const afterDeal = get();
      const oppAction: PlayerAction = getOpponentAction(
        "preflop",
        opponentHand,
        [],
        "call" // opponent is in the small-blind position and acts first
      );

      if (oppAction === "fold") {
        // Opponent folds preflop — player wins the blinds immediately.
        set({
          opponent: { ...afterDeal.opponent, isFolded: true },
          player: {
            ...afterDeal.player,
            chips: afterDeal.player.chips + afterDeal.pot,
          },
          pot: 0,
          opponentLastAction: "fold",
          opponentFolded: true,
          winner: "player",
          phase: "showdown",
          tutorial: {
            ...afterDeal.tutorial,
            message: "The opponent folds preflop. You win the blinds.",
            recommendedAction: null,
            awaitingContinue: false,
            rationale: null,
            drawDetails: null,
          },
        });
        return;
      }

      if (oppAction === "raise") {
        // Opponent raises — new bet is 2× the big blind.
        const newBet: number = bigBlind * 2;
        const extraFromOpp: number = newBet - opponentSB; // they already posted SB
        set({
          currentBet: newBet,
          pot: afterDeal.pot + extraFromOpp,
          opponent: {
            ...afterDeal.opponent,
            chips: afterDeal.opponent.chips - extraFromOpp,
          },
          opponentLastAction: "raise",
          tutorial: {
            ...afterDeal.tutorial,
            message: `The opponent raises preflop to ${newBet}. Your move.`,
            awaitingContinue: currentMode === "guided",
          },
        });
        return;
      }

      // oppAction === "call" — opponent just calls; player still gets to act.
      set({
        opponentLastAction: "call",
        tutorial: {
          ...afterDeal.tutorial,
          awaitingContinue: currentMode === "guided",
        },
      });
    }
  },

  // ═════════════════════════════════════════════════════════════
  //  ACTION: START NEW SESSION
  // ═════════════════════════════════════════════════════════════

  /**
   * Full reset — clears chip stacks, hand number, and session outcome.
   * Player always starts on the button for consistency in the tutorial.
   * Calls `initializeGame` to deal the first hand immediately.
   */
  startNewSession: (): void => {
    set({
      handNumber: 1,
      dealerButton: "player",
      smallBlind: STARTING_SMALL_BLIND,
      sessionOver: false,
      sessionWinner: null,
      player: createDefaultPlayer("You"),
      opponent: createDefaultPlayer("Opponent"),
    });
    get().initializeGame();
  },

  // ═════════════════════════════════════════════════════════════
  //  ACTION: START NEXT HAND
  // ═════════════════════════════════════════════════════════════

  /**
   * Advances to the next hand in the current session.
   *
   * 1. Does nothing if the session is already over.
   * 2. Awards the pot from the just-completed hand to the winner's chip stack.
   * 3. Checks for bust — if either player is at 0 chips, ends the session.
   * 4. Otherwise increments hand number, flips the dealer button, recomputes
   *    the small blind, and deals a new hand via `initializeGame`.
   */
  startNextHand: (): void => {
    const state = get();

    if (state.sessionOver) return;

    // ── Award pot to winner ──
    let newPlayerChips: number = state.player.chips;
    let newOpponentChips: number = state.opponent.chips;
    const potToAward: number = state.pot;

    if (state.winner === "player") {
      newPlayerChips += potToAward;
    } else if (state.winner === "opponent") {
      newOpponentChips += potToAward;
    } else if (state.winner === "tie") {
      const half: number = Math.floor(potToAward / 2);
      const oddChip: number = potToAward % 2;
      // Odd chip goes to the button holder (conventional rule).
      newPlayerChips += half + (state.dealerButton === "player" ? oddChip : 0);
      newOpponentChips += half + (state.dealerButton === "opponent" ? oddChip : 0);
    }

    // ── Check for bust ──
    if (newPlayerChips === 0 || newOpponentChips === 0) {
      const sessionWinner: "player" | "opponent" =
        newPlayerChips > 0 ? "player" : "opponent";
      const sessionMessage: string =
        sessionWinner === "player"
          ? "You busted the opponent — you win the session! Click 'New Session' to play again."
          : "You're out of chips — the opponent wins the session. Click 'New Session' to try again.";

      set({
        player: { ...state.player, chips: newPlayerChips },
        opponent: { ...state.opponent, chips: newOpponentChips },
        pot: 0,
        sessionOver: true,
        sessionWinner,
        tutorial: {
          ...state.tutorial,
          message: sessionMessage,
          recommendedAction: null,
          awaitingContinue: false,
          rationale: null,
          drawDetails: null,
        },
      });
      return;
    }

    // ── Advance session fields ──
    const nextHandNumber: number = state.handNumber + 1;
    const nextDealerButton: Position =
      state.dealerButton === "player" ? "opponent" : "player";
    const nextSmallBlind: number = getSmallBlindForHand(nextHandNumber);

    set({
      handNumber: nextHandNumber,
      dealerButton: nextDealerButton,
      smallBlind: nextSmallBlind,
      player: { ...state.player, chips: newPlayerChips },
      opponent: { ...state.opponent, chips: newOpponentChips },
      pot: 0,
    });

    get().initializeGame();
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
   * Awards the current pot to the opponent immediately.
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
      opponent: {
        ...state.opponent,
        chips: state.opponent.chips + state.pot,
      },
      pot: 0,
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
        rationale: null,
        drawDetails: null,
      },
    });
  },

  // ═════════════════════════════════════════════════════════════
  //  ACTION: PLAYER CALL
  // ═════════════════════════════════════════════════════════════

  /**
   * The player calls — they match the current bet to stay in the hand.
   * The opponent responds with a rule-based AI action:
   *   - fold  → opponent exits; player wins immediately without showdown
   *   - call  → both players match the bet; advance phase
   *   - raise → opponent raises; auto-call on the player's behalf; advance phase
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

    const oppAction: PlayerAction = getOpponentAction(
      currentPhase,
      state.opponent.hand,
      community,
      "call"
    );

    if (oppAction === "fold") {
      // Opponent folds — player wins immediately without a showdown.
      // Award the total pot (existing pot + player's call) to the player.
      const totalPot: number = state.pot + betAmount;
      set({
        pot: 0,
        player: {
          ...state.player,
          chips: state.player.chips - betAmount + totalPot,
        },
        actionHistory: [
          ...state.actionHistory,
          { phase: currentPhase, action: "call" as PlayerAction },
        ],
        opponentLastAction: "fold",
        opponentFolded: true,
        winner: "player",
        phase: "showdown",
        tutorial: {
          ...state.tutorial,
          step: state.tutorial.step + 1,
          message: `The opponent folds! You win the pot of ${totalPot} chips without a showdown.`,
          recommendedAction: null,
          awaitingContinue: false,
          rationale: null,
          drawDetails: null,
        },
      });
      return;
    }

    if (oppAction === "raise") {
      // Opponent raises. New bet = currentBet * 2 (mirrors player raise convention).
      // Auto-call on the player's behalf so the game can advance.
      const newBet: number = betAmount * 2;
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
          { phase: currentPhase, action: "call" as PlayerAction },
        ],
        opponentLastAction: "raise",
        tutorial: {
          ...state.tutorial,
          step: state.tutorial.step + 1,
          message: `The opponent raises to ${newBet}. You auto-called to stay in the hand.`,
          recommendedAction: null,
          awaitingContinue: false,
        },
      });
      get().advancePhase();
      return;
    }

    // oppAction === "call" — both players match the bet; advance phase.
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
      opponentLastAction: "call",
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
   * The opponent responds with a rule-based AI action:
   *   - fold  → opponent exits; player wins immediately without showdown
   *   - call  → opponent matches the raise; advance phase
   *   - raise → opponent re-raises; auto-call on the player's behalf; advance phase
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

    const oppAction: PlayerAction = getOpponentAction(
      currentPhase,
      state.opponent.hand,
      community,
      "raise"
    );

    if (oppAction === "fold") {
      // Opponent folds to the raise — player wins without showdown.
      // Award the total pot (existing pot + player's raise) to the player.
      const totalPot: number = state.pot + newBet;
      set({
        currentBet: newBet,
        pot: 0,
        player: {
          ...state.player,
          chips: state.player.chips - newBet + totalPot,
        },
        actionHistory: [
          ...state.actionHistory,
          { phase: currentPhase, action: "raise" as PlayerAction },
        ],
        opponentLastAction: "fold",
        opponentFolded: true,
        winner: "player",
        phase: "showdown",
        tutorial: {
          ...state.tutorial,
          step: state.tutorial.step + 1,
          message: `The opponent folds to your raise! You win ${totalPot} chips without a showdown.`,
          recommendedAction: null,
          awaitingContinue: false,
          rationale: null,
          drawDetails: null,
        },
      });
      return;
    }

    if (oppAction === "raise") {
      // Opponent re-raises. New bet = newBet * 2 (doubles the player's raise).
      // Auto-call on the player's behalf.
      const reraiseBet: number = newBet * 2;
      const potIncrease: number = reraiseBet * 2;
      set({
        currentBet: reraiseBet,
        pot: state.pot + potIncrease,
        player: {
          ...state.player,
          chips: state.player.chips - reraiseBet,
        },
        opponent: {
          ...state.opponent,
          chips: state.opponent.chips - reraiseBet,
        },
        actionHistory: [
          ...state.actionHistory,
          { phase: currentPhase, action: "raise" as PlayerAction },
        ],
        opponentLastAction: "raise",
        tutorial: {
          ...state.tutorial,
          step: state.tutorial.step + 1,
          message: `The opponent re-raises to ${reraiseBet}! You auto-called.`,
          recommendedAction: null,
          awaitingContinue: false,
        },
      });
      get().advancePhase();
      return;
    }

    // oppAction === "call" — opponent matches player's raise; advance phase.
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
      opponentLastAction: "call",
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

    const drawDetails = getDrawDetails(playerHand, newCommunityCards, nextPhase);
    const drawMessage: string | null = drawDetails
      ? `You have a ${drawDetails.label} — ${drawDetails.outs} outs, ~${drawDetails.equity}% to hit by the river.`
      : null;
    const rationale: string = getRecommendationRationale(
      nextPhase,
      playerHand,
      newCommunityCards,
      recommendation,
      get().opponentLastAction,
      evaluated
    );

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
        drawDetails,
        rationale,
      },
    });
  },

  // ═════════════════════════════════════════════════════════════
  //  ACTION: RESOLVE SHOWDOWN
  // ═════════════════════════════════════════════════════════════

  /**
   * Evaluates both players' hands, determines the winner, and awards the pot.
   *
   * Chip counts reflect the pot being awarded immediately on every showdown.
   * The `startNextHand` action reads chips directly from store state.
   */
  resolveShowdown: (): void => {
    const state = get();
    const community: Card[] = state.communityCards;
    const playerHand: Card[] = state.player.hand;
    const opponentHand: Card[] = state.opponent.hand;
    const pot: number = state.pot;

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

    // ── Award pot ──
    let newPlayerChips: number = state.player.chips;
    let newOpponentChips: number = state.opponent.chips;

    if (result === "player") {
      newPlayerChips += pot;
    } else if (result === "opponent") {
      newOpponentChips += pot;
    } else {
      // Tie: split pot; odd chip to the button holder by convention.
      const half: number = Math.floor(pot / 2);
      const oddChip: number = pot % 2;
      newPlayerChips += half + (state.dealerButton === "player" ? oddChip : 0);
      newOpponentChips += half + (state.dealerButton === "opponent" ? oddChip : 0);
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
      pot: 0,
      player: { ...state.player, chips: newPlayerChips },
      opponent: { ...state.opponent, chips: newOpponentChips },
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
        drawDetails: null,
        rationale: null,
      },
    });
  },

  // ═════════════════════════════════════════════════════════════
  //  ACTION: RESET GAME
  // ═════════════════════════════════════════════════════════════

  /**
   * Resets all state and begins a brand new session.
   * This is a convenience wrapper around `startNewSession`.
   */
  resetGame: (): void => {
    get().startNewSession();
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
      get().startNewSession();
    }
  },
}));
