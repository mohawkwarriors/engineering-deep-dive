import React from 'react';

interface ProcessStepProps {
  step: string | number;
  title: string;
  parameters?: string;
  children: React.ReactNode;
}

export function ProcessStep({ step, title, parameters, children }: ProcessStepProps) {
  const formattedStep = typeof step === 'number' ? String(step).padStart(2, '0') : step;

  return (
    <div className="relative pl-8 sm:pl-10 group my-3">
      {/* Connector Line */}
      <div className="absolute left-[15px] sm:left-[19px] top-7 bottom-0 w-px bg-[var(--border)] group-last:hidden" />
      
      {/* Step Badge */}
      <div className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] font-mono text-xs font-semibold text-[var(--accent)] shadow-sm">
        {formattedStep}
      </div>

      {/* Dynamic Content Card */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 font-mono transition-colors hover:border-[var(--accent)]/50">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border)] pb-2 mb-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-[var(--text)]">
            {title}
          </span>
          {parameters && (
            <span className="text-xs text-[var(--muted)] bg-[var(--card-inner)] px-2 py-0.5 rounded border border-[var(--border)]">
              {parameters}
            </span>
          )}
        </div>
        <div className="text-xs leading-relaxed text-[var(--muted)] font-sans">
          {children}
        </div>
      </div>
    </div>
  );
}

export function ProcessFlow({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 space-y-2">
      {children}
    </div>
  );
}
