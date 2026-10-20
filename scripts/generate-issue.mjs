import fs from 'fs';
import path from 'path';

export const GENERATION_CONFIG = {
  GENERATE_DIFFUSION_IMAGES: false,
  ALLOW_EXTERNAL_OEM_IMAGES: false,
  OUTPUT_FORMAT: 'MDX',
  READ_TIME_TARGET: '12 min',
  COMPONENT_ENFORCEMENT: [
    'ProcessFlow',
    'ProcessStep',
    'TechnicalCard',
    'TechnicalTangent'
  ]
};

console.log('Daily The HW Insider Generation Engine Initialized (Zero AI Raster Standard).');
