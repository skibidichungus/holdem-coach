import { describe, it, expect } from "vitest";
import { getOpponentAction } from "./opponentAI";
import type { Card } from "./types";

// ── Helper ──────────────────────────────────────────────────────────────────
function c(rank: Card["rank"], suit: Card["suit"]): Card {
  return { rank, suit };
}

// ════════════════════════════════════════════════════════════════════════════
describe("getOpponentAction", () => {
  // ── Preflop ────────────────────────────────────────────────────────────
  describe("preflop", () => {
    it("folds weak hand against a raise (7-2 offsuit)", () => {
      const result = getOpponentAction(
        "preflop",
        [c(7, "clubs"), c(2, "diamonds")],
        [],
        "raise"
      );
      expect(result).toBe("fold");
    });

    it("calls decent hand against a raise (pocket nines)", () => {
      const result = getOpponentAction(
        "preflop",
        [c(9, "diamonds"), c(9, "clubs")],
        [],
        "raise"
      );
      expect(result).toBe("call");
    });

    it("re-raises a strong hand against a raise (pocket aces)", () => {
      const result = getOpponentAction(
        "preflop",
        [c(14, "spades"), c(14, "hearts")],
        [],
        "raise"
      );
      expect(result).toBe("raise");
    });

    it("raises a strong hand when player calls (pocket kings)", () => {
      const result = getOpponentAction(
        "preflop",
        [c(13, "spades"), c(13, "hearts")],
        [],
        "call"
      );
      expect(result).toBe("raise");
    });

    it("limps weak hand when player just calls — never folds cheap (7-2 offsuit)", () => {
      const result = getOpponentAction(
        "preflop",
        [c(7, "clubs"), c(2, "diamonds")],
        [],
        "call"
      );
      expect(result).toBe("call");
    });

    it("raises AK (strong) against a raise", () => {
      const result = getOpponentAction(
        "preflop",
        [c(14, "spades"), c(13, "hearts")],
        [],
        "raise"
      );
      expect(result).toBe("raise");
    });

    it("calls decent suited connector (9s-Ts) against a raise", () => {
      const result = getOpponentAction(
        "preflop",
        [c(9, "spades"), c(10, "spades")],
        [],
        "raise"
      );
      expect(result).toBe("call");
    });
  });

  // ── Post-flop ─────────────────────────────────────────────────────────
  describe("post-flop", () => {
    it("folds weak hand (high card only) against a raise", () => {
      // Hole: 7-2, Board: K-9-4 — no pair, high card only
      const result = getOpponentAction(
        "flop",
        [c(7, "clubs"), c(2, "diamonds")],
        [c(13, "spades"), c(9, "hearts"), c(4, "diamonds")],
        "raise"
      );
      expect(result).toBe("fold");
    });

    it("raises trips against a call (K-K-K board)", () => {
      // Hole: KK, Board: K-9-4 — three of a kind Kings
      const result = getOpponentAction(
        "flop",
        [c(13, "spades"), c(13, "hearts")],
        [c(13, "diamonds"), c(9, "hearts"), c(4, "diamonds")],
        "call"
      );
      expect(result).toBe("raise");
    });

    it("calls top pair (medium) when player calls — A-K hole, K on board", () => {
      // Hole: A-K, Board: K-9-4 — pair of Kings (rank 13 >= 10, so medium)
      const result = getOpponentAction(
        "flop",
        [c(14, "spades"), c(13, "hearts")],
        [c(13, "diamonds"), c(9, "hearts"), c(4, "diamonds")],
        "call"
      );
      expect(result).toBe("call");
    });

    it("folds bottom pair (rank <= 9) against a raise", () => {
      // Hole: 5-5, Board: K-9-4 — pair of fives (rank 5 < 10, so weak)
      const result = getOpponentAction(
        "flop",
        [c(5, "spades"), c(5, "hearts")],
        [c(13, "diamonds"), c(9, "hearts"), c(4, "diamonds")],
        "raise"
      );
      expect(result).toBe("fold");
    });

    it("never folds weak hand to a call (check behavior)", () => {
      // Hole: 7-2, Board: A-K-Q — high card only, but player called (no bet to face)
      const result = getOpponentAction(
        "flop",
        [c(7, "clubs"), c(2, "diamonds")],
        [c(14, "spades"), c(13, "hearts"), c(12, "diamonds")],
        "call"
      );
      expect(result).toBe("call");
    });
  });
});
