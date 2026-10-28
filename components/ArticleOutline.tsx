"use client";

import React, { useEffect, useState, useRef } from "react";

interface SectionItem {
  id: string;
  num: string;
  title: string;
}

export function ArticleOutline({ children }: { children: React.ReactNode }) {
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;

    const collected: SectionItem[] = [];
    const container = contentRef.current;

    // Search for section header wraps first, or standalone h2s
    const wraps = container.querySelectorAll(".section-header-wrap");

    if (wraps.length > 0) {
      wraps.forEach((wrap, idx) => {
        let id = wrap.id;
        const h2 = wrap.querySelector("h2");
        if (!id && h2?.id) id = h2.id;
        if (!id) {
          id = `section-${idx + 1}`;
          wrap.id = id;
        }

        const kickerEl = wrap.querySelector(".section-kicker");
        const kickerText = kickerEl?.textContent || "";
        const numMatch = kickerText.match(/\d+/);
        const num = numMatch ? `${numMatch[0]}.` : `${idx + 1}.`;

        const title = h2?.textContent?.trim() || `Section ${idx + 1}`;

        collected.push({ id, num, title });
      });
    } else {
      const h2s = container.querySelectorAll("h2");
      h2s.forEach((h2, idx) => {
        let id = h2.id;
        if (!id) {
          id = `section-${idx + 1}`;
          h2.id = id;
        }

        const text = h2.textContent?.trim() || "";
        const match = text.match(/^(?:Section\s+)?(\d+)[\.:]\s*(.+)$/i);
        const num = match ? `${match[1]}.` : `${idx + 1}.`;
        const title = match ? match[2].trim() : text;

        collected.push({ id, num, title });
      });
    }

    setSections(collected);
    if (collected.length > 0) {
      setActiveId(collected[0].id);
    }
  }, []);

  // ScrollSpy: real-time active section tracking
  useEffect(() => {
    if (sections.length === 0) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollPos = window.scrollY + 120; // 120px threshold below header
          let currentId = sections[0].id;

          for (const sec of sections) {
            const el = document.getElementById(sec.id);
            if (el && el.offsetTop <= scrollPos) {
              currentId = sec.id;
            }
          }

          setActiveId(currentId);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const offset = 76; // Compensates for sticky top header (56px) + margin
    const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top, behavior: "smooth" });
    try {
      history.pushState(null, "", `#${id}`);
    } catch {}
  };

  if (sections.length < 2) {
    return <div ref={contentRef}>{children}</div>;
  }

  return (
    <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-8 xl:gap-12 items-start">
      {/* Desktop Left Sidebar: Sticky Overview Navigation Outline */}
      <aside className="hidden lg:block sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 pb-8 select-none scrollbar-thin">
        <div className="text-[11px] font-mono font-bold tracking-widest text-[var(--muted)] uppercase mb-3 px-3 flex items-center justify-between">
          <span>OVERVIEW</span>
          <span className="text-[10px] text-[var(--accent)] font-semibold">
            {sections.length} SECTIONS
          </span>
        </div>
        <nav className="border-l-2 border-[var(--border)] pl-3 space-y-1">
          {sections.map((sec, idx) => {
            const isActive = activeId === sec.id;
            return (
              <button
                key={sec.id || idx}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                className={`w-full text-left py-1.5 px-2.5 text-xs font-mono transition-all rounded-r block leading-snug group ${
                  isActive
                    ? "text-[var(--accent)] font-bold border-l-2 border-[var(--accent)] -ml-[14px] pl-2.5 bg-[var(--accent)]/10 shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]"
                }`}
                title={sec.title}
              >
                <div className="flex items-start gap-1.5">
                  <span
                    className={`font-bold shrink-0 ${
                      isActive ? "text-[var(--accent)]" : "text-[var(--muted)] group-hover:text-[var(--text)]"
                    }`}
                  >
                    {sec.num}
                  </span>
                  <span className="line-clamp-2">{sec.title}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Column */}
      <div className="min-w-0" ref={contentRef}>
        {/* Mobile Horizontal Section Navigator Pill Bar (Screen < lg) */}
        <div className="lg:hidden mb-6 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-mono">
          <div className="text-[10px] uppercase font-bold text-[var(--muted)] mb-2 flex items-center justify-between">
            <span>OVERVIEW OUTLINE</span>
            <span className="text-[var(--accent)]">{sections.length} SECTIONS</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {sections.map((sec, idx) => {
              const isActive = activeId === sec.id;
              const shortTitle = sec.title.split(/[:—]/)[0].trim();
              return (
                <button
                  key={sec.id || idx}
                  type="button"
                  onClick={() => scrollToSection(sec.id)}
                  className={`shrink-0 px-2.5 py-1 rounded-full border text-[11px] font-mono transition-all ${
                    isActive
                      ? "bg-[var(--accent)] text-white border-[var(--accent)] font-bold shadow-sm"
                      : "border-[var(--border)] bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  <span className="opacity-80 mr-1">{sec.num}</span>
                  <span>{shortTitle}</span>
                </button>
              );
            })}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
