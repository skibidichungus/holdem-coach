import { describe, it, expect } from "vitest";
import {
  getSmallBlindForHand,
  STARTING_SMALL_BLIND,
  HANDS_PER_BLIND_LEVEL,
} from "./blinds";

// ═══════════════════════════════════════════════════════════════
//  getSmallBlindForHand
// ═══════════════════════════════════════════════════════════════

describe("getSmallBlindForHand", () => {
  it("exports the expected starting constants", () => {
    expect(STARTING_SMALL_BLIND).toBe(10);
    expect(HANDS_PER_BLIND_LEVEL).toBe(5);
  });

  // ── Level 0: hands 1–5 → SB = 10 ──────────────────────────────
  it("returns 10 for hand 1 (level 0, first hand)", () => {
    expect(getSmallBlindForHand(1)).toBe(10);
  });

  it("returns 10 for hand 5 (level 0, last hand of first level)", () => {
    expect(getSmallBlindForHand(5)).toBe(10);
  });

  // ── Level 1: hands 6–10 → SB = 20 ─────────────────────────────
  it("returns 20 for hand 6 (level 1, first escalation)", () => {
    expect(getSmallBlindForHand(6)).toBe(20);
  });

  it("returns 20 for hand 10 (level 1, last hand)", () => {
    expect(getSmallBlindForHand(10)).toBe(20);
  });

  // ── Level 2: hands 11–15 → SB = 40 ────────────────────────────
  it("returns 40 for hand 11 (level 2)", () => {
    expect(getSmallBlindForHand(11)).toBe(40);
  });

  // ── Level 3: hands 16–20 → SB = 80 ────────────────────────────
  it("returns 80 for hand 16 (level 3)", () => {
    expect(getSmallBlindForHand(16)).toBe(80);
  });

  // ── Additional boundary checks ─────────────────────────────────
  it("returns 160 for hand 21 (level 4)", () => {
    expect(getSmallBlindForHand(21)).toBe(160);
  });

  it("keeps doubling correctly at level 5 (hand 26)", () => {
    expect(getSmallBlindForHand(26)).toBe(320);
  });
});
