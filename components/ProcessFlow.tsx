import React from 'react';
import { Layers } from 'lucide-react';

interface ProcessStepProps {
  step: string | number;
  title: string;
  parameters?: string;
  children: React.ReactNode;
}

export function ProcessStep({ step, title, parameters, children }: ProcessStepProps) {
  const stepNumber = String(step).padStart(2, '0');

  return (
    <div className="relative pl-12 sm:pl-14 group">
      {/* Vertical Timeline Track */}
      <div className="absolute left-[17px] sm:left-[21px] top-9 -bottom-4 w-[2px] bg-[var(--border)] group-last:hidden" />

      {/* Semantic Stage Indicator Badge */}
      <div className="absolute left-0 top-1 flex flex-col items-center justify-center w-9 h-9 rounded-lg border border-[var(--border)] bg-[var(--card-inner)] font-mono text-[10px] font-bold text-[var(--accent)] shadow-sm">
        <span className="text-[7.5px] text-[var(--muted)] leading-none uppercase tracking-tighter">STEP</span>
        <span className="leading-tight mt-0.5">{stepNumber}</span>
      </div>

      {/* Step Card Body */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card-inner)]/50 hover:bg-[var(--card-inner)] p-3.5 sm:p-4 transition-all">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1.5">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wide text-[var(--text)] font-mono">
            {title}
          </span>
        </div>
        {parameters && (
          <div className="text-[11px] font-mono text-[var(--accent)] bg-[var(--surface)] px-2.5 py-1 rounded border border-[var(--border)] inline-block mb-2">
            ⚙️ {parameters}
          </div>
        )}
        <div className="text-xs leading-relaxed text-[var(--muted)] font-sans">
          {children}
        </div>
      </div>
    </div>
  );
}

export interface ProcessFlowProps {
  title?: string;
  subtitle?: string;
  tag?: string;
  children: React.ReactNode;
}

export function ProcessFlow({
  title = "4-Stage Manufacturing Sequence",
  subtitle = "Precision fabrication workflow from raw material processing to final hermetic seal",
  tag = "MANUFACTURING PIPELINE // ASSEMBLY SEQUENCE",
  children,
}: ProcessFlowProps) {
  return (
    <div className="my-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 font-mono shadow-lg not-prose">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[var(--border)] pb-3.5 mb-5 gap-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            {tag}
          </span>
          <h4 className="text-base font-serif text-[var(--text)] font-semibold mt-1">{title}</h4>
          {subtitle && <p className="text-xs text-[var(--muted)] mt-0.5 font-sans leading-relaxed">{subtitle}</p>}
        </div>
        <span className="px-2.5 py-1 rounded-full bg-[var(--card-inner)] border border-[var(--border)] text-[10px] font-mono text-[var(--muted)]">
          Sequential Workflow
        </span>
      </div>

      {/* Steps Timeline Container */}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}
