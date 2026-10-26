import type {
  DrawingSpec,
  DrawingLayer,
  LayerFeature,
  LayerFlowVector,
  BoundaryLoad,
  CalloutBox,
  DimensionAnnotation,
} from './cad-spec.ts';
import type { CadRequestParams } from './cad-generator.ts';

export interface ExtractedCadDimensions {
  totalThickness: string;
  topPlate: string;
  bottomPlate: string;
  wickThickness: string;
  airGap: string;
  pillarWidth: string;
  pillarHeight: string;
  pillarPitch: string;
  pressureDiff: string;
  heatFlux: string;
  operatingTemp: string;
  rawDimensions: string[];
}

/**
 * Parses technical dimensional tokens, tolerances, and physical metrics from
 * the figure caption, section heading, and surrounding prose.
 */
export function extractContextDimensions(
  caption: string = '',
  sectionContent: string = '',
  heading: string = ''
): ExtractedCadDimensions {
  const combined = `${caption} ${heading} ${sectionContent}`;

  const rawMatches = Array.from(
    new Set(
      (
        combined.match(
          /\d+(?:\.\d+)?\s*(?:mm|μm|µm|nm|bar|kPa|MPa|Torr|W\/cm²|W\/mK|K\/W|°C)/gi
        ) || []
      ).map((m) => m.replace(/\s+/g, ' ').trim())
    )
  );

  const findFirst = (regex: RegExp, fallback: string): string => {
    const match = combined.match(regex);
    return match && match[1] ? match[1].trim() : fallback;
  };

  const totalThickness = findFirst(
    /(?:total|overall|envelope)\s*(?:thickness|height)?\s*(?:of|is|:)?\s*(\d+(?:\.\d+)?\s*mm)/i,
    findFirst(/(\d+(?:\.\d+)?\s*mm)\s*(?:envelope|overall|total)/i, '0.35 mm')
  );

  const topPlate = findFirst(
    /(?:top|upper)\s*(?:plate|copper|sheet|foil|lid)\s*(?:thickness|is|:)?\s*(\d+(?:\.\d+)?\s*mm)/i,
    '0.08 mm'
  );

  const bottomPlate = findFirst(
    /(?:bottom|lower|base)\s*(?:plate|copper|sheet|foil)\s*(?:thickness|is|:)?\s*(\d+(?:\.\d+)?\s*mm)/i,
    '0.08 mm'
  );

  const wickThickness = findFirst(
    /(?:wick|sintered|mesh)\s*(?:layer|thickness)?\s*(?:is|:)?\s*(\d+(?:\.\d+)?\s*(?:mm|μm|µm))/i,
    '0.06 mm'
  );

  const airGap = findFirst(
    /(?:vapor|cavity|air|gap)\s*(?:height|spacing|gap)?\s*(?:is|:)?\s*(\d+(?:\.\d+)?\s*(?:mm|μm|µm))/i,
    '0.09 mm (70–110 µm)'
  );

  const pillarWidth = findFirst(
    /(?:pillar|column|dimple|post)\s*(?:diameter|width|size)?\s*(?:is|:)?\s*(?:Ø|ø)?\s*(\d+(?:\.\d+)?\s*mm)/i,
    '0.35 mm'
  );

  const pillarHeight = findFirst(
    /(?:pillar|column)\s*height\s*(?:is|:)?\s*(\d+(?:\.\d+)?(?:\s*±\s*\d+(?:\.\d+)?)?\s*mm)/i,
    '0.12 ± 0.005 mm'
  );

  const pillarPitch = findFirst(
    /(?:pillar|column|array)\s*(?:pitch|spacing|center-to-center)?\s*(?:is|:)?\s*(\d+(?:\.\d+)?\s*mm)/i,
    '1.20 mm'
  );

  const pressureDiff = findFirst(
    /(?:pressure|delta|differential|collapse)\s*(?:load|diff)?\s*(?:of|is|:)?\s*(\d+(?:\.\d+)?\s*(?:bar|kPa|MPa|atm))/i,
    '1.0 bar (101.3 kPa)'
  );

  const heatFlux = findFirst(
    /(\d+(?:\.\d+)?\s*W\/cm²)/i,
    '150 W/cm²'
  );

  const operatingTemp = findFirst(
    /(\d+(?:\.\d+)?\s*°C)/i,
    '85°C'
  );

  return {
    totalThickness,
    topPlate,
    bottomPlate,
    wickThickness,
    airGap,
    pillarWidth,
    pillarHeight,
    pillarPitch,
    pressureDiff,
    heatFlux,
    operatingTemp,
    rawDimensions: rawMatches,
  };
}

/**
 * Derives a Vapor Chamber Internal Pillar & Support Matrix specification (FIG 03).
 * Visualizes half-etched support pillars preventing atmospheric collapse under 1 bar.
 */
export function deriveVaporChamberPillarSpec(
  params: CadRequestParams,
  dims: ExtractedCadDimensions
): DrawingSpec {
  const layers: DrawingLayer[] = [
    {
      id: 'top-copper-plate',
      name: 'Top Copper Plate',
      thickness: 8,
      thicknessLabel: dims.topPlate,
      material: 'C1100 Oxygen-Free Cu',
      hatchType: 'copper',
      colorScheme: 'copper',
    },
    {
      id: 'evap-wick',
      name: 'Evaporator Sintered Wick',
      thickness: 6,
      thicknessLabel: dims.wickThickness,
      material: 'Sintered Cu Powder (35–50 µm)',
      hatchType: 'porous_sintered',
      colorScheme: 'copper',
    },
    {
      id: 'vapor-cavity',
      name: 'Vapor Cavity & Pillar Matrix',
      thickness: 12,
      thicknessLabel: dims.airGap,
      material: 'Saturated H₂O Vapor @ 10⁻³ Torr',
      hatchType: 'cavity_vacuum',
      colorScheme: 'cool_fluid',
    },
    {
      id: 'cond-wick',
      name: 'Condenser Sintered Wick',
      thickness: 6,
      thicknessLabel: dims.wickThickness,
      material: 'Sintered Cu Powder (35–50 µm)',
      hatchType: 'porous_sintered',
      colorScheme: 'copper',
    },
    {
      id: 'bottom-copper-plate',
      name: 'Bottom Copper Plate',
      thickness: 8,
      thicknessLabel: dims.bottomPlate,
      material: 'C1100 Oxygen-Free Cu',
      hatchType: 'copper',
      colorScheme: 'copper',
    },
  ];

  const boundaryLoads: BoundaryLoad[] = [
    {
      side: 'top',
      label: 'ATMOSPHERIC PRESSURE LOAD',
      magnitude: dims.pressureDiff,
      arrows: 6,
      direction: 'inward',
      color: '#F87171',
    },
    {
      side: 'bottom',
      label: 'ATMOSPHERIC PRESSURE LOAD',
      magnitude: dims.pressureDiff,
      arrows: 6,
      direction: 'inward',
      color: '#F87171',
    },
  ];

  return {
    drawingType: 'layered_cross_section',
    title: 'VAPOR CHAMBER INTERNAL COLUMN ARCHITECTURE',
    nominalThickness: dims.totalThickness,
    scaleAnnotation: 'SCALE 250:1 • CAD CROSS-SECTION',
    boundaryLoads,
    layers,
    columns: {
      fromLayerId: 'evap-wick',
      toLayerId: 'cond-wick',
      xPercents: [24, 50, 76],
      widthPx: 38,
      widthLabel: `Ø ${dims.pillarWidth}`,
      pitchLabel: `${dims.pillarPitch} PITCH`,
    },
  };
}

/**
 * Derives a Sintered Copper Wick Microstructure specification (FIG 02).
 * Visualizes biporous copper powder necking, capillary radius, and liquid return channels.
 */
export function deriveSinteredWickSpec(
  params: CadRequestParams,
  dims: ExtractedCadDimensions
): DrawingSpec {
  const layers: DrawingLayer[] = [
    {
      id: 'vapor-headspace',
      name: 'Vapor Core Headspace',
      thickness: 7,
      thicknessLabel: '0.05 mm',
      material: 'Saturated Steam @ 10⁻³ Torr',
      hatchType: 'cavity_vacuum',
      colorScheme: 'cool_fluid',
      flowVectors: [
        { fromX: 15, toX: 85, direction: 'right', label: 'VAPOR ADVECTION' },
      ],
    },
    {
      id: 'fine-wick',
      name: 'Fine Capillary Wick Layer',
      thickness: 10,
      thicknessLabel: '0.035 mm',
      material: 'Sintered Cu Powder (25–35 µm spheres)',
      hatchType: 'porous_sintered',
      colorScheme: 'copper',
      flowVectors: [
        { fromX: 85, toX: 15, direction: 'left', label: 'LIQUID RECIRCULATION' },
      ],
    },
    {
      id: 'coarse-wick',
      name: 'Coarse Capillary Arterial Base',
      thickness: 10,
      thicknessLabel: '0.045 mm',
      material: 'Biporous Cu Powder (50–70 µm spheres)',
      hatchType: 'porous_sintered',
      colorScheme: 'copper',
    },
    {
      id: 'substrate-plate',
      name: 'Substrate Copper Plate',
      thickness: 8,
      thicknessLabel: dims.bottomPlate,
      material: 'C1100 Oxygen-Free Cu',
      hatchType: 'copper',
      colorScheme: 'copper',
    },
  ];

  return {
    drawingType: 'material_microstructure',
    title: 'SINTERED COPPER POWDER WICK ARCHITECTURE',
    nominalThickness: '0.16 mm',
    scaleAnnotation: 'SCALE 500:1 • SEM METROLOGY',
    layers,
  };
}

/**
 * Derives a Vapor Chamber Sealed Envelope & Flange Teardown specification (FIG 01).
 * Shows the full outer hermetic envelope, diffusion weld perimeter flange, and internal cavity.
 */
export function deriveVaporChamberEnvelopeSpec(
  params: CadRequestParams,
  dims: ExtractedCadDimensions
): DrawingSpec {
  const layers: DrawingLayer[] = [
    {
      id: 'top-envelope',
      name: 'Upper Stamped Copper Shell',
      thickness: 8,
      thicknessLabel: dims.topPlate,
      material: 'Deep-Draw C1100 Oxygen-Free Cu',
      hatchType: 'copper',
      colorScheme: 'copper',
      features: [
        {
          type: 'dimple',
          xPercent: 20,
          widthPx: 32,
          heightPx: 12,
        },
        {
          type: 'dimple',
          xPercent: 80,
          widthPx: 32,
          heightPx: 12,
        },
      ],
    },
    {
      id: 'core-evacuation-chamber',
      name: 'Hermetic Vapor Cavity & Wick Core',
      thickness: 16,
      thicknessLabel: '0.19 mm',
      material: 'Ultra-Pure Deionized H₂O in Vacuum',
      hatchType: 'cavity_vacuum',
      colorScheme: 'cool_fluid',
      flowVectors: [
        { fromX: 18, toX: 82, direction: 'right', label: 'LATENT HEAT TRANSPORT' },
      ],
    },
    {
      id: 'bottom-envelope',
      name: 'Lower Planar Copper Base',
      thickness: 8,
      thicknessLabel: dims.bottomPlate,
      material: 'C1100 Oxygen-Free Cu',
      hatchType: 'copper',
      colorScheme: 'copper',
    },
  ];

  return {
    drawingType: 'layered_cross_section',
    title: 'PLANAR VAPOR CHAMBER ENVELOPE ARCHITECTURE',
    nominalThickness: dims.totalThickness,
    scaleAnnotation: 'SCALE 200:1 • SECTION VIEW',
    layers,
  };
}

/**
 * Derives a Thermal Benchmark / Heat Flux Cross-Section (FIG 04).
 * Shows concentrated die heat load (150 W/cm²), spreading angle, and thermocouple interface.
 */
export function deriveThermalBenchSpec(
  params: CadRequestParams,
  dims: ExtractedCadDimensions
): DrawingSpec {
  const layers: DrawingLayer[] = [
    {
      id: 'silicon-die',
      name: 'Concentrated Silicon Die Heat Source',
      thickness: 6,
      thicknessLabel: '0.15 mm',
      material: 'Silicon Test Die (8×8 mm hotspot)',
      hatchType: 'silicon_substrate',
      colorScheme: 'hot_fluid',
    },
    {
      id: 'tim-interface',
      name: 'Thermal Interface Material (TIM)',
      thickness: 4,
      thicknessLabel: '0.025 mm',
      material: 'Phase-Change Compound (k = 6.5 W/mK)',
      hatchType: 'porous_sintered',
      colorScheme: 'amber',
    },
    {
      id: 'vapor-chamber-spreader',
      name: 'Ultra-Thin Vapor Chamber Spreader',
      thickness: 14,
      thicknessLabel: dims.totalThickness,
      material: 'Two-Phase Thermal Ground Plane',
      hatchType: 'copper',
      colorScheme: 'copper',
      flowVectors: [
        { fromX: 50, toX: 15, direction: 'left', label: 'HEAT SPREADING' },
        { fromX: 50, toX: 85, direction: 'right', label: 'HEAT SPREADING' },
      ],
    },
    {
      id: 'cold-plate',
      name: 'Liquid-Cooled Aluminum Cold Plate',
      thickness: 10,
      thicknessLabel: '2.50 mm',
      material: '6061-T6 Aluminum Heat Sink',
      hatchType: 'solid_metal',
      colorScheme: 'cool_fluid',
    },
  ];

  const boundaryLoads: BoundaryLoad[] = [
    {
      side: 'top',
      label: 'HEAT DISSIPATION FLUX',
      magnitude: dims.heatFlux,
      arrows: 4,
      direction: 'inward',
      color: '#EF4444',
    },
  ];

  return {
    drawingType: 'layered_cross_section',
    title: 'HIGH-FLUX THERMAL BENCH INSTRUMENTATION',
    nominalThickness: '2.82 mm',
    scaleAnnotation: 'SCALE 100:1 • CALIBRATION STACK',
    boundaryLoads,
    layers,
  };
}

/**
 * Derives a Microfluidic / MEMS / Piezo Actuator Cross-Section.
 */
export function deriveMicrofluidicMemsSpec(
  params: CadRequestParams,
  dims: ExtractedCadDimensions
): DrawingSpec {
  const layers: DrawingLayer[] = [
    {
      id: 'piezo-membrane',
      name: 'PZT Sol-Gel Piezoelectric Actuator',
      thickness: 6,
      thicknessLabel: '0.003 mm',
      material: 'Ferroelectric Pb(Zr,Ti)O₃ Thin Film',
      hatchType: 'piezo_film',
      colorScheme: 'piezo',
    },
    {
      id: 'silicon-substrate',
      name: 'Silicon (100) Structural Membrane',
      thickness: 10,
      thicknessLabel: '0.020 mm',
      material: 'Single-Crystal P-Type Silicon',
      hatchType: 'silicon_substrate',
      colorScheme: 'silicon',
    },
    {
      id: 'fluid-pumping-chamber',
      name: 'DRIE Micro-Cavity & Nozzle Plate',
      thickness: 14,
      thicknessLabel: '0.045 mm',
      material: 'Acoustic Fluid Compression Chamber',
      hatchType: 'fluid_channel',
      colorScheme: 'cool_fluid',
      features: [
        {
          type: 'nozzle_throat',
          xPercent: 50,
          widthPx: 44,
          heightPx: 60,
          dimLabel: 'Ø 22 µm',
          label: 'EJECTION NOZZLE',
        },
      ],
      flowVectors: [
        { fromX: 20, toX: 45, direction: 'right', label: 'PRESSURE WAVE' },
        { fromX: 80, toX: 55, direction: 'left', label: 'PRESSURE WAVE' },
      ],
    },
  ];

  return {
    drawingType: 'micro_channel_flow',
    title: 'PRECISION MEMS PIEZOELECTRIC ACTUATOR & NOZZLE',
    nominalThickness: '0.068 mm',
    scaleAnnotation: 'SCALE 1000:1 • MEMS METROLOGY',
    layers,
  };
}

/**
 * Derives a generic high-fidelity mechanical cross-section grounded in
 * extracted context dimensions rather than generic dummy ellipses.
 */
export function deriveGenericEngineeringSpec(
  params: CadRequestParams,
  dims: ExtractedCadDimensions
): DrawingSpec {
  const figTitle = params.caption
    ? params.caption.replace(/^(?:FIG|FIGURE)\s*\d+[\s—:-]+/i, '').trim()
    : params.title || 'PRECISION MECHANICAL CROSS-SECTION';

  const layers: DrawingLayer[] = [
    {
      id: 'upper-structural-shell',
      name: 'Upper Structural Shell',
      thickness: 8,
      thicknessLabel: dims.topPlate,
      material: 'Precision Alloy Housing',
      hatchType: 'solid_metal',
      colorScheme: 'steel',
    },
    {
      id: 'internal-core-interface',
      name: 'Internal Functional Core',
      thickness: 14,
      thicknessLabel: dims.airGap,
      material: 'Precision Internal Assembly',
      hatchType: 'fluid_channel',
      colorScheme: 'cool_fluid',
      flowVectors: [
        { fromX: 20, toX: 80, direction: 'bidirectional', label: 'CLEARANCE AXIS' },
      ],
    },
    {
      id: 'lower-structural-base',
      name: 'Lower Base Plate',
      thickness: 8,
      thicknessLabel: dims.bottomPlate,
      material: 'Precision Datum Base',
      hatchType: 'solid_metal',
      colorScheme: 'steel',
    },
  ];

  return {
    drawingType: 'layered_cross_section',
    title: figTitle.toUpperCase().slice(0, 50),
    nominalThickness: dims.totalThickness,
    scaleAnnotation: 'SCALE 1:1 • CAD METROLOGY',
    layers,
  };
}

/**
 * Main coordinator that derives a complete DrawingSpec from CadRequestParams.
 */
export function deriveDrawingSpec(params: CadRequestParams): DrawingSpec {
  const caption = (params.caption || '').toLowerCase();
  const heading = (params.sectionHeading || '').toLowerCase();
  const content = (params.sectionContent || '').toLowerCase();
  const title = (params.title || '').toLowerCase();
  const combined = `${caption} ${heading} ${content} ${title}`;

  const dims = extractContextDimensions(
    params.caption,
    params.sectionContent,
    params.sectionHeading
  );

  // 1. Check for Internal Column / Support Pillar / Atmospheric Collapse / Dimple Architecture (FIG 03)
  if (
    /\b(column|columns|pillar|pillars|dimple|dimples)\b/i.test(caption) ||
    caption.includes('atmospheric collapse') ||
    caption.includes('pressure differential') ||
    heading.includes('vacuum shell') ||
    heading.includes('crushing') ||
    (combined.includes('vapor chamber') && params.figNumber === '03')
  ) {
    return deriveVaporChamberPillarSpec(params, dims);
  }

  // 2. Check for Sintered Powder Wick / Capillary Microstructure (FIG 02)
  if (
    caption.includes('sintered') ||
    caption.includes('microstructure') ||
    caption.includes('biporous') ||
    caption.includes('pore distribution') ||
    caption.includes('permeability') ||
    (combined.includes('vapor chamber') && params.figNumber === '02')
  ) {
    return deriveSinteredWickSpec(params, dims);
  }

  // 3. Check for Infrared Thermography / Thermal Bench (FIG 04)
  if (
    caption.includes('thermography') ||
    caption.includes('infrared') ||
    caption.includes('flir') ||
    caption.includes('isotherm') ||
    caption.includes('spreading resistance') ||
    (combined.includes('vapor chamber') && params.figNumber === '04')
  ) {
    return deriveThermalBenchSpec(params, dims);
  }

  // 4. Check for Planar Vapor Chamber Teardown / Envelope (FIG 01 or general VC)
  if (combined.includes('vapor chamber')) {
    if (params.figNumber === '01' || caption.includes('envelope') || caption.includes('teardown') || caption.includes('casing')) {
      return deriveVaporChamberEnvelopeSpec(params, dims);
    }
    return deriveVaporChamberPillarSpec(params, dims);
  }

  // 5. Check for MEMS, Microfluidics, Nozzle, Piezo
  if (
    combined.includes('nozzle') ||
    combined.includes('mems') ||
    combined.includes('piezo') ||
    combined.includes('microfluidic') ||
    combined.includes('drie')
  ) {
    return deriveMicrofluidicMemsSpec(params, dims);
  }

  // 6. Generic high-depth CAD specification
  return deriveGenericEngineeringSpec(params, dims);
}
