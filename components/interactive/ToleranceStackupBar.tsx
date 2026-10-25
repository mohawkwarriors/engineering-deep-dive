"use client";

import React, { useState } from "react";
import { BarChart3, ToggleLeft, ToggleRight, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export interface StackupComponent {
  name: string;
  nominal: number;
  tolerance: number; // ± tolerance in mm
  direction: "+" | "-"; // Adds or subtracts from the gap
  description?: string;
}

export interface ToleranceStackupBarProps {
  title: string;
  subtitle?: string;
  components?: StackupComponent[];
  minAllowableGap: number; // e.g. 0.05 mm
  maxAllowableGap: number; // e.g. 0.35 mm
  unit?: string;
  takeaway?: string;
}

const DEFAULT_STACKUP_COMPONENTS: StackupComponent[] = [
  { name: "Housing Bore Datum", nominal: 24.05, tolerance: 0.015, direction: "+", description: "CNC precision ground inner bore" },
  { name: "Bearing Outer Ring", nominal: 12.0, tolerance: 0.008, direction: "-", description: "ISO P4 tolerance class" },
  { name: "Preload Wave Washer", nominal: 1.5, tolerance: 0.012, direction: "-", description: "17-7 PH stainless spring element" },
  { name: "Retaining Shoulder", nominal: 10.5, tolerance: 0.01, direction: "-", description: "Turned shaft journal datum" },
];

export function ToleranceStackupBar({
  title,
  subtitle,
  components = DEFAULT_STACKUP_COMPONENTS,
  minAllowableGap = 0.015,
  maxAllowableGap = 0.085,
  unit = "mm",
  takeaway,
}: ToleranceStackupBarProps) {
  const [mode, setMode] = useState<"worst-case" | "rss">("worst-case");

  // Calculate nominal gap
  const nominalGap = components.reduce((acc, c) => {
    return c.direction === "+" ? acc + c.nominal : acc - c.nominal;
  }, 0);

  // Worst-case variation: Arithmetic sum of all tolerances
  const worstCaseVariation = components.reduce((acc, c) => acc + c.tolerance, 0);

  // RSS variation: Sqrt of sum of squares
  const rssVariation = Math.sqrt(
    components.reduce((acc, c) => acc + Math.pow(c.tolerance, 2), 0)
  );

  const activeVariation = mode === "worst-case" ? worstCaseVariation : rssVariation;
  const minGap = nominalGap - activeVariation;
  const maxGap = nominalGap + activeVariation;

  const isCompliant = minGap >= minAllowableGap && maxGap <= maxAllowableGap;
  const isNearBoundary =
    (minGap >= minAllowableGap && minGap <= minAllowableGap + 0.02) ||
    (maxGap <= maxAllowableGap && maxGap >= maxAllowableGap - 0.02);

  return (
    <div className="my-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 font-mono text-sm text-[var(--text)] shadow-lg not-prose">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border)] pb-3 mb-4 gap-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Tolerance Stackup Analyzer
          </span>
          <h4 className="text-base font-serif text-[var(--text)] font-semibold mt-0.5">{title}</h4>
          {subtitle && <p className="text-xs text-[var(--muted)] mt-0.5 font-sans">{subtitle}</p>}
        </div>

        {/* Mode Toggle Switch */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-[var(--card-inner)] border border-[var(--border)] p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setMode("worst-case")}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              mode === "worst-case"
                ? "bg-[var(--accent)] text-white shadow"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            Worst-Case (100%)
          </button>
          <button
            type="button"
            onClick={() => setMode("rss")}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              mode === "rss"
                ? "bg-[var(--accent)] text-white shadow"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            RSS Statistical (±3σ)
          </button>
        </div>
      </div>

      {/* Component Contributions Table */}
      <div className="overflow-x-auto mb-4 rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[var(--surface-hover)] border-b border-[var(--border)] text-[var(--muted)] uppercase text-[10px]">
            <tr>
              <th className="p-2.5">Feature / Dimension</th>
              <th className="p-2.5">Direction</th>
              <th className="p-2.5">Nominal</th>
              <th className="p-2.5">Tolerance</th>
              <th className="p-2.5">Variance Contribution</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] bg-[var(--card-inner)]">
            {components.map((c, i) => {
              const variancePct =
                worstCaseVariation > 0 ? ((c.tolerance / worstCaseVariation) * 100).toFixed(1) : "0";
              return (
                <tr key={i} className="hover:bg-[var(--surface)]/50">
                  <td className="p-2.5 text-[var(--text)] font-medium">{c.name}</td>
                  <td className="p-2.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        c.direction === "+" ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10"
                      }`}
                    >
                      {c.direction === "+" ? "+ Opening" : "- Closing"}
                    </span>
                  </td>
                  <td className="p-2.5 text-[var(--text)]">
                    {c.nominal.toFixed(3)} {unit}
                  </td>
                  <td className="p-2.5 text-[var(--accent)]">
                    ±{c.tolerance.toFixed(3)} {unit}
                  </td>
                  <td className="p-2.5 text-[var(--muted)]">{variancePct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Visual Clearance Range Bar */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-inner)] p-4 mb-4">
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="text-[var(--muted)] uppercase tracking-wider text-[10px]">
            Resulting Clearance Distribution ({mode === "worst-case" ? "Arithmetic Extreme" : "Gaussian 99.73%"})
          </span>
          <div className="flex items-center gap-1.5 font-bold">
            {isCompliant && !isNearBoundary && (
              <span className="text-emerald-400 flex items-center gap-1 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Process Capable (Cpk &gt; 1.33)
              </span>
            )}
            {isCompliant && isNearBoundary && (
              <span className="text-amber-400 flex items-center gap-1 text-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                Tight Margin (Cpk ~ 1.0)
              </span>
            )}
            {!isCompliant && (
              <span className="text-red-400 flex items-center gap-1 text-xs">
                <XCircle className="w-3.5 h-3.5" />
                Interference Risk
              </span>
            )}
          </div>
        </div>

        {/* Range Metrics Summary */}
        <div className="grid grid-cols-3 gap-2 text-center p-2.5 bg-[var(--surface)] rounded-lg border border-[var(--border)] mb-3">
          <div>
            <div className="text-[10px] text-[var(--muted)] uppercase">Min Limit</div>
            <div className={`text-sm font-bold ${minGap < minAllowableGap ? "text-red-400" : "text-[var(--text)]"}`}>
              {minGap.toFixed(3)} {unit}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--muted)] uppercase">Nominal Gap</div>
            <div className="text-sm font-bold text-[var(--accent)]">{nominalGap.toFixed(3)} {unit}</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--muted)] uppercase">Max Limit</div>
            <div className={`text-sm font-bold ${maxGap > maxAllowableGap ? "text-red-400" : "text-[var(--text)]"}`}>
              {maxGap.toFixed(3)} {unit}
            </div>
          </div>
        </div>

        {/* Visual Bar Graph */}
        <div className="relative h-7 w-full bg-[var(--surface-hover)] rounded-md overflow-hidden border border-[var(--border)] flex items-center">
          {/* Allowable safe zone background */}
          <div className="absolute inset-0 bg-emerald-500/10" />

          {/* Actual Stackup Range */}
          <div
            className={`h-full opacity-80 transition-all duration-300 ${
              isCompliant ? "bg-[var(--accent)]" : "bg-red-500"
            }`}
            style={{
              marginLeft: "15%",
              width: mode === "worst-case" ? "70%" : "48%",
            }}
          />

          {/* Nominal marker line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white z-10" />
        </div>

        <div className="flex justify-between text-[10px] text-[var(--muted)] mt-1.5 font-mono">
          <span>Target Min: {minAllowableGap.toFixed(3)} {unit}</span>
          <span>Nominal Design Center</span>
          <span>Target Max: {maxAllowableGap.toFixed(3)} {unit}</span>
        </div>
      </div>

      {/* Takeaway Rule */}
      {takeaway && (
        <div className="flex items-start gap-2 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-3 text-xs text-[var(--text)]">
          <AlertTriangle className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase tracking-wider text-[var(--accent)]">Stackup Rule: </span>
            <span className="font-sans leading-relaxed">{takeaway}</span>
          </div>
        </div>
      )}
    </div>
  );
}
