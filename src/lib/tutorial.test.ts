import { describe, it, expect } from "vitest";
import { getDrawDetails, getRecommendationRationale } from "./tutorial";
import type { Card } from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function card(rank: number, suit: string): Card {
  return { rank: rank as Card["rank"], suit: suit as Card["suit"] };
}

// ─── getDrawDetails ────────────────────────────────────────────────────────────

describe("getDrawDetails", () => {
  it("detects a flush draw from the flop (9 outs, equity 35)", () => {
    const holeCards: Card[] = [card(2, "hearts"), card(7, "hearts")];
    const communityCards: Card[] = [
      card(9, "hearts"),
      card(5, "hearts"),
      card(3, "spades"),
    ];
    const result = getDrawDetails(holeCards, communityCards, "flop");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("flush");
    expect(result!.outs).toBe(9);
    expect(result!.equity).toBe(36); // 9 * 4 per rule of 4
  });

  it("detects a flush draw from the turn (9 outs, equity 18)", () => {
    const holeCards: Card[] = [card(2, "hearts"), card(7, "hearts")];
    const communityCards: Card[] = [
      card(9, "hearts"),
      card(5, "hearts"),
      card(3, "spades"),
      card(4, "clubs"),
    ];
    const result = getDrawDetails(holeCards, communityCards, "turn");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("flush");
    expect(result!.outs).toBe(9);
    expect(result!.equity).toBe(18); // 9 * 2
  });

  it("detects an open-ended straight draw (8 outs, equity 32 from flop)", () => {
    const holeCards: Card[] = [card(4, "clubs"), card(5, "diamonds")];
    const communityCards: Card[] = [
      card(6, "hearts"),
      card(7, "spades"),
      card(11, "clubs"), // Jack — not part of the straight
    ];
    const result = getDrawDetails(holeCards, communityCards, "flop");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("open-ended-straight");
    expect(result!.outs).toBe(8);
    expect(result!.equity).toBe(32); // 8 * 4
  });

  it("detects a gutshot straight draw (4 outs, equity 16 from flop)", () => {
    // 5-6-7-9 — gap at 8 (run of 3: 5-6-7, then gap to 9 qualifies as gutshot)
    const holeCards: Card[] = [card(5, "clubs"), card(6, "diamonds")];
    const communityCards: Card[] = [
      card(7, "hearts"),
      card(9, "spades"),
      card(2, "clubs"),
    ];
    const result = getDrawDetails(holeCards, communityCards, "flop");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("gutshot");
    expect(result!.outs).toBe(4);
    expect(result!.equity).toBe(16); // 4 * 4
  });

  it("detects an open-ended straight flush draw", () => {
    const holeCards: Card[] = [card(6, "spades"), card(7, "spades")];
    const communityCards: Card[] = [
      card(8, "spades"),
      card(9, "spades"),
      card(2, "hearts"),
    ];
    const result = getDrawDetails(holeCards, communityCards, "flop");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("open-ended-straight-flush");
    expect(result!.outs).toBe(15);
  });

  it("returns null when player already has two pair or better", () => {
    // Player has two pair: 7s and 5s — not drawing to a flush
    const holeCards: Card[] = [card(7, "hearts"), card(5, "hearts")];
    const communityCards: Card[] = [
      card(7, "spades"),
      card(5, "diamonds"),
      card(3, "hearts"),
    ];
    const result = getDrawDetails(holeCards, communityCards, "flop");
    expect(result).toBeNull();
  });

  it("returns null on preflop phase", () => {
    const holeCards: Card[] = [card(2, "hearts"), card(7, "hearts")];
    const result = getDrawDetails(holeCards, [], "preflop");
    expect(result).toBeNull();
  });

  it("returns null on river phase", () => {
    const holeCards: Card[] = [card(2, "hearts"), card(7, "hearts")];
    const communityCards: Card[] = [
      card(9, "hearts"),
      card(5, "hearts"),
      card(3, "spades"),
      card(4, "clubs"),
      card(10, "diamonds"),
    ];
    const result = getDrawDetails(holeCards, communityCards, "river");
    expect(result).toBeNull();
  });

  it("returns null when no draw is present", () => {
    const holeCards: Card[] = [card(2, "clubs"), card(7, "diamonds")];
    const communityCards: Card[] = [
      card(11, "hearts"),
      card(13, "spades"),
      card(5, "clubs"),
    ];
    const result = getDrawDetails(holeCards, communityCards, "flop");
    expect(result).toBeNull();
  });
});

// ─── getRecommendationRationale ───────────────────────────────────────────────

describe("getRecommendationRationale", () => {
  it("preflop Fold with 7-2 offsuit contains 'rarely wins' and 'Seven'", () => {
    const holeCards: Card[] = [card(7, "clubs"), card(2, "diamonds")];
    const result = getRecommendationRationale(
      "preflop",
      holeCards,
      [],
      "fold",
      null
    );
    expect(result).toContain("rarely wins");
    expect(result).toContain("Seven");
  });

  it("preflop Raise with pocket aces contains 'premium' and 'Pocket aces'", () => {
    const holeCards: Card[] = [card(14, "spades"), card(14, "hearts")];
    const result = getRecommendationRationale(
      "preflop",
      holeCards,
      [],
      "raise",
      null
    );
    expect(result).toContain("premium");
    expect(result.toLowerCase()).toContain("pocket aces");
  });

  it("flop Raise with open-ended SF draw mentions equity % and flush", () => {
    // K-Q suited on J-10 of same suit + a non-suit card -> OESF draw
    const holeCards: Card[] = [card(13, "spades"), card(12, "spades")];
    const communityCards: Card[] = [
      card(11, "spades"),
      card(10, "spades"),
      card(4, "diamonds"),
    ];
    const result = getRecommendationRationale(
      "flop",
      holeCards,
      communityCards,
      "raise",
      null
    );
    expect(result).toContain("straight flush");
    expect(result).toMatch(/\d+%/); // contains an equity percentage
  });

  it("flop Fold with small pair and no draw mentions 'easily beaten'", () => {
    const holeCards: Card[] = [card(4, "clubs"), card(4, "diamonds")];
    const communityCards: Card[] = [
      card(4, "hearts"),  // trips, not a small pair situation
      card(11, "spades"),
      card(9, "clubs"),
    ];
    // Use a genuinely small-pair situation without trips
    const holeCards2: Card[] = [card(3, "clubs"), card(8, "diamonds")];
    const communityCards2: Card[] = [
      card(3, "hearts"),
      card(11, "spades"),
      card(9, "clubs"),
    ];
    const result = getRecommendationRationale(
      "flop",
      holeCards2,
      communityCards2,
      "fold",
      null
    );
    expect(result).toContain("easily beaten");
  });

  it("river Raise with top set mentions hand strength", () => {
    // Pocket kings, board has king — trips, should mention hand strength
    const holeCards: Card[] = [card(13, "clubs"), card(13, "diamonds")];
    const communityCards: Card[] = [
      card(13, "hearts"),
      card(5, "spades"),
      card(9, "clubs"),
      card(2, "diamonds"),
      card(7, "hearts"),
    ];
    const result = getRecommendationRationale(
      "river",
      holeCards,
      communityCards,
      "raise",
      null
    );
    expect(result.length).toBeGreaterThan(10);
    expect(result).toMatch(/strongest|three of a kind/i);
  });

  it("null recommendation returns empty string", () => {
    const holeCards: Card[] = [card(14, "spades"), card(13, "hearts")];
    const result = getRecommendationRationale(
      "preflop",
      holeCards,
      [],
      null,
      null
    );
    expect(result).toBe("");
  });
});

// ─── DrawDetails.outsDescription ──────────────────────────────────────────────

describe("getDrawDetails — outsDescription", () => {
  it("flush draw in hearts → outsDescription === \"any heart\"", () => {
    const holeCards: Card[] = [card(2, "hearts"), card(7, "hearts")];
    const communityCards: Card[] = [
      card(9, "hearts"),
      card(5, "hearts"),
      card(3, "spades"),
    ];
    const result = getDrawDetails(holeCards, communityCards, "flop");
    expect(result).not.toBeNull();
    expect(result!.outsDescription).toBe("any heart");
  });

  it("open-ended straight 4-5-6-7 → outsDescription contains '3' and '8'", () => {
    const holeCards: Card[] = [card(4, "clubs"), card(5, "diamonds")];
    const communityCards: Card[] = [
      card(6, "hearts"),
      card(7, "spades"),
      card(11, "clubs"),
    ];
    const result = getDrawDetails(holeCards, communityCards, "flop");
    expect(result).not.toBeNull();
    expect(result!.outsDescription).toContain("three");
    expect(result!.outsDescription).toContain("eight");
  });

  it("gutshot 5-6-7-9 missing 8 → outsDescription === \"a Eight\"", () => {
    const holeCards: Card[] = [card(5, "clubs"), card(6, "diamonds")];
    const communityCards: Card[] = [
      card(7, "hearts"),
      card(9, "spades"),
      card(2, "clubs"),
    ];
    const result = getDrawDetails(holeCards, communityCards, "flop");
    expect(result).not.toBeNull();
    // Spec says "a 8" is acceptable, but our impl uses RANK_NAMES which gives "Eight".
    expect(result!.outsDescription).toBe("a Eight");
  });

  it("overcards A-K on low board → outsDescription contains 'Ace' and 'King'", () => {
    const holeCards: Card[] = [card(14, "spades"), card(13, "hearts")];
    const communityCards: Card[] = [
      card(8, "clubs"),
      card(5, "diamonds"),
      card(2, "spades"),
    ];
    const result = getDrawDetails(holeCards, communityCards, "flop");
    expect(result).not.toBeNull();
    expect(result!.outsDescription).toContain("Ace");
    expect(result!.outsDescription).toContain("King");
  });
});
