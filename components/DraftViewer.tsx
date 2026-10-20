"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  ExternalLink,
  Lock,
} from "lucide-react";

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

  // Check client-side authentication on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const keyParam = urlParams.get("key") || urlParams.get("token");
      const storedPin = localStorage.getItem("hw_editor_pin");

      if (keyParam === "deepdive2026" || storedPin === "deepdive2026" || initiallyUnlocked) {
        setIsUnlocked(true);
        localStorage.setItem("hw_editor_pin", "deepdive2026");
      }
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
  // e.g. { 0: 0, 1: 3 }
  const [selectedImages, setSelectedImages] = useState<Record<number, number>>({});

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
        setDrafts(data.drafts || []);
        setCurrentIndex(0);
      }
    } catch (e) {
      console.error("Failed to refresh drafts:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectImage = (figureIdx: number, imgIdx: number) => {
    setSelectedImages((prev) => ({
      ...prev,
      [figureIdx]: imgIdx,
    }));
  };

  const handleApprove = async () => {
    if (!activeDraft) return;
    setLoading(true);
    setActionMessage("Approving and publishing to queue...");

    try {
      // Build updated figures array with chosen selections
      const updatedFigures = (activeDraft.figures || []).map((fig, idx) => ({
        ...fig,
        selectedIndex: selectedImages[idx] ?? 0,
      }));

      const res = await fetch("/api/drafts/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: activeDraft.filename,
          title: editedTitle.trim() || activeDraft.title,
          figures: updatedFigures,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Approval failed");
      }

      const data = await res.json();
      setActionMessage(`✓ Published as Issue #${data.issueId}!`);

      // Remove from local list and auto-advance
      setTimeout(() => {
        setDrafts((prev) => prev.filter((_, i) => i !== currentIndex));
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
    setActionMessage("Vetoing and training curation model...");

    try {
      const res = await fetch("/api/drafts/veto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: activeDraft.filename,
          title: activeDraft.title,
          subject: activeDraft.subject || activeDraft.category,
          reason: selectedVetoReason,
          critique: customCritique.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Veto failed");
      }

      setActionMessage("✓ Veto recorded. Auto-advancing...");
      setCustomCritique("");

      // Remove from local list and auto-advance
      setTimeout(() => {
        setDrafts((prev) => prev.filter((_, i) => i !== currentIndex));
        setActionMessage(null);
      }, 700);
    } catch (err: any) {
      alert(`Veto error: ${err.message}`);
      setActionMessage(null);
    } finally {
      setLoading(false);
    }
  };

  // Editorial Access PIN Gate
  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6 text-amber-500 shadow-xl shadow-amber-500/5">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-sans text-neutral-100 mb-2">
          The HW Insider
        </h2>
        <div className="flex items-center gap-2 mb-6">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-widest text-amber-500 font-semibold">
            Editorial Access Required
          </span>
        </div>
        <form onSubmit={handleUnlock} className="w-full space-y-4">
          <div>
            <input
              type="password"
              placeholder="Enter Access PIN..."
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError(false);
              }}
              className={`w-full px-4 py-3 rounded-xl bg-neutral-900 border text-neutral-100 text-center font-mono tracking-widest text-base focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all ${
                pinError ? "border-red-500 text-red-400" : "border-neutral-800 focus:border-amber-500"
              }`}
              autoFocus
            />
            {pinError && (
              <p className="text-xs text-red-400 font-mono mt-2">
                Invalid access PIN. Please try again.
              </p>
            )}
          </div>
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-amber-500/10"
          >
            Unlock Editor Mode
          </button>
        </form>
        <p className="text-[11px] text-neutral-500 font-mono mt-6">
          Tip: You can also append <code className="text-amber-500/80">?key=deepdive2026</code> to your URL.
        </p>
      </div>
    );
  }

  if (!activeDraft || drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6 text-amber-500">
          <Sparkles className="w-8 h-8 animate-pulse" />
        </div>
        <h2 className="text-xl font-bold font-mono text-neutral-100 mb-2">
          Queue Triaged & Pristine
        </h2>
        <p className="text-sm text-neutral-400 font-sans max-w-md mb-8">
          All staged drafts have been reviewed. Run the harvester script to top up the queue with new categorized drafts and fresh candidate images.
        </p>
        <div className="flex gap-4">
          <button
            onClick={refreshDrafts}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-700 bg-neutral-900 font-mono text-xs text-neutral-200 hover:border-amber-500 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Check for New Drafts
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 text-neutral-950 font-mono text-xs font-semibold hover:bg-amber-400 transition-colors"
          >
            View Live Newsletter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative pb-32">
      {/* Toast Notification */}
      {actionMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/95 border border-amber-500/50 text-amber-400 font-mono text-xs px-4 py-2 rounded-full shadow-2xl backdrop-blur-md animate-fade-in flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          {actionMessage}
        </div>
      )}

      {/* Triage Header Bar */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 font-mono text-[11px] font-semibold tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            EDITOR MODE
          </span>
          <span className="font-mono text-xs text-neutral-400">
            Draft <span className="text-neutral-100 font-bold">{currentIndex + 1}</span> of {drafts.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0 || loading}
            className="p-1.5 rounded border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 disabled:opacity-30"
            title="Previous Draft"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => Math.min(drafts.length - 1, prev + 1))}
            disabled={currentIndex === drafts.length - 1 || loading}
            className="p-1.5 rounded border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 disabled:opacity-30"
            title="Next Draft"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={refreshDrafts}
            disabled={loading}
            className="p-1.5 ml-2 rounded border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700"
            title="Reload Queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Article Content */}
      <article className="prose prose-invert max-w-none">
        {/* Meta Line */}
        <div className="flex items-center gap-2 font-mono text-xs text-amber-500 uppercase tracking-widest mb-3">
          <span>STAGED DRAFT</span>
          <span>•</span>
          <span>{activeDraft.subject || activeDraft.category || "MECHANICAL"}</span>
          <span>•</span>
          <span>{activeDraft.readTime || "10 MIN READ"}</span>
        </div>

        {/* Title & Live Title Editor */}
        <div className="group relative mb-3">
          {isEditingTitle ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full text-2xl sm:text-3xl font-bold bg-neutral-900 border border-amber-500 rounded p-2 text-neutral-100 font-sans focus:outline-none focus:ring-1 focus:ring-amber-500"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(false)}
                  className="px-3 py-1 rounded bg-amber-500 text-neutral-950 font-mono text-xs font-semibold hover:bg-amber-400"
                >
                  Save Title
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditedTitle(activeDraft.title);
                    setIsEditingTitle(false);
                  }}
                  className="px-3 py-1 rounded border border-neutral-700 text-neutral-400 font-mono text-xs hover:text-neutral-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100 font-sans m-0">
                {editedTitle || activeDraft.title}
              </h1>
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="flex items-center gap-1 mt-1 px-2.5 py-1 rounded border border-neutral-800 bg-neutral-900/80 font-mono text-[11px] text-neutral-400 hover:text-amber-400 hover:border-amber-500/50 transition-colors flex-shrink-0"
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
          <p className="text-sm sm:text-base text-neutral-400 font-mono leading-relaxed mt-2 mb-8">
            {activeDraft.subtitle}
          </p>
        )}

        {/* Figures / Image Candidate Carousels */}
        {activeDraft.figures && activeDraft.figures.length > 0 && (
          <div className="my-8 space-y-8">
            {activeDraft.figures.map((fig, figIdx) => {
              const currentSelectedIdx = selectedImages[figIdx] ?? 0;
              const selectedImg = fig.images[currentSelectedIdx] || fig.images[0];

              return (
                <div
                  key={fig.id || figIdx}
                  className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 sm:p-5"
                >
                  <div className="flex items-center justify-between mb-3 font-mono text-xs">
                    <span className="text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      {fig.caption ? fig.caption.split(":")[0] : `FIGURE ${figIdx + 1}`}
                    </span>
                    <span className="text-neutral-400 text-[11px]">
                      Candidate <span className="text-neutral-200 font-bold">{currentSelectedIdx + 1}</span> of {fig.images.length}
                    </span>
                  </div>

                  {/* Active Selected Image Preview */}
                  {selectedImg && (
                    <div className="relative w-full h-64 sm:h-96 rounded-lg overflow-hidden bg-neutral-950 border border-neutral-800 mb-3 group">
                      <img
                        src={selectedImg.url}
                        alt={selectedImg.title || activeDraft.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                        onError={(e) => {
                          // Fallback to high quality placeholder if broken
                          (e.target as HTMLElement).setAttribute(
                            "src",
                            "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=2000"
                          );
                        }}
                      />
                      <div className="absolute top-2 right-2 px-2 py-1 rounded bg-neutral-900/80 backdrop-blur-md border border-neutral-700/60 font-mono text-[10px] text-amber-400 uppercase tracking-wider">
                        Active Selection
                      </div>
                    </div>
                  )}

                  {/* 12-Image Horizontal Scroll Carousel */}
                  <div className="mt-3">
                    <div className="text-[11px] font-mono text-neutral-400 mb-2 flex items-center justify-between">
                      <span>Select replacement teardown image:</span>
                      <span className="text-neutral-500">Swipe horizontally ➔</span>
                    </div>

                    <div className="flex gap-2.5 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-neutral-800 snap-x">
                      {fig.images.map((img, imgIdx) => {
                        const isSelected = imgIdx === currentSelectedIdx;
                        return (
                          <button
                            key={imgIdx}
                            type="button"
                            onClick={() => handleSelectImage(figIdx, imgIdx)}
                            className={`relative flex-shrink-0 w-28 sm:w-36 h-20 sm:h-24 rounded-lg overflow-hidden border-2 transition-all snap-start ${
                              isSelected
                                ? "border-amber-500 ring-2 ring-amber-500/40 shadow-lg scale-105 z-10"
                                : "border-neutral-800 opacity-60 hover:opacity-100 hover:border-neutral-600"
                            }`}
                          >
                            <img
                              src={img.url}
                              alt={img.title || `Candidate ${imgIdx + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).setAttribute(
                                  "src",
                                  "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=300"
                                );
                              }}
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                                <span className="p-1 rounded-full bg-amber-500 text-neutral-950 shadow">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </span>
                              </div>
                            )}
                            <div className="absolute bottom-0 inset-x-0 bg-neutral-950/80 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-mono text-neutral-300 truncate">
                              #{imgIdx + 1}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Caption & Source Footer */}
                  <div className="mt-3 pt-3 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-neutral-400">
                    <p className="m-0 text-xs text-neutral-300">
                      {fig.caption || selectedImg?.title || ""}
                    </p>
                    <span className="text-[10px] uppercase text-neutral-500">
                      {fig.source || selectedImg?.source || "Live Search"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MDX / Article Body Render */}
        <div className="text-neutral-300 leading-relaxed font-sans space-y-6 mt-8">
          {activeDraft.body_mdx ? (
            <div className="whitespace-pre-line text-sm sm:text-base leading-relaxed">
              {activeDraft.body_mdx}
            </div>
          ) : activeDraft.article_html ? (
            <div
              className="article-body font-sans"
              dangerouslySetInnerHTML={{ __html: activeDraft.article_html }}
            />
          ) : (
            <p className="text-neutral-400 italic">No article body loaded.</p>
          )}
        </div>
      </article>

      {/* Floating Bottom Triage Action Dock */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-[#0a0a0b]/90 border-t border-neutral-800/90 backdrop-blur-xl px-4 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          {/* Veto Button */}
          <button
            type="button"
            onClick={() => setShowVetoModal(true)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-400 font-mono text-xs sm:text-sm font-semibold hover:bg-rose-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
            <span>VETO TOPIC</span>
          </button>

          {/* Approve Button */}
          <button
            type="button"
            onClick={handleApprove}
            disabled={loading}
            className="flex-2 flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-mono text-xs sm:text-sm font-bold shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>APPROVE & PUBLISH</span>
          </button>
        </div>
      </div>

      {/* Veto Reason Modal */}
      {showVetoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 font-mono text-xs uppercase font-bold mb-3">
              <AlertTriangle className="w-4 h-4" />
              <span>Veto Editorial Constraint</span>
            </div>

            <h3 className="text-lg font-bold text-neutral-100 mb-1">
              Why is this topic being vetoed?
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              Your feedback is appended to <code className="text-amber-400">vetoes.json</code> to prevent similar topics from being generated.
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
                      ? "bg-rose-500 text-neutral-950 font-bold"
                      : "bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-neutral-700"
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
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-xs text-neutral-200 placeholder-neutral-500 font-sans focus:outline-none focus:border-rose-500 mb-4"
            />

            <div className="flex justify-end gap-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => setShowVetoModal(false)}
                className="px-4 py-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-neutral-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVeto}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-colors"
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
