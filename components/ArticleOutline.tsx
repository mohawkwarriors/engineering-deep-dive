"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";

export interface SubSectionItem {
  id: string;
  title: string;
}

export interface SectionItem {
  id: string;
  num: string;
  title: string;
  subsections?: SubSectionItem[];
}

interface TrackedHeading {
  id: string;
  isSub: boolean;
  parentSecId: string;
}

export interface ArticleOutlineProps {
  header?: React.ReactNode;
  children: React.ReactNode;
}

export function ArticleOutline({ header, children }: ArticleOutlineProps) {
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);
  const trackedHeadingsRef = useRef<TrackedHeading[]>([]);

  // DOM heading extraction: scans both sections (h2 / .section-header-wrap) and subsections (h3)
  useEffect(() => {
    if (!contentRef.current) return;

    const container = contentRef.current;
    const collected: SectionItem[] = [];
    const tracked: TrackedHeading[] = [];

    // Query in document order: section wrappers, standalone h2s, and h3 subsections
    const rawElements = Array.from(
      container.querySelectorAll<HTMLElement>(".section-header-wrap, h2, h3")
    );

    // Filter out h2 elements that are already nested within a .section-header-wrap
    const elements = rawElements.filter((el) => {
      if (el.tagName === "H2" && el.closest(".section-header-wrap")) {
        return false;
      }
      return true;
    });

    let currentSection: SectionItem | null = null;
    let h3Counter = 0;

    elements.forEach((el) => {
      const isSub = el.tagName === "H3";

      if (!isSub) {
        // --- TOP-LEVEL SECTION (h2 or .section-header-wrap) ---
        let id = el.id;
        const innerH2 = el.querySelector("h2");
        if (!id && innerH2?.id) id = innerH2.id;
        if (!id) {
          id = `section-${collected.length + 1}`;
          el.id = id;
        }

        // Extract section kicker / number
        const kickerEl = el.querySelector(".section-kicker");
        const kickerText = kickerEl?.textContent || "";
        const numMatch = kickerText.match(/\d+/);

        const rawText = (innerH2?.textContent || el.textContent || "").trim();
        const headerNumMatch = rawText.match(/^(?:Section\s+)?(\d+)[\.:]\s*(.+)$/i);

        let num = `${String(collected.length + 1).padStart(2, "0")}.`;
        if (numMatch) {
          num = `${String(parseInt(numMatch[0], 10)).padStart(2, "0")}.`;
        } else if (headerNumMatch) {
          num = `${String(parseInt(headerNumMatch[1], 10)).padStart(2, "0")}.`;
        }

        let title = innerH2?.textContent?.trim() || rawText;
        if (headerNumMatch) {
          title = headerNumMatch[2].trim();
        } else {
          title = title.replace(/^(?:Section\s+)?\d+[\.:]\s*/i, "").trim();
        }

        currentSection = {
          id,
          num,
          title: title || `Section ${collected.length + 1}`,
          subsections: [],
        };
        collected.push(currentSection);
        tracked.push({ id, isSub: false, parentSecId: id });
      } else {
        // --- SUBSECTION (h3) ---
        let id = el.id;
        if (!id) {
          h3Counter++;
          id = `sub-${currentSection ? currentSection.id : "h3"}-${h3Counter}`;
          el.id = id;
        }

        // Clean title: clone to safely strip price tags and monetary symbols
        const clone = el.cloneNode(true) as HTMLElement;
        clone.querySelectorAll(".price-tag").forEach((p) => p.remove());
        let cleanText = clone.textContent || "";
        cleanText = cleanText
          .replace(/[–—]\s*[$§]\s*[\d,]+(?:\.\d+)?/g, "")
          .replace(/[$§]\s*[\d,]+(?:\.\d+)?/g, "")
          .replace(/\s+/g, " ")
          .trim();

        const subTitle = cleanText || `Subsection ${h3Counter}`;

        if (!currentSection) {
          currentSection = {
            id: `section-0`,
            num: "01.",
            title: "Overview",
            subsections: [],
          };
          collected.push(currentSection);
          tracked.push({ id: currentSection.id, isSub: false, parentSecId: currentSection.id });
        }

        currentSection.subsections = currentSection.subsections || [];
        currentSection.subsections.push({
          id,
          title: subTitle,
        });

        tracked.push({ id, isSub: true, parentSecId: currentSection.id });
      }
    });

    trackedHeadingsRef.current = tracked;
    setSections(collected);

    if (collected.length > 0) {
      setActiveId(collected[0].id);
      setActiveSectionId(collected[0].id);
    }
  }, []);

  // ScrollSpy: real-time active section and subsection tracking
  useEffect(() => {
    if (sections.length === 0) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollPos = window.scrollY + 120; // 120px threshold below sticky header
          const tracked = trackedHeadingsRef.current;
          if (tracked.length === 0) return;

          let currentActive = tracked[0];

          for (const item of tracked) {
            const el = document.getElementById(item.id);
            if (el && el.offsetTop <= scrollPos) {
              currentActive = item;
            }
          }

          if (currentActive) {
            setActiveId(currentActive.id);
            setActiveSectionId(currentActive.parentSecId);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  const scrollToHeading = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const offset = 76; // Compensates for sticky top header (56px) + margin
    const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top, behavior: "smooth" });
    try {
      history.pushState(null, "", `#${id}`);
    } catch {}
  }, []);

  const activeSection = sections.find((s) => s.id === activeSectionId) || sections[0];

  return (
    <div className="w-full">
      {/* 
        3-Column Editorial Grid:
        - Column 1 (Left Margin): Contains the sticky Overview TOC outside the article margins.
        - Column 2 (Center Column): The perfectly centered article (Title, Subtitle, and Body).
        - Column 3 (Right Margin): Symmetrical spacer guaranteeing the Center Column remains centered.
      */}
      <div className="xl:grid xl:grid-cols-[1fr_min(768px,100%)_1fr] items-start w-full">
        {/* Left Column: Left Margin containing Desktop Sticky Overview */}
        <div className="hidden xl:block justify-self-end w-60 pr-8">
          <aside className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pb-8 select-none scrollbar-thin">
            <div className="text-[11px] font-mono font-bold tracking-widest text-[var(--muted)] uppercase mb-3 px-2 flex items-center justify-between">
              <span>OVERVIEW</span>
              <span className="text-[10px] text-[var(--accent)] font-semibold">
                {sections.length} SECTIONS
              </span>
            </div>

            <nav className="border-l-2 border-[var(--border)] pl-2.5 space-y-1">
              {sections.map((sec, idx) => {
                const isSecActive = activeSectionId === sec.id;
                const isDirectActive = activeId === sec.id;
                const hasSubsections = sec.subsections && sec.subsections.length > 0;

                return (
                  <div key={sec.id || idx} className="space-y-0.5">
                    {/* Primary Section Button */}
                    <button
                      type="button"
                      onClick={() => scrollToHeading(sec.id)}
                      className={`w-full text-left py-1.5 px-2 text-xs font-mono transition-all rounded-r block leading-snug group ${
                        isDirectActive || (isSecActive && !hasSubsections)
                          ? "text-[var(--accent)] font-bold border-l-2 border-[var(--accent)] -ml-[12px] pl-2 bg-[var(--accent)]/10 shadow-sm"
                          : isSecActive
                          ? "text-[var(--accent)] font-semibold"
                          : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]"
                      }`}
                      title={sec.title}
                    >
                      <div className="flex items-start gap-1.5">
                        <span
                          className={`font-bold shrink-0 ${
                            isSecActive
                              ? "text-[var(--accent)]"
                              : "text-[var(--muted)] group-hover:text-[var(--text)]"
                          }`}
                        >
                          {sec.num}
                        </span>
                        <span className="line-clamp-2">{sec.title}</span>
                      </div>
                    </button>

                    {/* Subsections List (e.g. Individual product teardowns in Section 3) */}
                    {hasSubsections && (
                      <div className="ml-3 pl-2 border-l border-dashed border-[var(--border)] space-y-0.5 py-0.5 my-0.5">
                        {sec.subsections!.map((sub) => {
                          const isSubActive = activeId === sub.id;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => scrollToHeading(sub.id)}
                              className={`w-full text-left py-1 px-1.5 text-[11px] font-mono transition-all rounded block leading-tight truncate ${
                                isSubActive
                                  ? "text-[var(--accent)] font-semibold border-l-2 border-[var(--accent)] -ml-[10px] pl-[8px] bg-[var(--accent)]/10"
                                  : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]"
                              }`}
                              title={sub.title}
                            >
                              {sub.title}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>
        </div>

        {/* Center Column: The Centered Article (Title, Subtitle, and Body) */}
        <div className="min-w-0 w-full max-w-3xl mx-auto" ref={contentRef}>
          {header}

          {/* Mobile/Tablet Horizontal Section Navigator Pill Bar (Screen < xl) */}
          {sections.length > 1 && (
            <div className="xl:hidden mb-8 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-mono">
              <div className="text-[10px] uppercase font-bold text-[var(--muted)] mb-2 flex items-center justify-between">
                <span>OVERVIEW OUTLINE</span>
                <span className="text-[var(--accent)]">{sections.length} SECTIONS</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {sections.map((sec, idx) => {
                  const isSecActive = activeSectionId === sec.id;
                  const shortTitle = sec.title.split(/[:—]/)[0].trim();
                  return (
                    <button
                      key={sec.id || idx}
                      type="button"
                      onClick={() => scrollToHeading(sec.id)}
                      className={`shrink-0 px-2.5 py-1 rounded-full border text-[11px] font-mono transition-all ${
                        isSecActive
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

              {/* Mobile Subsections Pill Row if the active section contains subsections */}
              {activeSection?.subsections && activeSection.subsections.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-[var(--border)]/70 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
                  <span className="text-[10px] font-bold text-[var(--muted)] uppercase shrink-0 py-0.5 mr-1">
                    SUBTOPICS:
                  </span>
                  {activeSection.subsections.map((sub) => {
                    const isSubActive = activeId === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => scrollToHeading(sub.id)}
                        className={`shrink-0 px-2 py-0.5 rounded-full border text-[10.5px] font-mono transition-all ${
                          isSubActive
                            ? "bg-[var(--accent)]/20 text-[var(--accent)] border-[var(--accent)] font-semibold"
                            : "border-[var(--border)] bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--text)]"
                        }`}
                      >
                        {sub.title}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {children}
        </div>

        {/* Right Column: Symmetrical spacer to guarantee Center Column is mathematically centered */}
        <div className="hidden xl:block w-60 pl-8 pointer-events-none" aria-hidden="true" />
      </div>
    </div>
  );
}
