"use client";

import { useEffect } from "react";
import { usePokerStore } from "../store/usePokerStore";
import PokerTable from "../components/PokerTable";
import ModeSelector from "../components/ModeSelector";
import HandGuideButton from "../components/HandGuideButton";

export default function Home() {
  const initializeGame = usePokerStore((state) => state.initializeGame);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

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
