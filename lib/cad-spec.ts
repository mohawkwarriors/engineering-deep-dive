export type DrawingType =
  | 'layered_cross_section'
  | 'micro_channel_flow'
  | 'kinematic_mechanism'
  | 'material_microstructure'
  | 'process_sequence';

export type ViewType =
  | 'orthographic_section'
  | 'plan_view'
  | 'detail_callout'
  | 'schematic_diagram';

export type HatchType =
  | 'solid_metal'
  | 'porous_sintered'
  | 'cavity_vacuum'
  | 'fluid_channel'
  | 'ceramic'
  | 'silicon_substrate'
  | 'piezo_film'
  | 'copper'
  | 'graphite';

export type ColorScheme =
  | 'copper'
  | 'silicon'
  | 'cool_fluid'
  | 'hot_fluid'
  | 'piezo'
  | 'steel'
  | 'emerald'
  | 'amber'
  | 'purple';

export interface LayerFeature {
  type:
    | 'pillar'
    | 'dimple'
    | 'channel'
    | 'nozzle_throat'
    | 'weld_seam'
    | 'electrode'
    | 'scallop';
  xPercent: number; // 0..100 horizontal center percentage
  widthPx: number;
  heightPx?: number;
  label?: string;
  dimLabel?: string;
}

export interface LayerFlowVector {
  fromX: number; // percentage 0..100
  toX: number;   // percentage 0..100
  yOffsetPercent?: number; // -50..+50 relative to layer center
  label?: string;
  direction?: 'left' | 'right' | 'bidirectional';
  velocityOrFlux?: string;
}

export interface DrawingLayer {
  id: string;
  name: string;
  thickness: number; // normalized weight or height units
  thicknessLabel: string;
  material: string;
  hatchType: HatchType;
  colorScheme: ColorScheme;
  features?: LayerFeature[];
  flowVectors?: LayerFlowVector[];
}

export interface BoundaryLoad {
  side: 'top' | 'bottom' | 'left' | 'right';
  label: string;
  magnitude?: string;
  arrows: number;
  direction: 'inward' | 'outward';
  color?: string;
}

export type DimensionType =
  | 'vertical_stack'
  | 'horizontal_pitch'
  | 'feature_width'
  | 'feature_height';

export interface DimensionAnnotation {
  type: DimensionType;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  targetLayerId?: string;
  label: string;
  subLabel?: string;
  color?: string;
  side?: 'left' | 'right' | 'top' | 'bottom';
}

export interface CalloutBox {
  targetX: number;
  targetY: number;
  boxX: number;
  boxY: number;
  header: string;
  detail: string;
  badge?: string;
  color?: string;
}

export interface DrawingSpec {
  drawingType: DrawingType;
  title: string;
  subtitle?: string;
  viewType?: ViewType;
  nominalThickness?: string;
  scaleAnnotation?: string;
  boundaryLoads?: BoundaryLoad[];
  layers?: DrawingLayer[];
  dimensions?: DimensionAnnotation[];
  callouts?: CalloutBox[];
  legendItems?: Array<{ label: string; color: string }>;
}
