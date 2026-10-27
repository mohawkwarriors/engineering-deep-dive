"use client";

import React, { useState } from "react";
import { Layers, Ruler, AlertCircle } from "lucide-react";

export interface StackupLayer {
  name: string;
  thickness: string; // e.g. "0.08 mm"
  material: string; // e.g. "C1100 Oxygen-Free Copper"
  functionRole: string; // e.g. "Hermetic seal & structural skin"
  failureMode?: string; // e.g. "Pinhole puncture under laser seam micro-porosity"
  color?: string; // CSS color string or accent token
}

export interface LayeredCrossSectionProps {
  title: string;
  subtitle?: string;
  totalThickness?: string; // e.g. "0.35 mm"
  layers?: StackupLayer[];
  takeaway?: string;
}

const DEFAULT_LAYERS: StackupLayer[] = [
  { name: "Top Hermetic Stamped Shell", thickness: "0.08 mm", material: "C10200 OFHC Copper", functionRole: "Evaporator hot-spot conduction & vacuum seal", failureMode: "Atmospheric buckling if pillar pitch exceeds 1.5 mm" },
  { name: "Biporous Sintered Wick", thickness: "0.06 mm", material: "Sintered Cu Micro-Powder (35 μm)", functionRole: "Young-Laplace capillary suction return", failureMode: "Local evaporator dry-out above 95 W/cm²" },
  { name: "Vapor Core & Pillar Array", thickness: "0.13 mm", material: "Saturated H2O Vapor @ 10^-3 Torr", functionRole: "Near-sonic two-phase latent heat spreading", failureMode: "Sonic choking at low cold-start temperatures" },
  { name: "Bottom Condenser Foil", thickness: "0.08 mm", material: "C10200 OFHC Copper + Ni Plate", functionRole: "Heat rejection to chassis mid-frame", failureMode: "Perimeter laser weld micro-pinhole gas ingress" },
];

export function LayeredCrossSection({
  title,
  subtitle,
  totalThickness = "0.35 mm",
  layers = DEFAULT_LAYERS,
  takeaway,
}: LayeredCrossSectionProps) {
  const [activeLayerIdx, setActiveLayerIdx] = useState(0);

  const activeLayer = layers[activeLayerIdx] || layers[0];

  const defaultColors = [
    "bg-amber-600/80 border-amber-500",
    "bg-cyan-700/80 border-cyan-500",
    "bg-stone-600/80 border-stone-400",
    "bg-rose-700/80 border-rose-500",
    "bg-emerald-700/80 border-emerald-500",
    "bg-amber-700/80 border-amber-600",
  ];

  return (
    <div className="my-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 font-mono text-sm text-[var(--text)] shadow-lg not-prose">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Layered Cross-Section Breakdown
          </span>
          <h4 className="text-sm sm:text-base font-mono font-bold text-[var(--text)] tracking-tight mt-1">{title}</h4>
          {subtitle && <p className="text-xs text-[var(--muted)] mt-0.5 font-mono">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--card-inner)] border border-[var(--border)] text-xs font-mono">
          <Ruler className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="text-[var(--muted)] text-[10px] uppercase">Envelope:</span>
          <span className="text-[var(--text)] font-bold">{totalThickness}</span>
        </div>
      </div>

      {/* Exploded Visual Stackup Diagram */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-inner)] p-5 mb-4">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-3">
          Interactive Micro-Layer Stackup (Click layer to inspect)
        </div>

        <div className="space-y-2 max-w-lg mx-auto py-2">
          {layers.map((layer, idx) => {
            const isSelected = idx === activeLayerIdx;
            const colorClass = layer.color || defaultColors[idx % defaultColors.length];

            return (
              <div
                key={idx}
                onClick={() => setActiveLayerIdx(idx)}
                className={`group cursor-pointer rounded-lg border-2 p-3 transition-all duration-200 flex items-center justify-between gap-4 ${
                  isSelected
                    ? "border-[var(--accent)] bg-[var(--surface)] shadow-lg scale-[1.02] z-10"
                    : "border-[var(--border)] bg-[var(--surface)]/50 hover:border-[var(--muted)] hover:bg-[var(--surface)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3.5 h-8 rounded ${colorClass} flex-shrink-0`} />
                  <div>
                    <div className="text-xs sm:text-sm font-semibold text-[var(--text)] font-sans">
                      {layer.name}
                    </div>
                    <div className="text-[10px] text-[var(--muted)] font-mono">
                      {layer.material}
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 font-mono">
                  <span className="px-2 py-0.5 rounded bg-[var(--card-inner)] border border-[var(--border)] text-[11px] font-bold text-[var(--accent)]">
                    {layer.thickness}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Layer Microstructure & Failure Mode Detail */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-inner)] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs uppercase font-bold text-[var(--accent)]">
            Layer Metrology: {activeLayer.name} ({activeLayer.thickness})
          </span>
          <span className="text-[10px] font-mono text-[var(--muted)]">
            Alloy: {activeLayer.material}
          </span>
        </div>

        <div className="space-y-2 text-xs font-sans">
          <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <span className="font-mono text-[10px] uppercase font-bold text-[var(--muted)] block mb-0.5">
              Functional Physics Role:
            </span>
            <p className="text-[var(--text)] leading-relaxed">{activeLayer.functionRole}</p>
          </div>

          {activeLayer.failureMode && (
            <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-red-900/30 text-red-300">
              <span className="font-mono text-[10px] uppercase font-bold text-red-400 flex items-center gap-1 mb-0.5">
                <AlertCircle className="w-3 h-3" />
                Yield & Failure Mechanism:
              </span>
              <p className="leading-relaxed text-xs">{activeLayer.failureMode}</p>
            </div>
          )}
        </div>
      </div>

      {/* Takeaway Rule */}
      {takeaway && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-3 text-xs text-[var(--text)]">
          <Ruler className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase tracking-wider text-[var(--accent)]">Stackup Limit: </span>
            <span className="font-sans leading-relaxed">{takeaway}</span>
          </div>
        </div>
      )}
    </div>
  );
}
