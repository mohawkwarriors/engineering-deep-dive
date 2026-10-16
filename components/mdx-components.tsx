import React from 'react';
import { ProcessFlow, ProcessStep } from './ProcessFlow';
import { TechnicalCard } from './TechnicalCard';
import { TechnicalTangent } from './TechnicalTangent';

export const mdxComponents = {
  ProcessFlow,
  ProcessStep,
  TechnicalCard,
  TechnicalTangent,
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
