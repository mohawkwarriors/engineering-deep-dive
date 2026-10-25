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
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Sliders,
  Search,
  UploadCloud,
  FileCode,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Compass,
  PlusCircle,
  Clock,
  Archive,
  Send,
  Zap,
} from "lucide-react";
import { ProcessFlow, ProcessStep } from "./ProcessFlow";
import { TechnicalCard } from "./TechnicalCard";
import { TechnicalTangent } from "./TechnicalTangent";
import {
  ParameterExplorer,
  MechanismWalkthrough,
  ToleranceStackupBar,
  TradeoffMatrix,
  LayeredCrossSection,
} from "./interactive";

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
  activeTab?: "carousel" | "cad" | "scanner";
  cadSvg?: string;
  scannedBadge?: "green" | "yellow" | "red";
  scannedClassification?: string;
  customPastedUrl?: string;
  hidden?: boolean;
}

interface DraftSection {
  id: string;
  heading: string;
  type: "editor" | "ai_fill";
  badge?: string;
  content: string;
  hidden?: boolean;
}

interface DraftItem {
  filename: string;
  filePath?: string;
  id?: string;
  title: string;
  titleAngles?: {
    mechanism?: string;
    tradeoff?: string;
    teardown?: string;
    failureMode?: string;
  };
  subtitle?: string;
  subject?: string;
  category?: string;
  readTime?: string;
  date?: string;
  summary?: string;
  figures?: DraftFigure[];
  sections?: DraftSection[];
  body_mdx?: string;
  tangents?: Record<string, any>;
  source?: string;
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
  initialApprovedCount = 0,
}: {
  initialDrafts: DraftItem[];
  initiallyUnlocked?: boolean;
  initialApprovedCount?: number;
}) {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(initiallyUnlocked);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  const [drafts, setDrafts] = useState<DraftItem[]>(initialDrafts);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Runway & Buffer state
  const [approvedCount, setApprovedCount] = useState<number>(initialApprovedCount);
  const runwayAlert = approvedCount <= 3;

  // Quick Seed Box state ("Anchor & Fill")
  const [showSeedBox, setShowSeedBox] = useState(false);
  const [seedTopic, setSeedTopic] = useState("");
  const [seedBullets, setSeedBullets] = useState("");
  const [seedLoading, setSeedLoading] = useState(false);
  const [outlinePreview, setOutlinePreview] = useState<any | null>(null);

  // Editable title state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [activeTitleAngle, setActiveTitleAngle] = useState<string | null>("mechanism");

  // Selected image indices per figure for active draft
  const [selectedImages, setSelectedImages] = useState<Record<number, number>>({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Active figure tab: "carousel" | "cad" | "scanner"
  const [activeFigTabs, setActiveFigTabs] = useState<Record<number, "carousel" | "cad" | "scanner">>({});
  const [cadSvgs, setCadSvgs] = useState<Record<number, string>>({});
  const [figKeywords, setFigKeywords] = useState<Record<number, string>>({});
  const [isSearchingFig, setIsSearchingFig] = useState<Record<number, boolean>>({});

  // Scanner state per figure
  const [scanUrls, setScanUrls] = useState<Record<number, string>>({});
  const [scanResults, setScanResults] = useState<
    Record<
      number,
      {
        badge: "green" | "yellow" | "red";
        legalClassification: string;
        recommendedCaption: string;
        redrawSvg: string;
      }
    >
  >({});
  const [scanningIdx, setScanningIdx] = useState<number | null>(null);

  // Modular sections for active draft
  const [activeSections, setActiveSections] = useState<DraftSection[]>([]);
  const [refocusingSecId, setRefocusingSecId] = useState<string | null>(null);

  // Veto modal state
  const [showVetoModal, setShowVetoModal] = useState(false);
  const [selectedVetoReason, setSelectedVetoReason] = useState("[Too Broad]");
  const [customCritique, setCustomCritique] = useState("");

  const activeDraft: DraftItem | undefined = drafts[currentIndex];

  // Client-side authentication & persistent state
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const keyParam = urlParams.get("key") || urlParams.get("token");
      const storedPin = localStorage.getItem("hw_editor_pin");

      if (keyParam === "deepdive2026" || storedPin === "deepdive2026" || initiallyUnlocked) {
        setIsUnlocked(true);
        localStorage.setItem("hw_editor_pin", "deepdive2026");
      }

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

  // Synchronize state when active draft changes
  useEffect(() => {
    if (activeDraft) {
      setEditedTitle(activeDraft.title || "");
      setIsEditingTitle(false);
      setActiveTitleAngle("mechanism");

      // Initialize selected image indices
      const initialImgMap: Record<number, number> = {};
      const initialTabMap: Record<number, "carousel" | "cad" | "scanner"> = {};
      const initialKwMap: Record<number, string> = {};

      if (activeDraft.figures) {
        activeDraft.figures.forEach((fig, idx) => {
          initialImgMap[idx] = fig.selectedIndex ?? 0;
          initialTabMap[idx] = fig.activeTab || "carousel";
          initialKwMap[idx] = activeDraft.title;
        });
      }
      setSelectedImages(initialImgMap);
      setActiveFigTabs(initialTabMap);
      setFigKeywords(initialKwMap);

      // Initialize sections: if draft already has sections, use them; else parse body_mdx
      if (activeDraft.sections && activeDraft.sections.length > 0) {
        setActiveSections(activeDraft.sections);
      } else if (activeDraft.body_mdx) {
        // Parse sections from ## / ### headings
        const rawChunks = activeDraft.body_mdx.split(/(^|\n)##\s+/).filter(Boolean);
        const parsed: DraftSection[] = [];
        let secIdx = 1;

        for (const chunk of rawChunks) {
          const lines = chunk.trim().split("\n");
          const heading = lines[0]?.replace(/^#+\s*/, "") || `Section ${secIdx}`;
          const content = chunk.trim();
          parsed.push({
            id: `sec-${secIdx}`,
            heading,
            type: "ai_fill",
            badge: "[AI Fill]",
            content,
            hidden: false,
          });
          secIdx++;
        }

        if (parsed.length === 0) {
          parsed.push({
            id: "sec-1",
            heading: activeDraft.title,
            type: "ai_fill",
            badge: "[AI Fill]",
            content: activeDraft.body_mdx,
            hidden: false,
          });
        }
        setActiveSections(parsed);
      } else {
        setActiveSections([]);
      }
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
          if (typeof data.approvedCount === "number") {
            setApprovedCount(data.approvedCount);
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

  // Section Controls: Hide, Reorder, Refocus
  const toggleSectionHide = (secId: string) => {
    setActiveSections((prev) =>
      prev.map((s) => (s.id === secId ? { ...s, hidden: !s.hidden } : s))
    );
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= activeSections.length) return;

    setActiveSections((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const refocusSection = async (secId: string, mode: "math" | "tradeoffs" | "rules" | "simplify") => {
    const targetSec = activeSections.find((s) => s.id === secId);
    if (!targetSec) return;

    setRefocusingSecId(secId);
    try {
      const res = await fetch("/api/drafts/refocus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionHeading: targetSec.heading,
          currentContent: targetSec.content,
          mode,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveSections((prev) =>
          prev.map((s) => (s.id === secId ? { ...s, content: data.updatedContent } : s))
        );
        setActionMessage(`✓ Refocused section: ${mode.toUpperCase()}`);
        setTimeout(() => setActionMessage(null), 1500);
      }
    } catch (e) {
      console.error("Refocus failed:", e);
    } finally {
      setRefocusingSecId(null);
    }
  };

  // Quick Topic Seeding ("Anchor & Fill")
  const handleSeedSubmit = async (mode: "full" | "outline") => {
    if (!seedTopic.trim()) return;
    setSeedLoading(true);

    try {
      const res = await fetch("/api/drafts/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: seedTopic,
          bullets: seedBullets,
          mode,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Seed failed");
      }

      const data = await res.json();

      if (mode === "outline") {
        setOutlinePreview(data);
      } else {
        // Prepend new draft to queue at index 0 (absolute priority)
        setDrafts((prev) => [data.draft, ...prev]);
        setCurrentIndex(0);
        setShowSeedBox(false);
        setOutlinePreview(null);
        setSeedTopic("");
        setSeedBullets("");
        setActionMessage("✓ Manual topic generated and prioritized at top of queue!");
        setTimeout(() => setActionMessage(null), 2500);
      }
    } catch (err: any) {
      alert(`Seeding error: ${err.message}`);
    } finally {
      setSeedLoading(false);
    }
  };

  // Image Tab 1: Keyword search refresh
  const handleSearchImages = async (figIdx: number) => {
    const query = figKeywords[figIdx] || activeDraft?.title;
    if (!query) return;

    setIsSearchingFig((prev) => ({ ...prev, [figIdx]: true }));
    try {
      const res = await fetch("/api/drafts/search-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 12 }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.images && activeDraft?.figures?.[figIdx]) {
          activeDraft.figures[figIdx].images = data.images;
          setSelectedImages((prev) => ({ ...prev, [figIdx]: 0 }));
          setActionMessage(`✓ Loaded 12 fresh candidates for Figure ${figIdx + 1}`);
          setTimeout(() => setActionMessage(null), 1500);
        }
      }
    } catch (e) {
      console.error("Image search failed:", e);
    } finally {
      setIsSearchingFig((prev) => ({ ...prev, [figIdx]: false }));
    }
  };

  // Image Tab 2: On-Demand CAD Vector Generator
  const handleGenerateCad = async (figIdx: number) => {
    if (!activeDraft) return;
    setLoading(true);

    try {
      const res = await fetch("/api/drafts/cad-vector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activeDraft.title,
          topic: activeDraft.subject || "Mechanisms",
          figNumber: String(figIdx + 1).padStart(2, "0"),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCadSvgs((prev) => ({ ...prev, [figIdx]: data.svg }));
        setActiveFigTabs((prev) => ({ ...prev, [figIdx]: "cad" }));
        setActionMessage(`✓ Generated CAD Vector Schematic for Figure ${figIdx + 1}`);
        setTimeout(() => setActionMessage(null), 1500);
      }
    } catch (e) {
      console.error("CAD generation error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Image Tab 3: Copyright Scanner & 1-Click Redraw
  const handleScanImage = async (figIdx: number, urlToScan?: string) => {
    const targetUrl = urlToScan || scanUrls[figIdx];
    if (!targetUrl) return;

    setScanningIdx(figIdx);
    try {
      const res = await fetch("/api/drafts/scan-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: targetUrl,
          query: activeDraft?.title || "Teardown",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setScanResults((prev) => ({
          ...prev,
          [figIdx]: data,
        }));
      }
    } catch (e) {
      console.error("Scan error:", e);
    } finally {
      setScanningIdx(null);
    }
  };

  const handleApplyRedraw = (figIdx: number) => {
    const result = scanResults[figIdx];
    if (!result?.redrawSvg) return;

    setCadSvgs((prev) => ({ ...prev, [figIdx]: result.redrawSvg }));
    setActiveFigTabs((prev) => ({ ...prev, [figIdx]: "cad" }));
    setActionMessage("✓ 1-Click Redraw applied: original clean vector schematic active!");
    setTimeout(() => setActionMessage(null), 2000);
  };

  // Approval handlers: "buffer" vs "publish"
  const handleApprove = async (targetMode: "buffer" | "publish" = "publish") => {
    if (!activeDraft) return;
    setLoading(true);
    setActionMessage(
      targetMode === "buffer" ? "Moving to 10–15 Approved Buffer..." : "Publishing daily issue..."
    );

    try {
      const updatedFigures = (activeDraft.figures || []).map((fig, idx) => ({
        ...fig,
        selectedIndex: selectedImages[idx] ?? 0,
        activeTab: activeFigTabs[idx] || "carousel",
      }));

      const res = await fetch("/api/drafts/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: activeDraft.filename,
          title: editedTitle || activeDraft.title,
          figures: updatedFigures,
          sections: activeSections,
          target: targetMode,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Approval failed");
      }

      const data = await res.json();
      if (targetMode === "buffer") {
        setApprovedCount(data.approvedCount || approvedCount + 1);
        setActionMessage(`✓ Added to Approved Buffer (${data.approvedCount} in runway)!`);
      } else {
        setActionMessage(`✓ Published as Issue #${data.issueId}!`);
      }

      try {
        const locallyApproved = JSON.parse(localStorage.getItem("hw_approved_filenames") || "[]");
        locallyApproved.push(activeDraft.filename);
        if (activeDraft.title) locallyApproved.push(activeDraft.title);
        localStorage.setItem("hw_approved_filenames", JSON.stringify(Array.from(new Set(locallyApproved))));
      } catch {}

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

  // Veto handler with the 4 standard blueprint tags
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

      try {
        const locallyVetoed = JSON.parse(localStorage.getItem("hw_vetoed_filenames") || "[]");
        locallyVetoed.push(activeDraft.filename);
        if (activeDraft.title) locallyVetoed.push(activeDraft.title);
        localStorage.setItem("hw_vetoed_filenames", JSON.stringify(Array.from(new Set(locallyVetoed))));
      } catch {}

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

  // 1-Click Title Angle selection
  const selectTitleAngle = (key: "mechanism" | "tradeoff" | "teardown" | "failureMode") => {
    setActiveTitleAngle(key);
    if (activeDraft?.titleAngles?.[key]) {
      setEditedTitle(activeDraft.titleAngles[key]!);
    } else {
      // Fallback angle derivation
      const base = activeDraft?.title || "Mechanical Hardware Analysis";
      if (key === "mechanism") setEditedTitle(`${base}: Kinematic Decomposition & Sub-Micron Dynamics`);
      if (key === "tradeoff") setEditedTitle(`Designing for Yield: The Critical Material Tradeoffs in ${base}`);
      if (key === "teardown") setEditedTitle(`Hardware Teardown: Dissecting the Architecture of ${base}`);
      if (key === "failureMode") setEditedTitle(`Catastrophic Wear & Fatigue: How ${base} Fails Under Load`);
    }
  };

  // The 3-Tab Visual Switcher component for each figure slot
  const renderVisualSwitcherFigure = (figIdx: number) => {
    if (!activeDraft?.figures || !activeDraft.figures[figIdx]) return null;
    const fig = activeDraft.figures[figIdx];
    const currentSelectedIdx = selectedImages[figIdx] ?? 0;
    const selectedImg = fig.images[currentSelectedIdx] || fig.images[0];
    const activeTab = activeFigTabs[figIdx] || "carousel";
    const scanResult = scanResults[figIdx];

    return (
      <figure key={`fig-${figIdx}`} className="product-figure my-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xl not-prose">
        {/* Figure Top Control Header */}
        <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[var(--surface-hover)] border-b border-[var(--border)] font-mono text-xs gap-2">
          <span className="text-[var(--accent)] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            {fig.caption ? fig.caption.split(":")[0] : `FIG ${String(figIdx + 1).padStart(2, "0")}`}
          </span>

          {/* 3-Tab Selector Switcher */}
          <div className="flex items-center gap-1 bg-[var(--card-inner)] border border-[var(--border)] p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveFigTabs((prev) => ({ ...prev, [figIdx]: "carousel" }))}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all flex items-center gap-1 ${
                activeTab === "carousel"
                  ? "bg-[var(--accent)] text-white font-bold shadow"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <Search className="w-3 h-3" />
              Tab 1: Verified Carousel
            </button>
            <button
              type="button"
              onClick={() => setActiveFigTabs((prev) => ({ ...prev, [figIdx]: "cad" }))}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all flex items-center gap-1 ${
                activeTab === "cad"
                  ? "bg-[var(--accent)] text-white font-bold shadow"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <FileCode className="w-3 h-3" />
              Tab 2: On-Demand CAD
            </button>
            <button
              type="button"
              onClick={() => setActiveFigTabs((prev) => ({ ...prev, [figIdx]: "scanner" }))}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all flex items-center gap-1 ${
                activeTab === "scanner"
                  ? "bg-[var(--accent)] text-white font-bold shadow"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <UploadCloud className="w-3 h-3" />
              Tab 3: Paste & Scanner
            </button>
          </div>
        </div>

        {/* TAB 1: Verified Technical Carousel */}
        {activeTab === "carousel" && (
          <div>
            {/* Active Selected Image Preview */}
            <div className="img-wrapper relative w-full h-72 sm:h-96 bg-[var(--card-inner)] flex items-center justify-center overflow-hidden">
              {selectedImg?.url ? (
                <img
                  src={selectedImg.url}
                  alt={selectedImg.title || activeDraft.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-xs font-mono text-[var(--muted)]">No image specified</div>
              )}

              <div className="absolute top-3 right-3 px-2 py-1 rounded bg-[var(--surface)]/90 backdrop-blur-md border border-[var(--border)] font-mono text-[10px] text-[var(--accent)] uppercase tracking-wider flex items-center gap-1 shadow">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                Verified Candidate #{currentSelectedIdx + 1}
              </div>
            </div>

            {/* Keyword Refresh Bar */}
            <div className="px-4 py-2 bg-[var(--surface)] border-t border-[var(--border)] flex items-center gap-2">
              <input
                type="text"
                value={figKeywords[figIdx] ?? activeDraft.title}
                onChange={(e) => setFigKeywords((prev) => ({ ...prev, [figIdx]: e.target.value }))}
                placeholder="Search Wikimedia & patent teardown archives..."
                className="flex-1 bg-[var(--card-inner)] border border-[var(--border)] rounded px-3 py-1.5 text-xs text-[var(--text)] font-mono focus:outline-none focus:border-[var(--accent)]"
              />
              <button
                type="button"
                onClick={() => handleSearchImages(figIdx)}
                disabled={isSearchingFig[figIdx]}
                className="px-3 py-1.5 rounded bg-[var(--card-inner)] border border-[var(--border)] hover:border-[var(--accent)] text-xs text-[var(--accent)] font-mono font-semibold flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isSearchingFig[figIdx] ? "animate-spin" : ""}`} />
                Refresh Keywords
              </button>
            </div>

            {/* 12-Image Carousel */}
            <div className="p-3 bg-[var(--card-inner)] border-t border-[var(--border)]">
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                {fig.images.map((img, imgIdx) => {
                  const isSelected = imgIdx === currentSelectedIdx;
                  return (
                    <button
                      key={imgIdx}
                      type="button"
                      onClick={() => setSelectedImages((prev) => ({ ...prev, [figIdx]: imgIdx }))}
                      className={`relative flex-shrink-0 w-28 h-20 rounded overflow-hidden border-2 transition-all ${
                        isSelected
                          ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/40 scale-105 z-10"
                          : "border-[var(--border)] opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={img.url} alt={`Candidate ${imgIdx + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-[var(--accent)]/20 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white stroke-[3]" />
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-black/80 px-1 py-0.5 text-[9px] font-mono text-white truncate">
                        #{imgIdx + 1}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: On-Demand CAD Vector Generator */}
        {activeTab === "cad" && (
          <div className="p-4 bg-[var(--card-inner)]">
            {cadSvgs[figIdx] ? (
              <div>
                <div dangerouslySetInnerHTML={{ __html: cadSvgs[figIdx] }} />
                <div className="mt-3 flex justify-between items-center text-xs font-mono text-[var(--muted)]">
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Clean House-Style CAD Vector Schematic (0% Copyright Liability)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleGenerateCad(figIdx)}
                    className="text-[var(--accent)] hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerate CAD
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 px-4">
                <FileCode className="w-10 h-10 text-[var(--accent)] mx-auto mb-3" />
                <h5 className="text-base font-serif text-[var(--text)] mb-1">On-Demand CAD Vector Generator</h5>
                <p className="text-xs text-[var(--muted)] font-mono max-w-sm mx-auto mb-4">
                  Generates an original, precision technical CAD schematic with dark-mode grid, dimensions, and ISO 2768 titleblock.
                </p>
                <button
                  type="button"
                  onClick={() => handleGenerateCad(figIdx)}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-mono text-xs font-bold shadow hover:bg-[var(--accent-hover)]"
                >
                  {loading ? "Generating CAD..." : "Generate Custom CAD Vector Diagram"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Clipboard Paste & Copyright Scanner */}
        {activeTab === "scanner" && (
          <div className="p-4 bg-[var(--card-inner)]">
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste image URL or Cmd+V image source..."
                  value={scanUrls[figIdx] || ""}
                  onChange={(e) => setScanUrls((prev) => ({ ...prev, [figIdx]: e.target.value }))}
                  className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded px-3 py-2 text-xs text-[var(--text)] font-mono focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => handleScanImage(figIdx)}
                  disabled={scanningIdx === figIdx}
                  className="px-4 py-2 rounded bg-[var(--accent)] text-white font-mono text-xs font-bold hover:bg-[var(--accent-hover)] shadow flex items-center gap-1.5"
                >
                  <Search className={`w-3.5 h-3.5 ${scanningIdx === figIdx ? "animate-spin" : ""}`} />
                  {scanningIdx === figIdx ? "Scanning..." : "Scan Legal Status"}
                </button>
              </div>

              {/* Scanner Traffic Light Badging */}
              {scanResult && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {scanResult.badge === "green" && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-mono text-xs font-bold">
                          <ShieldCheck className="w-4 h-4" />
                          🟢 GREEN: Public Domain / Patent / CC0
                        </span>
                      )}
                      {scanResult.badge === "yellow" && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 font-mono text-xs font-bold">
                          <ShieldAlert className="w-4 h-4" />
                          🟡 YELLOW: Teardown Press Kit (Attribution Required)
                        </span>
                      )}
                      {scanResult.badge === "red" && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/40 text-red-400 font-mono text-xs font-bold">
                          <ShieldX className="w-4 h-4" />
                          🔴 RED: Paid Teardown / Stock Agency / High Risk
                        </span>
                      )}
                    </div>

                    {/* 1-Click Redraw Escape Hatch */}
                    <button
                      type="button"
                      onClick={() => handleApplyRedraw(figIdx)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      1-Click Redraw Escape Hatch
                    </button>
                  </div>

                  <p className="text-xs text-[var(--muted)] font-mono mt-2">
                    {scanResult.legalClassification}
                  </p>
                  <p className="text-[11px] text-[var(--text)] font-mono mt-1">
                    Caption recommendation: <em>{scanResult.recommendedCaption}</em>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Figcaption & Source Footer */}
        <figcaption className="p-3 text-xs font-mono text-[var(--muted)] border-t border-[var(--border)] flex justify-between items-center gap-2">
          <span>{fig.caption || selectedImg?.title || ""}</span>
          <span className="text-[10px] text-[var(--accent)] uppercase tracking-wider font-semibold">
            {fig.source || selectedImg?.source || "TEARDOWN ARCHIVE"}
          </span>
        </figcaption>
      </figure>
    );
  };

  // Section card renderer (6 to 7 modular sections)
  const renderSectionCard = (sec: DraftSection, secIdx: number) => {
    const isEditor = sec.type === "editor";

    return (
      <div
        key={sec.id}
        className={`my-6 rounded-xl border-2 transition-all p-5 font-mono text-sm shadow-md ${
          sec.hidden
            ? "border-[var(--border)] bg-[var(--surface)]/40 opacity-50"
            : isEditor
            ? "border-emerald-500/40 bg-[var(--surface)]"
            : "border-[var(--border)] bg-[var(--surface)]"
        }`}
      >
        {/* Section Card Control Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-[var(--border)] pb-3 mb-3 gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                isEditor
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
              }`}
            >
              {isEditor ? "[Your Section]" : "[AI Fill]"}
            </span>
            <span className="font-serif text-base font-semibold text-[var(--text)]">
              {sec.heading}
            </span>
            {sec.hidden && (
              <span className="text-xs text-red-400 font-mono">(Hidden from output)</span>
            )}
          </div>

          {/* Action buttons: Reorder, 1-Click Hide */}
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => moveSection(secIdx, "up")}
              disabled={secIdx === 0}
              className="p-1 rounded border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-30"
              title="Move Section Up"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => moveSection(secIdx, "down")}
              disabled={secIdx === activeSections.length - 1}
              className="p-1 rounded border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-30"
              title="Move Section Down"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => toggleSectionHide(sec.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded border font-mono text-[11px] font-semibold transition-all ${
                sec.hidden
                  ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                  : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {sec.hidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {sec.hidden ? "Restore" : "1-Click Hide"}
            </button>
          </div>
        </div>

        {/* Preset Refocus Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4 pb-2 border-b border-[var(--border)] text-[10px]">
          <span className="text-[var(--muted)] uppercase font-semibold mr-1">Refocus Section:</span>
          {[
            { mode: "math", label: "📐 Deepen Math" },
            { mode: "tradeoffs", label: "⚖️ Compare Material Tradeoffs" },
            { mode: "rules", label: "📋 Add Design Rules" },
            { mode: "simplify", label: "💡 Simplify" },
          ].map((item) => (
            <button
              key={item.mode}
              type="button"
              onClick={() => refocusSection(sec.id, item.mode as any)}
              disabled={refocusingSecId === sec.id}
              className="px-2 py-0.5 rounded bg-[var(--card-inner)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all font-mono"
            >
              {refocusingSecId === sec.id ? "Refocusing..." : item.label}
            </button>
          ))}
        </div>

        {/* Section Prose / Component Content */}
        <div className="space-y-4 text-xs sm:text-sm font-sans leading-relaxed text-[var(--text)]">
          {sec.content.split("\n\n").map((para, pIdx) => {
            const trimmed = para.trim();
            if (trimmed.startsWith("### ")) {
              return null; // Heading is rendered in header bar
            }
            if (trimmed.startsWith("$$") && trimmed.endsWith("$$")) {
              const math = trimmed.slice(2, -2).trim();
              let html = "";
              try {
                html = katex.renderToString(math, { displayMode: true, throwOnError: false });
              } catch {
                html = math;
              }
              return (
                <div
                  key={pIdx}
                  className="rounded-lg bg-[var(--card-inner)] border border-[var(--border)] p-3 text-center my-3 overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              );
            }
            if (trimmed.includes("{{ FIGURE_0 }}")) return renderVisualSwitcherFigure(0);
            if (trimmed.includes("{{ FIGURE_1 }}")) return renderVisualSwitcherFigure(1);
            if (trimmed.includes("{{ FIGURE_2 }}")) return renderVisualSwitcherFigure(2);
            if (trimmed.includes("{{ FIGURE_3 }}")) return renderVisualSwitcherFigure(3);

            return <p key={pIdx}>{para}</p>;
          })}
        </div>
      </div>
    );
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
          All staged drafts have been reviewed. Run the harvester to maintain the 40+ draft volume floor.
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

      {/* Runway Alert & Queue Tracker Banner */}
      <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {runwayAlert ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-400 font-mono text-xs font-bold animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                3-DAY RUNWAY ALERT ({approvedCount} in buffer)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-400 font-mono text-xs font-bold">
                <Check className="w-3.5 h-3.5" />
                Buffer Healthy ({approvedCount} in buffer)
              </span>
            )}

            <span className="font-mono text-xs text-[var(--muted)]">
              Needs Review: <span className="text-[var(--text)] font-bold">{drafts.length}</span> (Floor: 40)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSeedBox(!showSeedBox)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)] font-mono text-xs font-semibold hover:bg-[var(--accent)]/20 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Quick Topic Seed (Anchor & Fill)
            </button>
          </div>
        </div>

        {/* Quick Seed Box Drawer */}
        {showSeedBox && (
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <h4 className="text-sm font-serif text-[var(--text)] font-semibold mb-1">
              Manual Topic Seeding ("Anchor & Fill")
            </h4>
            <p className="text-xs text-[var(--muted)] font-mono mb-3">
              Drop a topic and optional section bullets. Editor bullets become <code className="text-emerald-400">[Your Section]</code> and structural transitions become <code className="text-amber-400">[AI Fill]</code>.
            </p>

            <div className="space-y-3 mb-3">
              <input
                type="text"
                placeholder="Topic Title (e.g. Strain Wave Gearing: Surviving 10^7 Cycles in Robot Joints)"
                value={seedTopic}
                onChange={(e) => setSeedTopic(e.target.value)}
                className="w-full bg-[var(--card-inner)] border border-[var(--border)] rounded px-3 py-2 text-xs text-[var(--text)] font-mono focus:outline-none focus:border-[var(--accent)]"
              />
              <textarea
                placeholder="Optional custom section bullets (one per line)..."
                rows={3}
                value={seedBullets}
                onChange={(e) => setSeedBullets(e.target.value)}
                className="w-full bg-[var(--card-inner)] border border-[var(--border)] rounded px-3 py-2 text-xs text-[var(--text)] font-mono focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleSeedSubmit("full")}
                disabled={seedLoading}
                className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-mono text-xs font-bold hover:bg-[var(--accent-hover)] shadow flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                {seedLoading ? "Building..." : "Generate Full Draft (Stack on Top)"}
              </button>
              <button
                type="button"
                onClick={() => handleSeedSubmit("outline")}
                disabled={seedLoading}
                className="px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] font-mono text-xs hover:border-[var(--muted)]"
              >
                Preview 6-Section Outline First
              </button>
            </div>

            {/* Outline Card Preview Modal/Drawer */}
            {outlinePreview && (
              <div className="mt-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--card-inner)]">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-mono font-bold text-[var(--accent)] uppercase">
                    Lightweight 6-Section Outline Card
                  </span>
                  <button
                    type="button"
                    onClick={() => setOutlinePreview(null)}
                    className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-2 mb-4">
                  {outlinePreview.sections.map((sec: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-[var(--text)]">
                        {idx + 1}. {sec.heading}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          sec.type === "editor"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {sec.badge}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleSeedSubmit("full")}
                  disabled={seedLoading}
                  className="w-full py-2 rounded bg-[var(--accent)] text-white font-mono text-xs font-bold hover:bg-[var(--accent-hover)]"
                >
                  Approve Outline & Generate Full Draft
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Triage Header Bar */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/15 text-[var(--accent)] font-mono text-[11px] font-semibold tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            90-SECOND MODULAR EDITOR
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

      {/* 1-Click Title Bar with 4 Distinct Headline Angles */}
      <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="text-[10px] font-mono uppercase font-bold text-[var(--muted)] mb-2 flex items-center justify-between">
          <span>1-Click Title Bar (Select Headline Angle)</span>
          <button
            type="button"
            onClick={() => setIsEditingTitle(!isEditingTitle)}
            className="text-[var(--accent)] hover:underline flex items-center gap-1"
          >
            <Edit2 className="w-3 h-3" />
            {isEditingTitle ? "Done Editing" : "Custom Edit"}
          </button>
        </div>

        {/* 4 Headline Angle Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {[
            { key: "mechanism", label: "⚙️ Mechanism-Focused" },
            { key: "tradeoff", label: "⚖️ Design Tradeoff" },
            { key: "teardown", label: "🔬 Teardown Case Study" },
            { key: "failureMode", label: "⚠️ Failure Mode" },
          ].map((angle) => (
            <button
              key={angle.key}
              type="button"
              onClick={() => selectTitleAngle(angle.key as any)}
              className={`p-2 rounded-lg border text-left text-xs font-mono transition-all ${
                activeTitleAngle === angle.key
                  ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)] font-bold shadow"
                  : "border-[var(--border)] bg-[var(--card-inner)] text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {angle.label}
            </button>
          ))}
        </div>

        {/* Live Headline Display / Input */}
        {isEditingTitle ? (
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            className="w-full bg-[var(--card-inner)] border border-[var(--accent)] rounded p-2 text-xl sm:text-2xl font-serif text-[var(--text)] focus:outline-none"
            autoFocus
          />
        ) : (
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-normal tracking-tight text-[var(--text)] m-0 leading-tight">
            {editedTitle || activeDraft.title}
          </h1>
        )}
      </div>

      {/* Subtitle */}
      {activeDraft.subtitle && (
        <p className="text-base sm:text-lg text-[var(--muted)] leading-relaxed mt-2 mb-6 font-sans">
          {activeDraft.subtitle}
        </p>
      )}

      {/* Modular Section Cards */}
      <div className="space-y-4">
        {activeSections.map((sec, idx) => renderSectionCard(sec, idx))}
      </div>

      {/* Floating Bottom Triage Action Dock */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-[var(--surface)]/95 border-t border-[var(--border)] backdrop-blur-xl px-4 py-3 sm:py-4 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          {/* Veto Button with the 4 standard blueprint tags */}
          <button
            type="button"
            onClick={() => setShowVetoModal(true)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 font-mono text-xs sm:text-sm font-semibold hover:bg-red-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
            <span>VETO TOPIC</span>
          </button>

          {/* Approve to Buffer Button (Dual-Track 10-15 buffer) */}
          <button
            type="button"
            onClick={() => handleApprove("buffer")}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-[var(--accent)]/50 bg-[var(--accent)]/15 text-[var(--accent)] font-mono text-xs sm:text-sm font-bold hover:bg-[var(--accent)]/25 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Archive className="w-4 h-4 stroke-[2.5]" />
            <span>APPROVE TO BUFFER</span>
          </button>

          {/* Approve & Publish Immediately Button */}
          <button
            type="button"
            onClick={() => handleApprove("publish")}
            disabled={loading}
            className="flex-2 flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-mono text-xs sm:text-sm font-bold shadow-lg shadow-[var(--accent)]/20 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>APPROVE & PUBLISH ISSUE</span>
          </button>
        </div>
      </div>

      {/* Veto Reason Modal with the 4 Blueprint Tags */}
      {showVetoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400 font-mono text-xs uppercase font-bold mb-3">
              <AlertTriangle className="w-4 h-4" />
              <span>Veto Negative Constraint</span>
            </div>

            <h3 className="text-xl font-serif text-[var(--text)] mb-1">
              Select Veto Tag for this Topic
            </h3>
            <p className="text-xs text-[var(--muted)] font-mono mb-4">
              Your feedback is appended to <code className="text-[var(--accent)]">vetoes.json</code> to enforce strict negative constraints for future AI generation.
            </p>

            {/* The 4 Blueprint Tags */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {["[Too Niche]", "[Too Broad]", "[Not Relevant]", "[Factual/Math Error]"].map(
                (reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedVetoReason(reason)}
                    className={`px-3 py-2 rounded-lg font-mono text-xs transition-colors text-center ${
                      selectedVetoReason === reason
                        ? "bg-red-500 text-white font-bold"
                        : "bg-[var(--card-inner)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--muted)]"
                    }`}
                  >
                    {reason}
                  </button>
                )
              )}
            </div>

            {/* Custom Critique Text */}
            <textarea
              value={customCritique}
              onChange={(e) => setCustomCritique(e.target.value)}
              placeholder="Optional: Specify physical or engineering reasons..."
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
