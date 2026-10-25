"use client";

import React, { useState, useId } from "react";
import katex from "katex";
import { Sliders, Activity, Info } from "lucide-react";

export interface ParameterConfig {
  name: string;
  symbol: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit: string;
  description?: string;
}

export interface ParameterExplorerProps {
  title: string;
  subtitle?: string;
  equationTex: string;
  parameters?: ParameterConfig[];
  calculate?: (values: Record<string, number>) => {
    outputLabel: string;
    outputValue: number;
    outputUnit: string;
    points?: { x: number; y: number }[];
    status?: "nominal" | "warning" | "critical";
    verdict?: string;
  };
  takeaway?: string;
}

const DEFAULT_PARAMETERS: ParameterConfig[] = [
  { name: "Applied Load", symbol: "F_n", min: 50, max: 1200, step: 25, defaultValue: 450, unit: "N", description: "Normal interfacial contact load" },
  { name: "Contact Radius", symbol: "R^*", min: 2, max: 40, step: 1, defaultValue: 12, unit: "mm", description: "Effective radius of curvature" },
  { name: "Notch Factor", symbol: "K_t", min: 1.0, max: 2.5, step: 0.05, defaultValue: 1.25, unit: "", description: "Geometric stress concentration factor" },
];

const DEFAULT_CALCULATE = (vals: Record<string, number>) => {
  const fn = vals["Applied Load"] ?? 450;
  const r = vals["Contact Radius"] ?? 12;
  const kt = vals["Notch Factor"] ?? 1.25;
  const stress = Math.round(Math.sqrt((fn * 210000) / (Math.PI * r * 10)) * kt);
  return {
    outputLabel: "Peak Hertzian Contact Stress",
    outputValue: stress,
    outputUnit: "MPa",
    status: (stress > 1500 ? "critical" : stress > 1100 ? "warning" : "nominal") as "nominal" | "warning" | "critical",
    verdict: stress > 1500 ? "Exceeds fatigue endurance limit — increase radius R*" : "Within safe elastic envelope",
  };
};

export function ParameterExplorer({
  title,
  subtitle,
  equationTex,
  parameters = DEFAULT_PARAMETERS,
  calculate = DEFAULT_CALCULATE,
  takeaway,
}: ParameterExplorerProps) {
  const componentId = useId();
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    parameters.forEach((p) => {
      init[p.name] = p.defaultValue;
    });
    return init;
  });

  const handleChange = (name: string, val: number) => {
    setValues((prev) => ({ ...prev, [name]: val }));
  };

  let renderedEq = "";
  try {
    renderedEq = katex.renderToString(equationTex, {
      displayMode: true,
      throwOnError: false,
    });
  } catch {
    renderedEq = equationTex;
  }

  const result = calculate(values);

  // Status color badge
  const statusColor =
    result.status === "critical"
      ? "text-red-400 border-red-500/40 bg-red-500/10"
      : result.status === "warning"
      ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
      : "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";

  return (
    <div className="my-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 font-mono text-sm text-[var(--text)] shadow-lg not-prose">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" />
            Interactive Parameter Explorer
          </span>
          <h4 className="text-base font-serif text-[var(--text)] font-semibold mt-0.5">{title}</h4>
          {subtitle && <p className="text-xs text-[var(--muted)] mt-0.5 font-sans">{subtitle}</p>}
        </div>
      </div>

      {/* Governing Equation */}
      <div className="rounded-lg bg-[var(--card-inner)] border border-[var(--border)] p-3 text-center mb-4">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">Governing Physical Relation</div>
        <div
          className="text-sm sm:text-base text-[var(--text)] overflow-x-auto py-1"
          dangerouslySetInnerHTML={{ __html: renderedEq }}
        />
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {parameters.map((param) => {
          const currentVal = values[param.name] ?? param.defaultValue;
          return (
            <div
              key={param.name}
              className="rounded-lg border border-[var(--border)] bg-[var(--card-inner)] p-3"
            >
              <div className="flex justify-between items-center mb-1.5 text-xs">
                <span className="text-[var(--text)] font-medium">
                  {param.symbol ? `${param.symbol} (${param.name})` : param.name}
                </span>
                <span className="text-[var(--accent)] font-bold">
                  {currentVal.toLocaleString()} {param.unit}
                </span>
              </div>
              <input
                type="range"
                min={param.min}
                max={param.max}
                step={param.step}
                value={currentVal}
                onChange={(e) => handleChange(param.name, parseFloat(e.target.value))}
                className="w-full accent-[var(--accent)] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[var(--muted)] mt-1">
                <span>{param.min} {param.unit}</span>
                <span>{param.max} {param.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Computed Output Card */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card-inner)] p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[var(--accent)] animate-pulse" />
          <div>
            <div className="text-[11px] text-[var(--muted)] uppercase tracking-wider">{result.outputLabel}</div>
            <div className="text-xl sm:text-2xl font-bold text-[var(--text)]">
              {Number.isInteger(result.outputValue) ? result.outputValue : result.outputValue.toFixed(2)}{" "}
              <span className="text-sm font-normal text-[var(--muted)]">{result.outputUnit}</span>
            </div>
          </div>
        </div>

        {result.verdict && (
          <div className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${statusColor}`}>
            {result.verdict}
          </div>
        )}
      </div>

      {/* Dynamic Curve Mini-Plot (if points available) */}
      {result.points && result.points.length > 1 && (
        <div className="mt-4 p-3 rounded-lg bg-[var(--card-inner)] border border-[var(--border)]">
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-2">Dynamic Characteristic Response</div>
          <svg className="w-full h-24 overflow-visible" viewBox="0 0 300 80">
            {/* Grid line */}
            <line x1="0" y1="40" x2="300" y2="40" stroke="var(--border)" strokeDasharray="3 3" />
            {/* Computed line */}
            <polyline
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2.5"
              points={result.points
                .map((pt, idx) => `${(idx / (result.points!.length - 1)) * 300},${80 - Math.max(5, Math.min(75, pt.y))}`)
                .join(" ")}
            />
          </svg>
        </div>
      )}

      {/* Takeaway footer */}
      {takeaway && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-3 text-xs text-[var(--text)]">
          <Info className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase tracking-wider text-[var(--accent)]">Design Rule: </span>
            <span className="font-sans leading-relaxed">{takeaway}</span>
          </div>
        </div>
      )}
    </div>
  );
}
