import { describe, it, expect } from "vitest";
import { evaluateHand, compareHands } from "./handEvaluator";
import { HandRank } from "./types";
import type { Card } from "./types";

// ── Helper ───────────────────────────────────────────────────────────────────
function c(rank: Card["rank"], suit: Card["suit"]): Card {
  return { rank, suit };
}

// ═════════════════════════════════════════════════════════════════════════════
describe("handEvaluator", () => {
  // ── 3a. Hand detection ───────────────────────────────────────────────────
  describe("evaluateHand — hand detection", () => {
    it("detects Royal Flush", () => {
      const result = evaluateHand(
        [c(14, "hearts"), c(13, "hearts")],
        [c(12, "hearts"), c(11, "hearts"), c(10, "hearts"), c(2, "spades"), c(3, "clubs")]
      );
      expect(result.rank).toBe(HandRank.RoyalFlush);
      expect(result.label).toBe("Royal Flush");
    });

    it("detects Straight Flush (9-high)", () => {
      const result = evaluateHand(
        [c(9, "spades"), c(8, "spades")],
        [c(7, "spades"), c(6, "spades"), c(5, "spades"), c(14, "hearts"), c(2, "diamonds")]
      );
      expect(result.rank).toBe(HandRank.StraightFlush);
      expect(result.label).toBe("Nine-high Straight Flush");
    });

    it("detects Straight Flush — wheel flush (A-2-3-4-5 same suit)", () => {
      const result = evaluateHand(
        [c(14, "clubs"), c(2, "clubs")],
        [c(3, "clubs"), c(4, "clubs"), c(5, "clubs"), c(13, "hearts"), c(12, "diamonds")]
      );
      expect(result.rank).toBe(HandRank.StraightFlush);
      expect(result.label).toBe("Five-high Straight Flush");
    });

    it("detects Four of a Kind (Kings)", () => {
      const result = evaluateHand(
        [c(13, "spades"), c(13, "hearts")],
        [c(13, "diamonds"), c(13, "clubs"), c(9, "spades"), c(2, "diamonds"), c(7, "hearts")]
      );
      expect(result.rank).toBe(HandRank.FourOfAKind);
      expect(result.label).toBe("Four Kings");
    });

    it("detects Full House — Jacks full of Eights", () => {
      const result = evaluateHand(
        [c(11, "spades"), c(11, "hearts")],
        [c(11, "diamonds"), c(8, "spades"), c(8, "hearts"), c(2, "clubs"), c(3, "diamonds")]
      );
      expect(result.rank).toBe(HandRank.FullHouse);
      expect(result.label).toBe("Jacks full of Eights");
    });

    it("detects Flush (Ace-high)", () => {
      const result = evaluateHand(
        [c(14, "diamonds"), c(9, "diamonds")],
        [c(7, "diamonds"), c(4, "diamonds"), c(2, "diamonds"), c(13, "spades"), c(8, "clubs")]
      );
      expect(result.rank).toBe(HandRank.Flush);
      expect(result.label).toBe("Ace-high Flush");
    });

    it("detects Straight — normal (Ten-high)", () => {
      const result = evaluateHand(
        [c(10, "spades"), c(9, "hearts")],
        [c(8, "diamonds"), c(7, "clubs"), c(6, "spades"), c(14, "hearts"), c(13, "diamonds")]
      );
      expect(result.rank).toBe(HandRank.Straight);
      expect(result.label).toBe("Ten-high Straight");
    });

    it("detects Straight — ace-low wheel (A-2-3-4-5)", () => {
      const result = evaluateHand(
        [c(14, "spades"), c(2, "hearts")],
        [c(3, "diamonds"), c(4, "clubs"), c(5, "spades"), c(13, "hearts"), c(12, "diamonds")]
      );
      expect(result.rank).toBe(HandRank.Straight);
      expect(result.label).toBe("Five-high Straight");
    });

    it("detects Three of a Kind (Queens)", () => {
      const result = evaluateHand(
        [c(12, "spades"), c(12, "hearts")],
        [c(12, "diamonds"), c(9, "spades"), c(5, "hearts"), c(2, "clubs"), c(3, "diamonds")]
      );
      expect(result.rank).toBe(HandRank.ThreeOfAKind);
      expect(result.label).toBe("Three Queens");
    });

    it("detects Two Pair — Kings and Jacks", () => {
      const result = evaluateHand(
        [c(13, "spades"), c(13, "hearts")],
        [c(11, "diamonds"), c(11, "clubs"), c(9, "spades"), c(2, "diamonds"), c(7, "hearts")]
      );
      expect(result.rank).toBe(HandRank.TwoPair);
      expect(result.label).toBe("Kings and Jacks");
    });

    it("detects One Pair — Aces", () => {
      const result = evaluateHand(
        [c(14, "spades"), c(14, "hearts")],
        [c(9, "diamonds"), c(6, "clubs"), c(3, "spades"), c(2, "diamonds"), c(7, "hearts")]
      );
      expect(result.rank).toBe(HandRank.OnePair);
      expect(result.label).toBe("Pair of Aces");
    });

    it("detects High Card — Ace High", () => {
      const result = evaluateHand(
        [c(14, "spades"), c(11, "hearts")],
        [c(9, "diamonds"), c(6, "clubs"), c(3, "spades"), c(2, "diamonds"), c(7, "hearts")]
      );
      expect(result.rank).toBe(HandRank.HighCard);
      expect(result.label).toBe("Ace High");
    });

    it("picks best hand from 7 cards — Kings full of Aces (not Aces full)", () => {
      // Three Kings + two Aces → best 5-card hand is Kings full of Aces
      const result = evaluateHand(
        [c(14, "spades"), c(14, "hearts")],
        [c(13, "diamonds"), c(13, "clubs"), c(13, "spades"), c(2, "diamonds"), c(7, "hearts")]
      );
      expect(result.rank).toBe(HandRank.FullHouse);
      expect(result.label).toBe("Kings full of Aces");
    });
  });

  // ── 3b. Kicker tie-breaking ──────────────────────────────────────────────
  describe("evaluateHand — kicker tie-breaking", () => {
    it("higher pair wins", () => {
      const community = [c(9, "diamonds"), c(6, "clubs"), c(3, "spades"), c(2, "diamonds"), c(7, "hearts")];
      const handA = evaluateHand([c(14, "spades"), c(14, "hearts")], community); // Pair of Aces
      const handB = evaluateHand([c(13, "spades"), c(13, "hearts")], community); // Pair of Kings
      expect(compareHands(handA, handB)).toBeGreaterThan(0);
    });

    it("same pair, higher kicker wins", () => {
      const community = [c(6, "clubs"), c(3, "spades"), c(2, "diamonds"), c(7, "hearts")];
      const handA = evaluateHand(
        [c(12, "spades"), c(12, "hearts")],
        [c(14, "diamonds"), ...community]  // Pair of Queens, A kicker
      );
      const handB = evaluateHand(
        [c(12, "diamonds"), c(12, "clubs")],
        [c(13, "diamonds"), ...community]  // Pair of Queens, K kicker
      );
      expect(compareHands(handA, handB)).toBeGreaterThan(0);
    });

    it("full house — trips rank beats pair rank", () => {
      const community = [c(14, "spades"), c(14, "hearts"), c(2, "clubs"), c(3, "diamonds")];
      const handA = evaluateHand(
        [c(13, "spades"), c(13, "hearts")],
        [c(13, "diamonds"), ...community]  // Kings full of Aces
      );
      const handB = evaluateHand(
        [c(12, "spades"), c(12, "hearts")],
        [c(12, "diamonds"), ...community]  // Queens full of Aces
      );
      expect(compareHands(handA, handB)).toBeGreaterThan(0);
    });

    it("true tie — identical ranks and kickers return 0", () => {
      const community = [c(12, "diamonds"), c(11, "clubs"), c(10, "spades"), c(2, "hearts"), c(3, "diamonds")];
      const handA = evaluateHand([c(14, "spades"), c(13, "spades")], community); // A-high straight
      const handB = evaluateHand([c(14, "hearts"), c(13, "hearts")], community); // A-high straight
      expect(compareHands(handA, handB)).toBe(0);
    });

    it("straight flush beats four of a kind", () => {
      const handA = evaluateHand(
        [c(9, "spades"), c(8, "spades")],
        [c(7, "spades"), c(6, "spades"), c(5, "spades"), c(14, "hearts"), c(2, "diamonds")]
      ); // Straight Flush
      const handB = evaluateHand(
        [c(14, "spades"), c(14, "hearts")],
        [c(14, "diamonds"), c(14, "clubs"), c(13, "spades"), c(2, "diamonds"), c(7, "hearts")]
      ); // Four Aces
      expect(compareHands(handA, handB)).toBeGreaterThan(0);
    });

    it("ace-low straight (wheel) loses to 6-high straight", () => {
      const community = [c(3, "diamonds"), c(4, "clubs"), c(5, "spades"), c(13, "hearts"), c(12, "diamonds")];
      const handA = evaluateHand([c(14, "spades"), c(2, "hearts")], community); // Five-high (wheel)
      const handB = evaluateHand([c(6, "spades"), c(2, "hearts")], community); // Six-high straight
      expect(compareHands(handA, handB)).toBeLessThan(0);
    });
  });

  // ── 3c. Flop only (5 cards) ──────────────────────────────────────────────
  describe("evaluateHand — flop only (5 cards)", () => {
    it("works with exactly 5 cards (C(5,5) = 1 combination)", () => {
      const result = evaluateHand(
        [c(14, "spades"), c(13, "spades")],
        [c(12, "spades"), c(11, "spades"), c(10, "spades")]
      );
      expect(result.rank).toBe(HandRank.RoyalFlush);
    });
  });
});
