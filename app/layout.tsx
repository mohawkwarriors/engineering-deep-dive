import "./globals.css";
import "katex/dist/katex.min.css";
import React from "react";
import Link from "next/link";
import type { Metadata, Viewport } from "next";
import { ThemeToggle } from "@/components/ThemeToggle";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#191918",
};

export const metadata: Metadata = {
  title: "The HW Insider — Curated Articles for a Curious Engineering Mind",
  description: "Curated articles for a curious engineering mind: deep-dive teardowns, mechanical engineering, and interactive physics.",
  metadataBase: new URL("https://thehwinsider.com"),
  openGraph: {
    title: "The HW Insider — Curated Articles for a Curious Engineering Mind",
    description: "Curated articles for a curious engineering mind: deep-dive teardowns, mechanical engineering, and interactive physics.",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('theme');
                if (stored === 'light' || stored === 'dark') {
                  document.documentElement.setAttribute('data-theme', stored);
                } else {
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              } catch (e) {}
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,500&family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)] antialiased selection:bg-[var(--accent)]/20 selection:text-[var(--accent)] font-sans transition-colors duration-200">
        <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-md transition-colors duration-200">
          <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-[var(--accent)] font-serif text-2xl leading-none">⌀</span>
              <span className="font-serif text-xl tracking-tight text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                THE HW INSIDER
              </span>
            </Link>
            <nav className="flex items-center gap-3 sm:gap-4 text-xs font-mono text-[var(--muted)]">
              <Link href="/" className="hover:text-[var(--text)] transition-colors">Current</Link>
              <Link href="/archive" className="hover:text-[var(--text)] transition-colors">Archive</Link>
              <Link
                href="/drafts"
                className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-semibold transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                Editor
              </Link>
              <div className="pl-1 border-l border-[var(--border)]">
                <ThemeToggle />
              </div>
            </nav>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="border-t border-[var(--border)] py-6 text-center font-mono text-xs text-[var(--muted)]">
          The HW Insider • Curated articles for a curious engineering mind
        </footer>
      </body>
    </html>
  );
}
