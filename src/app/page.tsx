"use client";

import { useEffect } from "react";
import { usePokerStore } from "../store/usePokerStore";
import PokerTable from "../components/PokerTable";

// ─── Home Page ──────────────────────────────────────────────
// The main (and only) page of the app.
// On mount, it initializes the game so the player immediately sees
// their first hand. Then it renders the PokerTable component,
// which handles all the game UI.

export default function Home(): JSX.Element {
  // Pull the initializeGame action from the store.
  const initializeGame = usePokerStore((state) => state.initializeGame);

  // Start the first hand as soon as the component mounts.
  // The empty dependency array [] means this runs exactly once.
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <PokerTable />
    </main>
  );
}
