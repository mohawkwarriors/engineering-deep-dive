"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const current = (document.documentElement.getAttribute("data-theme") as "dark" | "light") || "dark";
    setTheme(current);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    try {
      localStorage.setItem("theme", nextTheme);
    } catch {}
  };

  if (!mounted) {
    return (
      <div className="w-8 h-8 rounded-full border border-[var(--border)] bg-[var(--surface)] opacity-50" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="w-8 h-8 rounded-full border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--text)] transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-[var(--accent)] transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-[var(--accent)] transition-transform hover:-rotate-12" />
      )}
    </button>
  );
}
