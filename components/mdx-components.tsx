import React from 'react';
import { ProcessFlow, ProcessStep } from './ProcessFlow';
import { TechnicalCard } from './TechnicalCard';
import { TechnicalTangent } from './TechnicalTangent';
import {
  ParameterExplorer,
  MechanismWalkthrough,
  ToleranceStackupBar,
  TradeoffMatrix,
  LayeredCrossSection,
} from './interactive';

export const mdxComponents = {
  ProcessFlow,
  ProcessStep,
  TechnicalCard,
  TechnicalTangent,
  ParameterExplorer,
  MechanismWalkthrough,
  ToleranceStackupBar,
  TradeoffMatrix,
  LayeredCrossSection,
  h2: ({ children, ...props }: any) => (
    <h2 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text)] mt-10 mb-4 pb-2 border-b border-[var(--border)]" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: any) => (
    <h3 className="font-serif text-xl sm:text-2xl font-semibold tracking-tight text-[var(--text)] mt-8 mb-3" {...props}>
      {children}
    </h3>
  ),
  table: (props: any) => (
    <div className="my-6 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <table className="w-full text-left font-mono text-xs border-collapse" {...props} />
    </div>
  ),
  th: (props: any) => (
    <th className="border-b border-[var(--border)] bg-[var(--card-inner)] px-4 py-3 font-semibold text-[var(--text)] uppercase tracking-wider text-[11px]" {...props} />
  ),
  td: (props: any) => (
    <td className="border-b border-[var(--border)]/50 px-4 py-2.5 text-[var(--text)]" {...props} />
  ),
};
