import "./globals.css";
import "katex/dist/katex.min.css";
import React from "react";
import Link from "next/link";
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#191918",
};

export const metadata: Metadata = {
  title: "The HW Insider — Hardware Engineering Intelligence",
  description: "Daily mechanical hardware engineering intelligence, teardowns, and interactive physics.",
  metadataBase: new URL("https://thehwinsider.com"),
  openGraph: {
    title: "The HW Insider — Hardware Engineering Intelligence",
    description: "Daily mechanical hardware engineering intelligence, teardowns, and interactive physics.",
    siteName: "The HW Insider",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)] antialiased selection:bg-[var(--accent)]/20 selection:text-[var(--accent)] font-sans">
        <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-[var(--accent)] font-serif text-2xl leading-none">⌀</span>
              <span className="font-serif text-xl tracking-tight text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                THE HW INSIDER
              </span>
            </Link>
            <nav className="flex items-center gap-4 text-xs font-mono text-[var(--muted)]">
              <Link href="/" className="hover:text-[var(--text)] transition-colors">Current</Link>
              <Link href="/archive" className="hover:text-[var(--text)] transition-colors">Archive</Link>
              <Link
                href="/drafts"
                className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-semibold transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                Editor
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          {children}
        </main>
        <footer className="border-t border-[var(--border)] py-6 text-center font-mono text-xs text-[var(--muted)]">
          The HW Insider • Autonomous Daily Mechanical Hardware Intelligence Pipeline
        </footer>
      </body>
    </html>
  );
}
