"use client";

// ─── Props ──────────────────────────────────────────────────
interface CoachPanelProps {
  /** The tutorial message to display to the player. */
  message: string;
}

// ─── Component ──────────────────────────────────────────────
/**
 * A persistent panel that displays the tutorial coach's message.
 *
 * Styled as a speech-bubble / coach card — always visible so the
 * player can reference the guidance at any time. Sits below the
 * main table area or alongside it on wide screens.
 */
export default function CoachPanel({
  message,
}: CoachPanelProps): JSX.Element {
  // Don't render anything if there's no message yet.
  if (!message) {
    return <></>;
  }

  return (
    <div
      className="
        relative
        bg-emerald-900/80 backdrop-blur-sm
        border border-emerald-600/40
        rounded-xl
        px-5 py-4
        max-w-xl
        shadow-lg
      "
    >
      {/* ── Coach label ── */}
      <div className="flex items-center gap-2 mb-2">
        {/* Small icon — a graduation cap emoji as a lightweight "coach" icon */}
        <span className="text-lg">🎓</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
          Coach
        </span>
      </div>

      {/* ── Tutorial message ── */}
      <p className="text-sm leading-relaxed text-emerald-50">
        {message}
      </p>

      {/* ── Speech-bubble tail (decorative) ── */}
      {/* A small CSS triangle pointing upward, connecting the panel to the table */}
      <div
        className="
          absolute -top-2 left-8
          w-4 h-4
          bg-emerald-900/80
          border-l border-t border-emerald-600/40
          rotate-45
        "
      />
    </div>
  );
}
