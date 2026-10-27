"use client";

import React, { useState, useEffect, useRef } from "react";
import katex from "katex";
import { X, ExternalLink } from "lucide-react";

interface TangentData {
  tag?: string;
  category?: string;
  title?: string;
  term?: string;
  body?: string;
  definition?: string;
  equation?: string;
}

interface PopoverState {
  key: string;
  data: TangentData;
  pinned: boolean;
  top: number;
  left: number;
  placeAbove: boolean;
}

export function TangentPopoverHandler({
  tangents = {},
  children,
}: {
  tangents?: Record<string, TangentData>;
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);

  // Position and display popover relative to target element
  const showPopover = (el: HTMLElement, key: string, pin: boolean) => {
    const rawData = tangents[key];
    if (!rawData) return;

    const rect = el.getBoundingClientRect();
    const GAP = 10;
    const POPOVER_WIDTH = 340;
    const POPOVER_EST_HEIGHT = 220;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const placeAbove = spaceBelow < POPOVER_EST_HEIGHT && spaceAbove > spaceBelow;

    // Center horizontally on target element, clamped to viewport bounds
    const elementCenter = rect.left + rect.width / 2;
    let left = elementCenter - POPOVER_WIDTH / 2;
    const maxLeft = window.innerWidth - POPOVER_WIDTH - 16;
    if (left < 16) left = 16;
    if (left > maxLeft) left = maxLeft;

    let top = 0;
    if (placeAbove) {
      top = rect.top - GAP;
    } else {
      top = rect.bottom + GAP;
    }

    setPopover({
      key,
      data: rawData,
      pinned: pin,
      top,
      left,
      placeAbove,
    });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const terms = container.querySelectorAll<HTMLElement>(".tangent-term");

    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.currentTarget as HTMLElement;
      const key = target.getAttribute("data-tangent");
      if (key && !popover?.pinned) {
        showPopover(target, key, false);
      }
    };

    const handleMouseLeave = () => {
      setPopover((prev) => (prev && !prev.pinned ? null : prev));
    };

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      const key = target.getAttribute("data-tangent");
      if (!key) return;

      if (popover && popover.key === key && popover.pinned) {
        setPopover(null);
      } else {
        showPopover(target, key, true);
      }
    };

    terms.forEach((el) => {
      el.addEventListener("mouseenter", handleMouseEnter);
      el.addEventListener("mouseleave", handleMouseLeave);
      el.addEventListener("click", handleClick);
    });

    return () => {
      terms.forEach((el) => {
        el.removeEventListener("mouseenter", handleMouseEnter);
        el.removeEventListener("mouseleave", handleMouseLeave);
        el.removeEventListener("click", handleClick);
      });
    };
  }, [tangents, popover?.pinned]);

  // Click outside listener to dismiss pinned popovers
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (
        popover &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest(".tangent-term")
      ) {
        setPopover(null);
      }
    };

    if (popover) {
      document.addEventListener("click", handleDocumentClick);
    }
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [popover]);

  // Render KaTeX formulas inside popover content
  const renderPopoverContent = (rawText: string) => {
    if (!rawText) return "";
    let html = rawText.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
      try {
        return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false });
      } catch {
        return tex;
      }
    });

    html = html.replace(/(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, (_, tex) => {
      try {
        return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
      } catch {
        return tex;
      }
    });

    return html;
  };

  return (
    <div ref={containerRef} className="relative">
      {children}

      {popover && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-modal="false"
          style={{
            position: "fixed",
            left: `${popover.left}px`,
            top: popover.placeAbove ? "auto" : `${popover.top}px`,
            bottom: popover.placeAbove ? `${window.innerHeight - popover.top}px` : "auto",
            width: "min(340px, calc(100vw - 32px))",
            maxHeight: "380px",
          }}
          className="z-50 rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-xl p-4 font-mono text-xs text-[var(--text)] shadow-2xl overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-2 gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] truncate">
              {popover.data.tag || popover.data.category || "ENGINEERING PRINCIPLE"}
            </span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {popover.pinned && (
                <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                  PINNED
                </span>
              )}
              <button
                type="button"
                onClick={() => setPopover(null)}
                className="p-1 rounded text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--card-inner)] transition-colors"
                aria-label="Close tangent popover"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Title */}
          <h4 className="font-mono text-xs font-bold text-[var(--text)] mb-2">
            {popover.data.title || popover.data.term || popover.key.replace(/_/g, " ").toUpperCase()}
          </h4>

          {/* Body */}
          <div
            className="text-[11.5px] leading-relaxed text-[var(--muted)] font-sans space-y-2 [&_p]:mb-2 [&_.modal-equation-box]:my-2 [&_.modal-equation-box]:p-2 [&_.modal-equation-box]:rounded [&_.modal-equation-box]:bg-[var(--card-inner)] [&_.modal-equation-box]:border [&_.modal-equation-box]:border-[var(--border)] [&_.math-label]:text-[10px] [&_.math-label]:font-mono [&_.math-label]:text-[var(--accent)] [&_.math-meta]:text-[10px] [&_.math-meta]:text-[var(--muted)]"
            dangerouslySetInnerHTML={{
              __html: renderPopoverContent(popover.data.body || popover.data.definition || ""),
            }}
          />

          {/* Equation (if separately provided) */}
          {popover.data.equation && (
            <div
              className="mt-2.5 rounded bg-[var(--card-inner)] border border-[var(--border)] p-2 text-center overflow-x-auto text-amber-300 font-mono text-[11px]"
              dangerouslySetInnerHTML={{
                __html: renderPopoverContent(`$$${popover.data.equation}$$`),
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
