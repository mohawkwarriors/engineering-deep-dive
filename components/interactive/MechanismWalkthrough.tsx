"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, PlayCircle, Cpu, ShieldCheck } from "lucide-react";
import katex from "katex";

export interface WalkthroughStage {
  step: number;
  title: string;
  kinematicAction: string;
  stressDistribution: string;
  criticalMetric?: string;
  equationTex?: string;
}

export interface MechanismWalkthroughProps {
  title: string;
  subtitle?: string;
  stages?: WalkthroughStage[];
  takeaway?: string;
}

const DEFAULT_STAGES: WalkthroughStage[] = [
  { step: 1, title: "Preload Engagement", kinematicAction: "Input cam eccentric displaces rolling element into initial gothic-arch contact.", stressDistribution: "Symmetric 45° contact angle distributes preload across dual raceways.", criticalMetric: "0.005 mm axial play", equationTex: "F_{preload} = k_{axial} \cdot \delta_0" },
  { step: 2, title: "Peak Torque Transfer", kinematicAction: "Tangential load shifts contact ellipse toward tooth flank load-bearing zone.", stressDistribution: "Sub-surface octahedral shear stress peaks at 0.78a depth below surface.", criticalMetric: "1,420 MPa Hertzian peak", equationTex: "\tau_{max} \approx 0.30 \cdot p_0" },
  { step: 3, title: "Kinematic Zero-Cross & Return", kinematicAction: "Conjugate profile maintains conjugate rolling without backlash reversal.", stressDistribution: "Elastic strain energy recovers smoothly into output flange.", criticalMetric: "< 1.0 arcmin hysteresis", equationTex: "\eta_{mech} = 1 - \frac{W_{friction}}{W_{input}}" },
];

export function MechanismWalkthrough({
  title,
  subtitle,
  stages = DEFAULT_STAGES,
  takeaway,
}: MechanismWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const activeStage = stages[currentStep] || stages[0];

  let renderedEq = "";
  if (activeStage.equationTex) {
    try {
      renderedEq = katex.renderToString(activeStage.equationTex, {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      renderedEq = activeStage.equationTex;
    }
  }

  return (
    <div className="my-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 font-mono text-sm text-[var(--text)] shadow-lg not-prose">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
            <PlayCircle className="w-3.5 h-3.5" />
            Mechanism Motion Walkthrough
          </span>
          <h4 className="text-sm sm:text-base font-mono font-bold text-[var(--text)] tracking-tight mt-1">{title}</h4>
          {subtitle && <p className="text-xs text-[var(--muted)] mt-0.5 font-mono">{subtitle}</p>}
        </div>

        {/* Step Indicator */}
        <div className="text-xs text-[var(--muted)] font-mono">
          Stage <span className="text-[var(--accent)] font-bold">{currentStep + 1}</span> / {stages.length}
        </div>
      </div>

      {/* Stepper Pill Navigation */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        {stages.map((st, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setCurrentStep(idx)}
            className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-lg border text-xs font-mono font-semibold transition-all ${
              idx === currentStep
                ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)] shadow"
                : "border-[var(--border)] bg-[var(--card-inner)] text-[var(--muted)] hover:border-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            Stage {st.step || idx + 1}
          </button>
        ))}
      </div>

      {/* Active Stage Display Card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-inner)] p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[var(--accent)] text-white text-xs font-bold flex items-center justify-center">
              {activeStage.step || currentStep + 1}
            </span>
            <h5 className="text-sm sm:text-base font-bold text-[var(--text)] font-mono">
              {activeStage.title}
            </h5>
          </div>
          {activeStage.criticalMetric && (
            <span className="px-2.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[11px] font-mono text-[var(--accent)] flex-shrink-0">
              {activeStage.criticalMetric}
            </span>
          )}
        </div>

        <div className="space-y-3 text-xs sm:text-sm font-sans leading-relaxed text-[var(--text)]">
          <div>
            <span className="font-mono text-xs font-bold uppercase text-[var(--muted)] tracking-wider block mb-1">
              Kinematic Action:
            </span>
            <p className="text-[var(--text)]">{activeStage.kinematicAction}</p>
          </div>

          <div>
            <span className="font-mono text-xs font-bold uppercase text-[var(--muted)] tracking-wider block mb-1">
              Stress & Reaction Field:
            </span>
            <p className="text-[var(--muted)]">{activeStage.stressDistribution}</p>
          </div>

          {renderedEq && (
            <div className="mt-3 p-2.5 rounded bg-[var(--surface)] border border-[var(--border)] font-mono text-xs">
              <span className="text-[var(--muted)] text-[10px] uppercase block mb-1">Governing Stage Formulation:</span>
              <span dangerouslySetInnerHTML={{ __html: renderedEq }} className="text-[var(--accent)]" />
            </div>
          )}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
          disabled={currentStep === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card-inner)] text-xs text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)] disabled:opacity-30 transition-all font-mono"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous Stage
        </button>

        <button
          type="button"
          onClick={() => setCurrentStep((prev) => Math.min(stages.length - 1, prev + 1))}
          disabled={currentStep === stages.length - 1}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-bold hover:bg-[var(--accent-hover)] disabled:opacity-30 transition-all font-mono shadow"
        >
          Next Stage
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Takeaway footer */}
      {takeaway && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-3 text-xs text-[var(--text)]">
          <ShieldCheck className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase tracking-wider text-[var(--accent)]">Kinematic Constraint: </span>
            <span className="font-sans leading-relaxed">{takeaway}</span>
          </div>
        </div>
      )}
    </div>
  );
}
