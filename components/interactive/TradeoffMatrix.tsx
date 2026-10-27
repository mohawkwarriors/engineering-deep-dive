"use client";

import React, { useState } from "react";
import { GitCompare, Award, Check } from "lucide-react";

export interface TradeoffCandidate {
  name: string;
  category: string;
  metrics: Record<string, string | number>;
  bestFor: string;
  bottleneck: string;
}

export interface MetricDefinition {
  key: string;
  label: string;
  unit?: string;
  higherIsBetter?: boolean;
}

export interface TradeoffMatrixProps {
  title: string;
  subtitle?: string;
  candidates?: TradeoffCandidate[];
  metricDefinitions?: MetricDefinition[];
  defaultSelectedCandidate?: number;
  takeaway?: string;
}

const DEFAULT_CANDIDATES: TradeoffCandidate[] = [
  {
    name: "Carburized 8620 Steel",
    category: "Case-Hardened Alloy",
    metrics: { hardness: "60 HRC", yield: "1,150 MPa", thermal: "46 W/m·K", cost: "1.4x" },
    bestFor: "High-cycle gear teeth and rolling contact cam tracks",
    bottleneck: "Post-heat-treat distortion requires CBN hard-finishing grind",
  },
  {
    name: "Pre-Hardened 4140",
    category: "Through-Hardened Alloy",
    metrics: { hardness: "42 HRC", yield: "950 MPa", thermal: "42 W/m·K", cost: "1.0x" },
    bestFor: "Structural shafts and medium-duty actuator housings",
    bottleneck: "Lower surface pitting resistance under boundary lubrication",
  },
  {
    name: "Ti-6Al-4V Grade 5",
    category: "Aerospace Titanium",
    metrics: { hardness: "36 HRC", yield: "880 MPa", thermal: "6.7 W/m·K", cost: "4.2x" },
    bestFor: "Low-inertia compliant flexures and mass-critical gimbals",
    bottleneck: "Severe galling tendency without DLC or nitride surface coating",
  },
];

const DEFAULT_METRICS: MetricDefinition[] = [
  { key: "hardness", label: "Surface Hardness" },
  { key: "yield", label: "Yield Strength" },
  { key: "thermal", label: "Thermal Cond." },
  { key: "cost", label: "Rel. Cost Index" },
];

export function TradeoffMatrix({
  title,
  subtitle,
  candidates = DEFAULT_CANDIDATES,
  metricDefinitions = DEFAULT_METRICS,
  defaultSelectedCandidate = 0,
  takeaway,
}: TradeoffMatrixProps) {
  const [selectedIdx, setSelectedIdx] = useState(defaultSelectedCandidate);
  const [highlightMetric, setHighlightMetric] = useState<string | null>(null);

  const activeCandidate = candidates[selectedIdx] || candidates[0];

  return (
    <div className="my-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 font-mono text-sm text-[var(--text)] shadow-lg not-prose">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border)] pb-3 mb-4 gap-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
            <GitCompare className="w-3.5 h-3.5" />
            Engineering Tradeoff Matrix
          </span>
          <h4 className="text-sm sm:text-base font-mono font-bold text-[var(--text)] tracking-tight mt-1">{title}</h4>
          {subtitle && <p className="text-xs text-[var(--muted)] mt-0.5 font-mono">{subtitle}</p>}
        </div>

        {/* Metric Highlighters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-[var(--muted)] uppercase mr-1">Highlight:</span>
          {metricDefinitions.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setHighlightMetric(highlightMetric === m.key ? null : m.key)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                highlightMetric === m.key
                  ? "bg-[var(--accent)] text-white font-bold shadow"
                  : "bg-[var(--card-inner)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto mb-4 rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[var(--surface-hover)] border-b border-[var(--border)] text-[var(--muted)] uppercase text-[10px]">
            <tr>
              <th className="p-3">Candidate Alloy / Process</th>
              {metricDefinitions.map((m) => (
                <th
                  key={m.key}
                  className={`p-3 transition-colors ${
                    highlightMetric === m.key ? "text-[var(--accent)] bg-[var(--accent)]/10 font-bold" : ""
                  }`}
                >
                  {m.label} {m.unit ? `(${m.unit})` : ""}
                </th>
              ))}
              <th className="p-3">Select</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] bg-[var(--card-inner)]">
            {candidates.map((cand, idx) => {
              const isSelected = idx === selectedIdx;
              return (
                <tr
                  key={cand.name}
                  onClick={() => setSelectedIdx(idx)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? "bg-[var(--accent)]/10" : "hover:bg-[var(--surface)]/60"
                  }`}
                >
                  <td className="p-3">
                    <div className="font-semibold text-[var(--text)]">{cand.name}</div>
                    <div className="text-[10px] text-[var(--muted)]">{cand.category}</div>
                  </td>

                  {metricDefinitions.map((m) => (
                    <td
                      key={m.key}
                      className={`p-3 font-semibold ${
                        highlightMetric === m.key
                          ? "text-[var(--accent)] bg-[var(--accent)]/10"
                          : "text-[var(--text)]"
                      }`}
                    >
                      {cand.metrics[m.key] ?? "—"}
                    </td>
                  ))}

                  <td className="p-3">
                    <button
                      type="button"
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-[var(--accent)] text-white shadow"
                          : "border border-[var(--border)] text-transparent hover:border-[var(--muted)]"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected Candidate Detailed Verdict Card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-inner)] p-4">
        <div className="flex items-center gap-2 mb-2 text-xs">
          <Award className="w-4 h-4 text-[var(--accent)]" />
          <span className="font-mono uppercase font-bold text-[var(--accent)]">
            Deep-Dive Assessment: {activeCandidate.name}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans mt-2">
          <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <span className="font-mono text-[10px] uppercase font-bold text-emerald-400 block mb-1">
              Sweet Spot / Ideal Architecture:
            </span>
            <p className="text-[var(--text)] leading-relaxed">{activeCandidate.bestFor}</p>
          </div>

          <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <span className="font-mono text-[10px] uppercase font-bold text-amber-400 block mb-1">
              Manufacturing & Physics Bottleneck:
            </span>
            <p className="text-[var(--text)] leading-relaxed">{activeCandidate.bottleneck}</p>
          </div>
        </div>
      </div>

      {/* Takeaway Rule */}
      {takeaway && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-3 text-xs text-[var(--text)]">
          <GitCompare className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase tracking-wider text-[var(--accent)]">Selection Directive: </span>
            <span className="font-sans leading-relaxed">{takeaway}</span>
          </div>
        </div>
      )}
    </div>
  );
}
