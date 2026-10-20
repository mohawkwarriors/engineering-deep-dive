"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import katex from "katex";
import {
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Edit2,
  RefreshCw,
  AlertTriangle,
  Layers,
  Sparkles,
  Lock,
} from "lucide-react";
import { ProcessFlow, ProcessStep } from "./ProcessFlow";
import { TechnicalCard } from "./TechnicalCard";

interface ImageCandidate {
  url: string;
  title?: string;
  source?: string;
}

interface DraftFigure {
  id: string;
  placeholder?: string;
  caption?: string;
  source?: string;
  selectedIndex?: number;
  images: ImageCandidate[];
}

interface DraftItem {
  filename: string;
  filePath?: string;
  id?: string;
  title: string;
  subtitle?: string;
  subject?: string;
  category?: string;
  readTime?: string;
  date?: string;
  summary?: string;
  figures?: DraftFigure[];
  body_mdx?: string;
  article_html?: string;
  tangents?: Record<string, any>;
}

function getSubjectClass(subject?: string) {
  const s = (subject || "").toLowerCase();
  if (s.includes("fluid")) return "sub-fluids";
  if (s.includes("thermal")) return "sub-thermal";
  if (s.includes("mechanism")) return "sub-mechanisms";
  if (s.includes("manufactur")) return "sub-manufacturing";
  if (s.includes("material")) return "sub-materials";
  if (s.includes("design")) return "sub-design";
  if (s.includes("electromechanical")) return "sub-electromechanical";
  return "sub-product-dives";
}

export default function DraftViewer({
  initialDrafts,
  initiallyUnlocked = false,
}: {
  initialDrafts: DraftItem[];
  initiallyUnlocked?: boolean;
}) {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(initiallyUnlocked);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  const [drafts, setDrafts] = useState<DraftItem[]>(initialDrafts);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Check client-side authentication and filter locally dismissed drafts
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const keyParam = urlParams.get("key") || urlParams.get("token");
      const storedPin = localStorage.getItem("hw_editor_pin");

      if (keyParam === "deepdive2026" || storedPin === "deepdive2026" || initiallyUnlocked) {
        setIsUnlocked(true);
        localStorage.setItem("hw_editor_pin", "deepdive2026");
      }

      // Filter out drafts that were locally vetoed or approved on this device
      try {
        const locallyVetoed = JSON.parse(localStorage.getItem("hw_vetoed_filenames") || "[]");
        const locallyApproved = JSON.parse(localStorage.getItem("hw_approved_filenames") || "[]");
        const dismissed = new Set([...locallyVetoed, ...locallyApproved]);

        if (dismissed.size > 0) {
          setDrafts((prev) => prev.filter((d) => !dismissed.has(d.filename) && !dismissed.has(d.title)));
        }
      } catch {}
    }
  }, [initiallyUnlocked]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === "deepdive2026") {
      setIsUnlocked(true);
      setPinError(false);
      localStorage.setItem("hw_editor_pin", "deepdive2026");
    } else {
      setPinError(true);
    }
  };

  // Editable title state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");

  // Selected image indices per figure for active draft
  const [selectedImages, setSelectedImages] = useState<Record<number, number>>({});

  // Track failed / 403 image URLs
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const handleImageError = (figIdx: number, currentCandidateIdx: number) => {
    const fig = activeDraft?.figures?.[figIdx];
    if (!fig || !fig.images) return;
    const failedUrl = fig.images[currentCandidateIdx]?.url;
    if (failedUrl) {
      setFailedImages((prev) => ({ ...prev, [failedUrl]: true }));
    }

    // Automatically advance to the next working candidate in the carousel
    const nextIdx = fig.images.findIndex(
      (img, idx) => idx !== currentCandidateIdx && !failedImages[img.url]
    );
    if (nextIdx !== -1) {
      setSelectedImages((prev) => ({
        ...prev,
        [figIdx]: nextIdx,
      }));
    }
  };

  // Veto modal state
  const [showVetoModal, setShowVetoModal] = useState(false);
  const [selectedVetoReason, setSelectedVetoReason] = useState("Off-Topic / Generic");
  const [customCritique, setCustomCritique] = useState("");

  const activeDraft: DraftItem | undefined = drafts[currentIndex];

  useEffect(() => {
    if (activeDraft) {
      setEditedTitle(activeDraft.title || "");
      setIsEditingTitle(false);
      // Initialize selected image indices
      const initialMap: Record<number, number> = {};
      if (activeDraft.figures) {
        activeDraft.figures.forEach((fig, idx) => {
          initialMap[idx] = fig.selectedIndex ?? 0;
        });
      }
      setSelectedImages(initialMap);
    }
  }, [currentIndex, activeDraft]);

  const refreshDrafts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/drafts");
      if (res.ok) {
        const data = await res.json();
        if (data.drafts) {
          try {
            const locallyVetoed = JSON.parse(localStorage.getItem("hw_vetoed_filenames") || "[]");
            const locallyApproved = JSON.parse(localStorage.getItem("hw_approved_filenames") || "[]");
            const dismissed = new Set([...locallyVetoed, ...locallyApproved]);
            setDrafts(data.drafts.filter((d: any) => !dismissed.has(d.filename) && !dismissed.has(d.title)));
          } catch {
            setDrafts(data.drafts);
          }
          setCurrentIndex(0);
        }
      }
    } catch (e) {
      console.error("Failed to refresh drafts", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectImage = (figIdx: number, imgIdx: number) => {
    setSelectedImages((prev) => ({
      ...prev,
      [figIdx]: imgIdx,
    }));
  };

  const handleApprove = async () => {
    if (!activeDraft) return;
    setLoading(true);
    setActionMessage("Publishing issue...");

    try {
      // Prepare finalized figures with selected indices
      const updatedFigures = (activeDraft.figures || []).map((fig, idx) => ({
        ...fig,
        selectedIndex: selectedImages[idx] ?? 0,
      }));

      const res = await fetch("/api/drafts/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: activeDraft.filename,
          title: editedTitle || activeDraft.title,
          figures: updatedFigures,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Approval failed");
      }

      const data = await res.json();
      setActionMessage(`✓ Published as Issue #${data.issueId}!`);

      // Store in localStorage immediately so it never reappears on this device
      try {
        const locallyApproved = JSON.parse(localStorage.getItem("hw_approved_filenames") || "[]");
        locallyApproved.push(activeDraft.filename);
        if (activeDraft.title) locallyApproved.push(activeDraft.title);
        localStorage.setItem("hw_approved_filenames", JSON.stringify(Array.from(new Set(locallyApproved))));
      } catch {}

      // Remove from local list and auto-advance
      setTimeout(() => {
        setDrafts((prev) => prev.filter((_, i) => i !== currentIndex));
        setCurrentIndex((prev) => (prev >= drafts.length - 1 ? Math.max(0, drafts.length - 2) : prev));
        setActionMessage(null);
      }, 700);
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
      setActionMessage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleVeto = async () => {
    if (!activeDraft) return;
    setLoading(true);
    setShowVetoModal(false);
    setActionMessage("Recording veto & pruning queue...");

    try {
      const res = await fetch("/api/drafts/veto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: activeDraft.filename,
          topic: activeDraft.title,
          subject: activeDraft.subject || activeDraft.category || "Mechanisms",
          reason: selectedVetoReason,
          critique: customCritique,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Veto failed");
      }

      setActionMessage("✓ Veto recorded. Auto-advancing...");
      setCustomCritique("");

      // Store in localStorage immediately so it never reappears on this device
      try {
        const locallyVetoed = JSON.parse(localStorage.getItem("hw_vetoed_filenames") || "[]");
        locallyVetoed.push(activeDraft.filename);
        if (activeDraft.title) locallyVetoed.push(activeDraft.title);
        localStorage.setItem("hw_vetoed_filenames", JSON.stringify(Array.from(new Set(locallyVetoed))));
      } catch {}

      // Remove from local list and auto-advance
      setTimeout(() => {
        setDrafts((prev) => prev.filter((_, i) => i !== currentIndex));
        setCurrentIndex((prev) => (prev >= drafts.length - 1 ? Math.max(0, drafts.length - 2) : prev));
        setActionMessage(null);
      }, 700);
    } catch (err: any) {
      alert(`Veto error: ${err.message}`);
      setActionMessage(null);
    } finally {
      setLoading(false);
    }
  };

  // Inline Figure Carousel Component matching published design system
  const renderInlineFigure = (figIdx: number) => {
    if (!activeDraft?.figures || !activeDraft.figures[figIdx]) return null;
    const fig = activeDraft.figures[figIdx];
    const currentSelectedIdx = selectedImages[figIdx] ?? 0;
    const selectedImg = fig.images[currentSelectedIdx] || fig.images[0];
    const isImageBroken = selectedImg?.url && failedImages[selectedImg.url];

    return (
      <figure
        key={`inline-fig-${fig.id || figIdx}`}
        className="product-figure not-prose"
      >
        {/* Figure Card Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--surface-hover)] border-b border-[var(--border)] font-mono text-xs">
          <span className="text-[var(--accent)] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[var(--accent)]" />
            {fig.caption ? fig.caption.split(":")[0] : `FIG ${String(figIdx + 1).padStart(2, "0")}`}
          </span>
          <span className="text-[var(--muted)] text-[11px]">
            Candidate <span className="text-[var(--text)] font-bold">{currentSelectedIdx + 1}</span> of {fig.images.length}
          </span>
        </div>

        {/* Active Selected Image Preview */}
        <div className="img-wrapper">
          {selectedImg?.url ? (
            <img
              src={selectedImg.url}
              alt={selectedImg.title || activeDraft.title}
              referrerPolicy="no-referrer"
              onError={() => handleImageError(figIdx, currentSelectedIdx)}
            />
          ) : (
            <div className="text-xs font-mono text-[var(--muted)]">No image URL specified</div>
          )}

          {isImageBroken && (
            <div className="absolute inset-0 bg-[var(--card-inner)]/95 flex flex-col items-center justify-center p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-[var(--accent)] mb-2" />
              <p className="text-xs font-mono text-[var(--text)]">Image host restricted direct loading (403)</p>
              <p className="text-[11px] font-mono text-[var(--accent)] mt-1">Select an alternative candidate from the carousel below</p>
            </div>
          )}

          <div className="absolute top-3 right-3 px-2 py-1 rounded bg-[var(--surface)]/90 backdrop-blur-md border border-[var(--border)] font-mono text-[10px] text-[var(--accent)] uppercase tracking-wider flex items-center gap-1 shadow">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            Active Selection
          </div>
        </div>

        {/* 12-Image Horizontal Scroll Carousel */}
        <div className="p-3 sm:p-4 bg-[var(--surface)] border-t border-[var(--border)]">
          <div className="text-[11px] font-mono text-[var(--muted)] mb-2.5 flex items-center justify-between">
            <span className="font-semibold text-[var(--text)]">Select figure candidate:</span>
            <span className="text-[var(--muted)] text-[10px]">Swipe horizontally ➔</span>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-[var(--border)] snap-x">
            {fig.images.map((img, imgIdx) => {
              const isSelected = imgIdx === currentSelectedIdx;
              const isFailed = failedImages[img.url];

              return (
                <button
                  key={imgIdx}
                  type="button"
                  onClick={() => handleSelectImage(figIdx, imgIdx)}
                  className={`relative flex-shrink-0 w-28 sm:w-36 h-20 sm:h-24 rounded overflow-hidden border-2 transition-all snap-start ${
                    isSelected
                      ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/40 shadow-lg scale-105 z-10"
                      : "border-[var(--border)] opacity-70 hover:opacity-100 hover:border-[var(--muted)]"
                  } ${isFailed ? "opacity-30 border-red-900" : ""}`}
                >
                  <img
                    src={img.url}
                    alt={img.title || `Candidate ${imgIdx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={() => {
                      setFailedImages((prev) => ({ ...prev, [img.url]: true }));
                    }}
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-[var(--accent)]/20 flex items-center justify-center">
                      <span className="p-1 rounded-full bg-[var(--accent)] text-white shadow">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-[var(--card-inner)]/90 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-mono text-[var(--text)] truncate flex justify-between items-center">
                    <span>#{imgIdx + 1}</span>
                    {isFailed && <span className="text-red-400 text-[8px]">403</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Figcaption & Source Footer */}
        <figcaption>
          <span>{fig.caption || selectedImg?.title || ""}</span>
          <span className="source-tag">
            {fig.source || selectedImg?.source || "TEARDOWN ARCHIVE"}
          </span>
        </figcaption>
      </figure>
    );
  };

  // Inline Formatter for Markdown (Bold, Italic, Code) and KaTeX Inline Math ($...$)
  const renderFormattedText = (text: string): React.ReactNode => {
    if (!text) return null;

    // Matches: $inline math$, **bold**, *italic*, `code`
    const regex = /(\$[^$\n]+\$|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        elements.push(text.substring(lastIndex, match.index));
      }

      const token = match[0];
      const key = `fmt-${match.index}-${elements.length}`;

      if (token.startsWith("$") && token.endsWith("$") && token.length > 2) {
        const tex = token.slice(1, -1);
        try {
          const html = katex.renderToString(tex, {
            displayMode: false,
            throwOnError: false,
          });
          elements.push(
            <span
              key={key}
              className="inline-math px-0.5"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          elements.push(<code key={key} className="font-mono text-amber-400">{token}</code>);
        }
      } else if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
        elements.push(
          <strong key={key} className="font-semibold text-[var(--text)]">
            {renderFormattedText(token.slice(2, -2))}
          </strong>
        );
      } else if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
        elements.push(
          <em key={key} className="italic text-[var(--text)]">
            {renderFormattedText(token.slice(1, -1))}
          </em>
        );
      } else if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
        elements.push(
          <code
            key={key}
            className="px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] font-mono text-xs text-[var(--accent)]"
          >
            {token.slice(1, -1)}
          </code>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      elements.push(text.substring(lastIndex));
    }

    return elements.length === 1 ? elements[0] : elements;
  };

  // Text Chunk Renderer (Headings, Paragraphs, Math, ProcessFlow, TechnicalCard)
  const renderTextChunk = (chunk: string, keyPrefix: string) => {
    if (!chunk || !chunk.trim()) return null;

    // 1. Normalize line endings
    let normalized = chunk.replace(/\r\n/g, "\n");

    // 2. Ensure ProcessFlow and TechnicalCard blocks have blank lines around them
    normalized = normalized
      .replace(/\n*(<ProcessFlow[\s\S]*?<\/ProcessFlow>)\n*/g, "\n\n$1\n\n")
      .replace(/\n*(<TechnicalCard[\s\S]*?<\/TechnicalCard>)\n*/g, "\n\n$1\n\n");

    // 3. Ensure $$...$$ block math has blank lines around it
    normalized = normalized.replace(/\n*(\$\$[^\$]+?\$\$)\n*/g, "\n\n$1\n\n");

    // 4. Ensure markdown headers (#, ##, ###, ####) have blank lines around them so they never swallow paragraphs
    normalized = normalized.replace(/(^|\n)(#{1,4}\s+[^\n]+)(\n|$)/g, (_m, p1, p2, p3) => {
      return p1 + "\n\n" + p2 + "\n\n" + p3;
    });

    const blocks = normalized
      .split(/\n\s*\n+/)
      .map((b) => b.trim())
      .filter(Boolean);

    return (
      <div key={keyPrefix} className="space-y-4">
        {blocks.map((block, bIdx) => {
          const trimmed = block;

          if (trimmed.startsWith("# ")) {
            return (
              <h1
                key={`${keyPrefix}-b-${bIdx}`}
                className="editorial-heading text-3xl sm:text-4xl font-serif text-[var(--text)] mt-8 mb-4 font-normal tracking-tight"
              >
                {renderFormattedText(trimmed.replace(/^#\s+/, ""))}
              </h1>
            );
          }

          if (trimmed.startsWith("## ")) {
            return (
              <h2
                key={`${keyPrefix}-b-${bIdx}`}
                className="editorial-heading text-2xl sm:text-3xl font-serif text-[var(--text)] mt-10 mb-4 font-normal tracking-tight border-b border-[var(--border)] pb-2"
              >
                {renderFormattedText(trimmed.replace(/^##\s+/, ""))}
              </h2>
            );
          }

          if (trimmed.startsWith("### ")) {
            return (
              <h3
                key={`${keyPrefix}-b-${bIdx}`}
                className="editorial-heading text-xl sm:text-2xl font-serif text-[var(--text)] mt-8 mb-3 font-normal"
              >
                {renderFormattedText(trimmed.replace(/^###\s+/, ""))}
              </h3>
            );
          }

          if (trimmed.startsWith("#### ")) {
            return (
              <h4
                key={`${keyPrefix}-b-${bIdx}`}
                className="text-base sm:text-lg font-semibold text-[var(--text)] mt-6 mb-2"
              >
                {renderFormattedText(trimmed.replace(/^####\s+/, ""))}
              </h4>
            );
          }

          if (trimmed.startsWith("$$") && trimmed.endsWith("$$")) {
            const math = trimmed.slice(2, -2).trim();
            let renderedMathHtml = "";
            try {
              renderedMathHtml = katex.renderToString(math, {
                displayMode: true,
                throwOnError: false,
              });
            } catch (err) {
              console.error("KaTeX render error:", err);
            }

            return renderedMathHtml ? (
              <div
                key={`${keyPrefix}-b-${bIdx}`}
                className="math-block"
                dangerouslySetInnerHTML={{ __html: renderedMathHtml }}
              />
            ) : (
              <div
                key={`${keyPrefix}-b-${bIdx}`}
                className="math-block font-mono text-amber-400"
              >
                {math}
              </div>
            );
          }

          if (trimmed.includes("<ProcessFlow>")) {
            const stepRegex = /<ProcessStep\s+step="([^"]+)"\s+title="([^"]+)"(?:\s+parameters="([^"]+)")?>([\s\S]*?)<\/ProcessStep>/g;
            const steps: Array<{ step: string; title: string; parameters?: string; content: string }> = [];
            let m;
            while ((m = stepRegex.exec(trimmed)) !== null) {
              steps.push({
                step: m[1],
                title: m[2],
                parameters: m[3],
                content: m[4].trim(),
              });
            }

            return (
              <ProcessFlow key={`${keyPrefix}-b-${bIdx}`}>
                {steps.map((s, sIdx) => (
                  <ProcessStep
                    key={sIdx}
                    step={s.step}
                    title={s.title}
                    parameters={s.parameters}
                  >
                    {renderFormattedText(s.content)}
                  </ProcessStep>
                ))}
              </ProcessFlow>
            );
          }

          if (trimmed.includes("<TechnicalCard")) {
            const titleM = trimmed.match(/title="([^"]+)"/);
            const subtitleM = trimmed.match(/subtitle="([^"]+)"/);
            const bottleneckM = trimmed.match(/bottleneck="([^"]+)"/);
            const innerM = trimmed.match(/<TechnicalCard[^>]*>([\s\S]*?)<\/TechnicalCard>/);

            return (
              <TechnicalCard
                key={`${keyPrefix}-b-${bIdx}`}
                title={titleM ? titleM[1] : "TECHNICAL SPECIFICATIONS"}
                subtitle={subtitleM ? subtitleM[1] : undefined}
                bottleneck={bottleneckM ? bottleneckM[1] : undefined}
              >
                {innerM ? (
                  <div
                    className="technical-card-body"
                    dangerouslySetInnerHTML={{ __html: innerM[1] }}
                  />
                ) : null}
              </TechnicalCard>
            );
          }

          // Bullet list handler
          if (trimmed.split("\n").every((l) => /^\s*[-*]\s+/.test(l))) {
            const items = trimmed.split("\n").map((l) => l.replace(/^\s*[-*]\s+/, "").trim());
            return (
              <ul key={`${keyPrefix}-b-${bIdx}`} className="list-disc pl-6 space-y-1.5 text-base text-[var(--text)] my-3">
                {items.map((item, idx) => (
                  <li key={idx}>{renderFormattedText(item)}</li>
                ))}
              </ul>
            );
          }

          return (
            <p
              key={`${keyPrefix}-b-${bIdx}`}
              className="text-base text-[var(--text)] leading-relaxed font-sans mb-4"
            >
              {renderFormattedText(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  // Full Article In-Line Flow
  const renderArticleFlow = () => {
    if (!activeDraft) return null;
    if (!activeDraft.body_mdx) {
      if (activeDraft.article_html) {
        return (
          <div
            className="article-body font-sans"
            dangerouslySetInnerHTML={{ __html: activeDraft.article_html }}
          />
        );
      }
      return <p className="text-[var(--muted)] italic">No article body loaded.</p>;
    }

    const text = activeDraft.body_mdx;
    const regex = /\{\{\s*FIGURE_(\d+)\s*\}\}/g;
    const elements: React.ReactNode[] = [];
    const renderedFigIndices = new Set<number>();
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      const figIdx = parseInt(match[1], 10);

      // Render text chunk leading up to figure
      if (matchIndex > lastIndex) {
        const chunk = text.substring(lastIndex, matchIndex);
        elements.push(renderTextChunk(chunk, `text-before-${figIdx}`));
      }

      // Render Inline Figure Carousel
      elements.push(renderInlineFigure(figIdx));
      renderedFigIndices.add(figIdx);

      lastIndex = matchIndex + match[0].length;
    }

    // Trailing text chunk
    if (lastIndex < text.length) {
      const chunk = text.substring(lastIndex);
      elements.push(renderTextChunk(chunk, "text-trailing"));
    }

    // Append any figures that weren't tagged in the text
    if (activeDraft.figures) {
      activeDraft.figures.forEach((_, figIdx) => {
        if (!renderedFigIndices.has(figIdx)) {
          elements.push(renderInlineFigure(figIdx));
        }
      });
    }

    return <div className="space-y-6">{elements}</div>;
  };

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-center mx-auto mb-4 text-[var(--accent)]">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-serif font-normal text-[var(--text)] mb-1">
            Editor Clearance Required
          </h2>
          <p className="text-xs text-[var(--muted)] font-mono mb-6">
            Enter PIN to review, edit, and publish staged drafts.
          </p>
          <form onSubmit={handleUnlock} className="space-y-4">
            <input
              type="password"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError(false);
              }}
              placeholder="••••••••"
              className={`w-full px-4 py-2.5 rounded-lg bg-[var(--card-inner)] border ${
                pinError ? "border-red-500" : "border-[var(--border)]"
              } text-center font-mono text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]`}
              autoFocus
            />
            {pinError && (
              <p className="text-xs font-mono text-red-400">Incorrect PIN. Please re-enter.</p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-mono text-xs font-bold transition-all shadow-md shadow-[var(--accent)]/20"
            >
              UNLOCK EDITOR
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!activeDraft || drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-14 h-14 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-center mb-5 text-[var(--accent)]">
          <Sparkles className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-serif font-normal text-[var(--text)] mb-2">
          Queue Triaged & Pristine
        </h2>
        <p className="text-sm text-[var(--muted)] font-sans max-w-md mb-8">
          All staged drafts have been reviewed. Run the harvester script to top up the queue with new categorized drafts and fresh candidate images.
        </p>
        <div className="flex gap-4">
          <button
            onClick={refreshDrafts}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] font-mono text-xs text-[var(--text)] hover:border-[var(--accent)] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Check for New Drafts
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--accent)] text-white font-mono text-xs font-semibold hover:bg-[var(--accent-hover)] transition-colors shadow-md shadow-[var(--accent)]/20"
          >
            View Live Publication
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative pb-36">
      {/* Toast Notification */}
      {actionMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[var(--surface)] border border-[var(--accent)] text-[var(--accent)] font-mono text-xs px-4 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
          {actionMessage}
        </div>
      )}

      {/* Triage Header Bar */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/15 text-[var(--accent)] font-mono text-[11px] font-semibold tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            EDITORIAL TRIAGE
          </span>
          <span className="font-mono text-xs text-[var(--muted)]">
            Draft <span className="text-[var(--text)] font-bold">{currentIndex + 1}</span> of {drafts.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0 || loading}
            className="p-1.5 rounded border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)] disabled:opacity-30 transition-colors"
            title="Previous Draft"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => Math.min(drafts.length - 1, prev + 1))}
            disabled={currentIndex === drafts.length - 1 || loading}
            className="p-1.5 rounded border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)] disabled:opacity-30 transition-colors"
            title="Next Draft"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={refreshDrafts}
            disabled={loading}
            className="p-1.5 ml-2 rounded border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)] transition-colors"
            title="Reload Queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Article Content with 100% Published Editorial Theme */}
      <article className="prose prose-invert max-w-none">
        {/* Meta Line */}
        <div className="meta-line">
          <span>STAGED DRAFT #{currentIndex + 1}</span>
          <span>•</span>
          <span className={`archive-subject-tag ${getSubjectClass(activeDraft.subject || activeDraft.category)}`}>
            {activeDraft.subject || activeDraft.category || "ENGINEERING"}
          </span>
          <span>•</span>
          <span id="read-time-badge">{activeDraft.readTime || "12 MIN READ"}</span>
        </div>

        {/* Title & Live Title Editor */}
        <div className="group relative mb-3">
          {isEditingTitle ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full bg-[var(--surface)] border border-[var(--accent)] rounded p-2 text-2xl sm:text-3xl font-serif text-[var(--text)] focus:outline-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(false)}
                  className="px-3 py-1 rounded bg-[var(--accent)] text-white font-mono text-xs font-semibold"
                >
                  Save Title
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditedTitle(activeDraft.title || "");
                    setIsEditingTitle(false);
                  }}
                  className="px-3 py-1 rounded border border-[var(--border)] text-[var(--muted)] font-mono text-xs hover:text-[var(--text)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[var(--text)] m-0 leading-tight">
                {editedTitle || activeDraft.title}
              </h1>
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="flex items-center gap-1 mt-1 px-2.5 py-1 rounded border border-[var(--border)] bg-[var(--surface)] font-mono text-[11px] text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors flex-shrink-0"
                title="Tweak headline"
              >
                <Edit2 className="w-3 h-3" />
                <span className="hidden sm:inline">Edit Title</span>
              </button>
            </div>
          )}
        </div>

        {/* Subtitle */}
        {activeDraft.subtitle && (
          <p className="text-base sm:text-lg text-[var(--muted)] leading-relaxed mt-2 mb-8 font-sans">
            {activeDraft.subtitle}
          </p>
        )}

        {/* Inline Production-Fidelity Article Flow */}
        <div className="mt-8">
          {renderArticleFlow()}
        </div>
      </article>

      {/* Floating Bottom Triage Action Dock */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-[var(--surface)]/95 border-t border-[var(--border)] backdrop-blur-xl px-4 py-3 sm:py-4 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          {/* Veto Button */}
          <button
            type="button"
            onClick={() => setShowVetoModal(true)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 font-mono text-xs sm:text-sm font-semibold hover:bg-red-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
            <span>VETO TOPIC</span>
          </button>

          {/* Approve Button in Terracotta */}
          <button
            type="button"
            onClick={handleApprove}
            disabled={loading}
            className="flex-2 flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-mono text-xs sm:text-sm font-bold shadow-lg shadow-[var(--accent)]/20 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>APPROVE & PUBLISH ISSUE</span>
          </button>
        </div>
      </div>

      {/* Veto Reason Modal */}
      {showVetoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400 font-mono text-xs uppercase font-bold mb-3">
              <AlertTriangle className="w-4 h-4" />
              <span>Veto Editorial Constraint</span>
            </div>

            <h3 className="text-xl font-serif text-[var(--text)] mb-1">
              Why is this topic being vetoed?
            </h3>
            <p className="text-xs text-[var(--muted)] font-mono mb-4">
              Your feedback is appended to <code className="text-[var(--accent)]">vetoes.json</code> to prevent similar topics from being generated.
            </p>

            {/* Quick Reason Pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                "Off-Topic / Generic",
                "Factual / Physics Flaw",
                "Too Surface / High-Level",
                "Repetitive Subject",
                "Poor Visual Potential",
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSelectedVetoReason(reason)}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-colors ${
                    selectedVetoReason === reason
                      ? "bg-red-500 text-white font-bold"
                      : "bg-[var(--card-inner)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--muted)]"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            {/* Custom Critique Text */}
            <textarea
              value={customCritique}
              onChange={(e) => setCustomCritique(e.target.value)}
              placeholder="Optional: Provide specific critique to guide future topic generation..."
              rows={3}
              className="w-full bg-[var(--card-inner)] border border-[var(--border)] rounded-lg p-3 text-xs text-[var(--text)] placeholder-[var(--muted)] font-sans focus:outline-none focus:border-red-500 mb-4"
            />

            <div className="flex justify-end gap-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => setShowVetoModal(false)}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVeto}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
              >
                Confirm Veto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
