import React from 'react';

interface TechnicalCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  bottleneck?: string;
}

export function TechnicalCard({ title, subtitle, children, bottleneck }: TechnicalCardProps) {
  return (
    <div className="my-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 font-mono text-sm text-[var(--text)]">
      <div className="mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">{title}</h4>
        {subtitle && <p className="text-xs text-[var(--muted)] mt-0.5">{subtitle}</p>}
      </div>
      <div className="space-y-3">{children}</div>
      {bottleneck && (
        <div className="mt-4 rounded border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-3 text-xs text-[var(--text)]">
          <span className="font-semibold uppercase tracking-wide text-[var(--accent)]">Bottleneck: </span>
          {bottleneck}
        </div>
      )}
    </div>
  );
}
