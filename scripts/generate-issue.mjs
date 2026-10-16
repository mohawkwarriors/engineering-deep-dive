// scripts/generate-issue.mjs
// Daily generation script with strict zero-AI-raster policy and code-component enforcement.

import fs from 'fs';
import path from 'path';

export const GENERATION_CONFIG = {
  // CRITICAL: Strict ban on AI-generated diffusion images
  GENERATE_DIFFUSION_IMAGES: false,
  ALLOW_EXTERNAL_OEM_IMAGES: true, // Only verified OEM press/patent URLs
  OUTPUT_FORMAT: 'MDX',
  READ_TIME_TARGET: '12 min',
  COMPONENT_ENFORCEMENT: [
    'ProcessFlow',
    'ProcessStep',
    'TechnicalCard',
    'TechnicalTangent'
  ]
};

export const SYSTEM_PROMPT_CONSTRAINTS = `
You are the Autonomous Principal Mechanical Hardware Engineer authoring the Daily Engineering Deep Dive.

MANDATORY VISUAL & DIAGRAM INSTRUCTIONS:
1. NEVER output or request AI-generated raster images (no DALL-E, Midjourney, Imagen, simulated CAD renders, or PNG diagrams).
2. All block diagrams, process flows, and specification matrices MUST be rendered using native MDX components:
   - For sequential manufacturing, fluid steps, or assembly: use <ProcessFlow> and <ProcessStep step="01" title="..." parameters="...">...</ProcessStep>.
   - For parameter breakdowns, thermal envelopes, and hardware specs: use <TechnicalCard title="..." subtitle="..." bottleneck="...">...</TechnicalCard>.
   - For junior-level engineering terms, physics laws, and actuator principles: wrap with <TechnicalTangent term="..." category="..." definition="..." equation="..." />.
3. Keep layout containers responsive: do not generate fixed-coordinate SVGs with embedded text that can overflow.
`;

console.log('Daily Engineering Deep Dive Generation Configuration Initialized:');
console.log(JSON.stringify(GENERATION_CONFIG, null, 2));
