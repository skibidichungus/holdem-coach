"use client";

import { useState } from "react";
import HandRankingsPanel from "./HandRankingsPanel";

// ═══════════════════════════════════════════════════════════════
//  HAND GUIDE BUTTON
// ═══════════════════════════════════════════════════════════════

/**
 * A small toggle button that opens and closes the HandRankingsPanel drawer.
 *
 * Manages its own open/close state internally so it can be dropped anywhere
 * in the layout without requiring the parent to track panel state.
 *
 * The HandRankingsPanel is rendered as a sibling outside the button DOM,
 * using a React portal-like pattern via fragment — the panel is fixed-position
 * so its DOM position doesn't affect layout.
 */
export default function HandGuideButton() {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <>
      {/* ── Toggle button ── */}
      <button
        id="hand-guide-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Close hand rankings guide" : "Open hand rankings guide"}
        aria-expanded={isOpen}
        className="
          flex items-center gap-1.5
          border border-emerald-600/40
          text-emerald-300
          hover:bg-emerald-800/40
          active:bg-emerald-800/60
          rounded-full
          px-4 py-1.5
          text-sm
          font-medium
          transition-colors duration-150
          cursor-pointer
          select-none
        "
      >
        <span className="text-xs font-bold opacity-70">?</span>
        Hand Guide
      </button>

      {/* ── Slide-out panel (rendered outside button, fixed-positioned) ── */}
      <HandRankingsPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
