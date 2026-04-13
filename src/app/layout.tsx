import type { Metadata } from "next";
import "./globals.css";

// ─── Page Metadata ──────────────────────────────────────────
// Next.js uses this export to set the <title> and <meta> tags.
export const metadata: Metadata = {
  title: "Hold'em Tutorial",
  description:
    "A guided Texas Hold'em poker tutorial — learn the basics of poker hands, betting, and strategy step by step.",
};

// ─── Root Layout ────────────────────────────────────────────
// This wraps every page in the app. It provides the <html> and <body>
// tags, imports global styles, and sets the language attribute.

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* 
        The body uses our dark felt-green background from globals.css.
        min-h-screen ensures the background covers the full viewport.
      */}
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
