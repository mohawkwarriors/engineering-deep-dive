import React, { useState } from 'react';

interface TechnicalTangentProps {
  term: string;
  category: string;
  definition: string;
  equation?: string;
}

export function TechnicalTangent({ term, category, definition, equation }: TechnicalTangentProps) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);

  const showCard = pinned || hovered;

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setPinned(!pinned)}
        className="border-b border-dotted border-amber-500 text-amber-400 hover:text-amber-300 font-mono text-inherit transition-colors cursor-help inline-flex items-center"
      >
        {term}
      </button>

      {showCard && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 sm:w-80 rounded-lg border border-neutral-700 bg-neutral-900/95 p-3.5 text-xs text-neutral-200 shadow-2xl backdrop-blur-md z-50 block font-sans cursor-default"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <span className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-500">
              {category}
            </span>
            {pinned && (
              <button
                type="button"
                onClick={() => setPinned(false)}
                className="text-neutral-400 hover:text-neutral-200 text-xs px-1"
                aria-label="Close"
              >
                ✕
              </button>
            )}
          </span>
          <span className="block mt-2 font-medium text-neutral-100">{term}</span>
          <span className="block mt-1 text-neutral-300 leading-relaxed">{definition}</span>
          {equation && (
            <span className="mt-2 block rounded bg-neutral-950 p-2 font-mono text-[11px] text-amber-300/90 border border-neutral-800 overflow-x-auto">
              {equation}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
