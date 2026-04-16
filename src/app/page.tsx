"use client";

import { useEffect } from "react";
import { usePokerStore } from "../store/usePokerStore";
import { getSessionOverMessage } from "../lib/tutorial";
import PokerTable from "../components/PokerTable";
import ModeSelector from "../components/ModeSelector";
import HandGuideButton from "../components/HandGuideButton";

export default function Home() {
  useEffect(() => {
    const state = usePokerStore.getState();

    if (state.sessionOver) {
      // Restored a finished session — regenerate the bust message since
      // tutorial state isn't persisted, then show the session-over screen.
      const message = getSessionOverMessage(state.sessionWinner);
      usePokerStore.setState((s) => ({
        tutorial: {
          ...s.tutorial,
          message,
          recommendedAction: null,
          awaitingContinue: false,
          rationale: null,
          drawDetails: null,
        },
      }));
      return;
    }

    if (state.player.hand.length === 0) {
      // Fresh mount or restored mid-hand — deal a new hand using the
      // session's current chip stacks, button, and blind level.
      state.initializeGame();
    }
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
      {/* Controls row: mode selector + hand guide button */}
      <div className="flex items-center gap-6">
        <ModeSelector />
        <HandGuideButton />
      </div>

      <PokerTable />
    </main>
  );
}
