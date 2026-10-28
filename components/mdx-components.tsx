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
  h2: ({ children, ...props }: any) => {
    let text = "";
    if (typeof children === "string") {
      text = children;
    } else if (Array.isArray(children)) {
      text = children
        .map((c) => (typeof c === "string" ? c : c?.props?.children || ""))
        .join("");
    }

    const match = text.match(/^(?:Section\s+)?(\d+)[\.:]\s*(.+)$/i);
    if (match) {
      const num = String(parseInt(match[1], 10)).padStart(2, "0");
      const cleanTitle = match[2].trim();
      const targetId = props.id || `section-${num}`;

      return (
        <div className="section-header-wrap" id={targetId}>
          <div className="section-kicker">
            <span>SECTION // {num}</span>
          </div>
          <h2 className="section-title" {...props}>
            {cleanTitle}
          </h2>
        </div>
      );
    }

    return (
      <div className="section-header-wrap" id={props.id}>
        <h2 className="section-title" {...props}>
          {children}
        </h2>
      </div>
    );
  },
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
