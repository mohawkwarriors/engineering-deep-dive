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
    <div className="my-6 overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-900/50">
      <table className="w-full text-left font-mono text-xs border-collapse" {...props} />
    </div>
  ),
  th: (props: any) => (
    <th className="border-b border-neutral-800 bg-neutral-900 px-4 py-3 font-semibold text-neutral-200 uppercase tracking-wider" {...props} />
  ),
  td: (props: any) => (
    <td className="border-b border-neutral-800/60 px-4 py-2.5 text-neutral-300" {...props} />
  ),
};
