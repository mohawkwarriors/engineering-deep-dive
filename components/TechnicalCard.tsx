import React from 'react';

interface TechnicalCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  bottleneck?: string;
}

export function TechnicalCard({ title, subtitle, children, bottleneck }: TechnicalCardProps) {
  return (
    <div className="my-6 rounded-lg border border-neutral-800 bg-neutral-900/90 p-5 font-mono text-sm text-neutral-200">
      <div className="mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500">{title}</h4>
        {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="space-y-3">{children}</div>
      {bottleneck && (
        <div className="mt-4 rounded border border-amber-900/50 bg-amber-950/20 p-3 text-xs text-amber-400">
          <span className="font-semibold uppercase tracking-wide">Bottleneck: </span>
          {bottleneck}
        </div>
      )}
    </div>
  );
}
