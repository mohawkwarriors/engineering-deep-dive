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
    <div className="relative pl-8 sm:pl-10 group">
      {/* Connector Line */}
      <div className="absolute left-[15px] sm:left-[19px] top-7 bottom-0 w-px bg-neutral-800 group-last:hidden" />
      
      {/* Step Badge */}
      <div className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-md border border-neutral-700 bg-neutral-900 font-mono text-xs font-semibold text-amber-500 shadow-sm">
        {formattedStep}
      </div>

      {/* Content Card with Dynamic Auto-Layout */}
      <div className="rounded-lg border border-neutral-800/80 bg-neutral-900/60 p-4 font-mono transition-colors hover:border-neutral-700">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-800 pb-2 mb-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-neutral-200">
            {title}
          </span>
          {parameters && (
            <span className="text-xs text-neutral-400 bg-neutral-800/50 px-2 py-0.5 rounded border border-neutral-700/50">
              {parameters}
            </span>
          )}
        </div>
        <div className="text-xs leading-relaxed text-neutral-400 font-sans">
          {children}
        </div>
      </div>
    </div>
  );
}

export function ProcessFlow({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 space-y-4">
      {children}
    </div>
  );
}
