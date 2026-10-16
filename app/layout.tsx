import "./globals.css";
import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Engineering Deep Dive",
  description: "Daily mechanical hardware engineering intelligence and teardown archive",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-[#0a0a0b] text-neutral-200 antialiased selection:bg-amber-500/20 selection:text-amber-400">
        <header className="sticky top-0 z-40 border-b border-neutral-800 bg-[#0a0a0b]/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-mono text-sm font-bold tracking-tight text-neutral-100 hover:text-amber-400 transition-colors">
              <span className="text-amber-500 font-serif text-lg">⌀</span>
              ENGINEERING DEEP DIVE
            </Link>
            <nav className="flex items-center gap-4 text-xs font-mono text-neutral-400">
              <Link href="/" className="hover:text-neutral-200 transition-colors">Current</Link>
              <Link href="/archive" className="hover:text-neutral-200 transition-colors">Archive</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
          {children}
        </main>
        <footer className="border-t border-neutral-800/80 py-6 text-center font-mono text-xs text-neutral-500">
          Autonomous Daily Mechanical Hardware Intelligence Pipeline
        </footer>
      </body>
    </html>
  );
}
