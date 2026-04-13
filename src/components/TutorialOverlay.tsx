"use client";

// ─── Props ──────────────────────────────────────────────────
interface TutorialOverlayProps {
  /** The tutorial message to display prominently. */
  message: string;
  /** Callback when the player clicks "Continue" to dismiss the overlay. */
  onContinue: () => void;
}

// ─── Component ──────────────────────────────────────────────
/**
 * A semi-transparent overlay that pauses the game in guided mode.
 *
 * Appears whenever `tutorial.awaitingContinue` is true. Shows the
 * tutorial message front-and-center with a large "Continue" button
 * so beginners can read and understand before they need to act.
 *
 * The overlay covers the entire table area — buttons beneath it
 * are not clickable until the player dismisses this overlay.
 */
export default function TutorialOverlay({
  message,
  onContinue,
}: TutorialOverlayProps): JSX.Element {
  return (
    <div
      className="
        absolute inset-0 z-50
        bg-black/60 backdrop-blur-sm
        flex items-center justify-center
        animate-overlay-in
        p-4
      "
      // Prevent clicks from passing through to the table underneath.
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Message card ── */}
      <div
        className="
          bg-emerald-900/95 backdrop-blur-md
          border border-emerald-500/30
          rounded-2xl
          px-8 py-6
          max-w-lg w-full
          shadow-2xl
          text-center
          space-y-5
        "
      >
        {/* Coach icon and label */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl font-bold text-emerald-300">C</span>
          <span className="text-sm font-semibold uppercase tracking-wider text-emerald-300">
            Coach Says...
          </span>
        </div>

        {/* The tutorial message */}
        <p className="text-base leading-relaxed text-emerald-50">
          {message}
        </p>

        {/* Continue button */}
        <button
          id="tutorial-continue-btn"
          onClick={onContinue}
          className="
            px-8 py-3
            bg-emerald-600 hover:bg-emerald-500
            active:bg-emerald-700
            text-white font-semibold
            rounded-lg
            transition-colors duration-150
            shadow-md hover:shadow-lg
            cursor-pointer
          "
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
