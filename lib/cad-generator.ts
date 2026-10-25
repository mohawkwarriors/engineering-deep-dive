import { deriveDrawingSpec } from './cad-spec-deriver.ts';
import { renderDrawingSpec } from './cad-renderer.ts';
import { validateDrawingSvg } from './cad-validator.ts';
import type { DrawingSpec } from './cad-spec.ts';

export { deriveDrawingSpec, renderDrawingSpec, validateDrawingSvg };
export type { DrawingSpec };

export interface CadRequestParams {
  title?: string;
  topic?: string;
  figNumber?: string;
  caption?: string;
  sectionHeading?: string;
  sectionContent?: string;
}

export interface ExtractedSpecs {
  totalThickness: string;
  topPlate: string;
  bottomPlate: string;
  wickThickness: string;
  airGap: string;
  pillarWidth: string;
  pillarHeight: string;
  pillarPitch: string;
  pressureDiff: string;
  dimensions: string[];
}

function escapeXml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function extractEngineeringSpecs(caption: string, sectionContent: string): ExtractedSpecs {
  const combined = `${caption || ""} ${sectionContent || ""}`;
  const dimMatches = Array.from(
    new Set(
      (combined.match(/\d+(?:\.\d+)?\s*(?:mm|μm|µm|nm|bar|kPa|MPa|Torr|W\/cm²|°C)/gi) || []).map((m) =>
        m.replace(/\s+/g, " ").trim()
      )
    )
  );

  return {
    totalThickness: "0.35 mm",
    topPlate: "0.08 mm",
    bottomPlate: "0.08 mm",
    wickThickness: "0.06 mm",
    airGap: "0.09 mm (70–110 µm)",
    pillarWidth: "0.35 mm",
    pillarHeight: "0.12 ± 0.005 mm",
    pillarPitch: "1.20 mm",
    pressureDiff: "1.0 bar (101.3 kPa)",
    dimensions: dimMatches,
  };
}

/**
 * Generates the shared SVG <defs> for CAD cross-sections:
 * - Fine & major dark-mode CAD grid
 * - ANSI/ISO 45-degree metallic cross-section hatch for copper plates & pillars
 * - Sintered porous copper powder texture for capillary wick layers
 * - Crisp dimension arrowheads (orange accent, cyan, emerald, and neutral)
 */
function buildCadDefs(uid: string): string {
  return `
  <defs>
    <pattern id="cadMinorGrid-${uid}" width="15" height="15" patternUnits="userSpaceOnUse">
      <path d="M 15 0 L 0 0 0 15" fill="none" stroke="#1E1D1B" stroke-width="0.6"/>
    </pattern>
    <pattern id="cadMajorGrid-${uid}" width="60" height="60" patternUnits="userSpaceOnUse">
      <rect width="60" height="60" fill="url(#cadMinorGrid-${uid})"/>
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#262522" stroke-width="0.9"/>
    </pattern>

    <!-- 45° Copper Section Hatch -->
    <pattern id="cuHatch-${uid}" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <rect width="8" height="8" fill="#2A1C15"/>
      <line x1="0" y1="0" x2="0" y2="8" stroke="#D97757" stroke-width="1.4" stroke-opacity="0.45"/>
    </pattern>

    <!-- Monolithic Etched Pillar / Dimple Section Hatch -->
    <pattern id="pillarHatch-${uid}" width="6" height="6" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
      <rect width="6" height="6" fill="#332016"/>
      <line x1="0" y1="0" x2="0" y2="6" stroke="#F59E0B" stroke-width="1.3" stroke-opacity="0.5"/>
    </pattern>

    <!-- Sintered Copper Powder Wick Texture -->
    <pattern id="wickDots-${uid}" width="10" height="10" patternUnits="userSpaceOnUse">
      <rect width="10" height="10" fill="#1F1915"/>
      <circle cx="2.5" cy="2.5" r="1.7" fill="#B45309" stroke="#F59E0B" stroke-width="0.4" opacity="0.85"/>
      <circle cx="7.5" cy="2.8" r="1.5" fill="#92400E" stroke="#D97757" stroke-width="0.4" opacity="0.85"/>
      <circle cx="5.0" cy="7.2" r="1.8" fill="#B45309" stroke="#F59E0B" stroke-width="0.4" opacity="0.85"/>
      <circle cx="9.2" cy="7.5" r="1.4" fill="#78350F" stroke="#D97757" stroke-width="0.4" opacity="0.85"/>
    </pattern>

    <!-- Dimension Arrow Markers -->
    <marker id="arrowOrangeEnd-${uid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#D97757"/>
    </marker>
    <marker id="arrowOrangeStart-${uid}" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 10 1.5 L 1 5 L 10 8.5 z" fill="#D97757"/>
    </marker>
    <marker id="arrowCyanEnd-${uid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#38BDF8"/>
    </marker>
    <marker id="arrowCyanStart-${uid}" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 10 1.5 L 1 5 L 10 8.5 z" fill="#38BDF8"/>
    </marker>
    <marker id="arrowEmeraldEnd-${uid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#10B981"/>
    </marker>
    <marker id="arrowEmeraldStart-${uid}" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 10 1.5 L 1 5 L 10 8.5 z" fill="#10B981"/>
    </marker>
    <marker id="arrowRedEnd-${uid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#F87171"/>
    </marker>
    <marker id="arrowWhiteEnd-${uid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#EDEDEB"/>
    </marker>
    <marker id="arrowWhiteStart-${uid}" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 10 1.5 L 1 5 L 10 8.5 z" fill="#EDEDEB"/>
    </marker>
  </defs>`;
}

/**
 * FIG 03 — INTERNAL COLUMN ARCHITECTURE:
 * Orthographic 2D Cross-Section of the 0.35 mm Ultra-Thin Vapor Chamber showing:
 * - Top copper plate thickness (0.08 mm)
 * - Bottom copper plate thickness (0.08 mm)
 * - Sintered copper powder wick layers (0.06 mm)
 * - Internal air / vapor gap (0.09 mm / 70–110 µm at 10^-3 Torr vacuum)
 * - Half-etched support pillars & stamped dimple column (Ø 0.35 mm width, 0.12 ± 0.005 mm height, 1.20 mm pitch)
 * - 1 bar (101.3 kPa / 80.5 kgf) external atmospheric crush load arrows vs internal column support
 */
function generateVaporChamberPillarCrossSection(specs: ExtractedSpecs): string {
  const uid = "vc-pillar-cs";
  return `
<svg viewBox="0 0 820 430" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto bg-[#161615] rounded-xl border border-[#383734]">
  ${buildCadDefs(uid)}
  <rect width="820" height="430" fill="url(#cadMajorGrid-${uid})" />

  <!-- Top Section Header Strip (Clean inline label, no fake boxes) -->
  <text x="24" y="26" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="700" fill="#D97757" letter-spacing="0.06em">
    SECTION A–A // VAPOR CHAMBER INTERNAL SUPPORT PILLAR &amp; DIMPLE CROSS-SECTION
  </text>
  <text x="796" y="26" text-anchor="end" font-family="'JetBrains Mono', monospace" font-size="10" fill="#9E9C94">
    ΔP = 1.0 BAR (101.3 kPa) • Z-SCALE 400:1
  </text>

  <!-- ======================================================================= -->
  <!-- 1. ATMOSPHERIC CRUSH PRESSURE ARROWS (TOP & BOTTOM EXTERIOR)            -->
  <!-- ======================================================================= -->
  <g>
    <text x="405" y="54" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="700" fill="#F87171">
      EXTERNAL ATMOSPHERIC PRESSURE: P_atm = 101.3 kPa (1.0 BAR ≈ 80.5 kgf / 177 lbs CRUSH LOAD)
    </text>
    <!-- Top downward pressure arrows -->
    <line x1="175" y1="62" x2="175" y2="102" stroke="#F87171" stroke-width="1.5" marker-end="url(#arrowRedEnd-${uid})"/>
    <line x1="250" y1="62" x2="250" y2="102" stroke="#F87171" stroke-width="1.5" marker-end="url(#arrowRedEnd-${uid})"/>
    <line x1="325" y1="62" x2="325" y2="102" stroke="#F87171" stroke-width="1.5" marker-end="url(#arrowRedEnd-${uid})"/>
    <line x1="405" y1="62" x2="405" y2="102" stroke="#F87171" stroke-width="1.5" marker-end="url(#arrowRedEnd-${uid})"/>
    <line x1="485" y1="62" x2="485" y2="102" stroke="#F87171" stroke-width="1.5" marker-end="url(#arrowRedEnd-${uid})"/>
    <line x1="560" y1="62" x2="560" y2="102" stroke="#F87171" stroke-width="1.5" marker-end="url(#arrowRedEnd-${uid})"/>
    <line x1="635" y1="62" x2="635" y2="102" stroke="#F87171" stroke-width="1.5" marker-end="url(#arrowRedEnd-${uid})"/>

    <!-- Bottom upward pressure arrows -->
    <line x1="175" y1="364" x2="175" y2="328" stroke="#F87171" stroke-width="1.5" marker-end="url(#arrowRedEnd-${uid})"/>
    <line x1="250" y1="364" x2="250" y2="328" stroke="#F87171" stroke-width="1.5" marker-end="url(#arrowRedEnd-${uid})"/>
    <line x1="325" y1="364" x2="325" y2="328" stroke="#F87171" stroke-width="1.5" marker-end="url(#arrowRedEnd-${uid})"/>
    <line x1="405" y1="364" x2="405" y2="328" stroke="#F87171" stroke-width="1.5" marker-end="url(#arrowRedEnd-${uid})"/>
    <line x1="485" y1="364" x2="485" y2="328" stroke="#F87171" stroke-width="1.5" marker-end="url(#arrowRedEnd-${uid})"/>
    <line x1="560" y1="364" x2="560" y2="328" stroke="#F87171" stroke-width="1.5" marker-end="url(#arrowRedEnd-${uid})"/>
    <line x1="635" y1="364" x2="635" y2="328" stroke="#F87171" stroke-width="1.5" marker-end="url(#arrowRedEnd-${uid})"/>
  </g>

  <!-- ======================================================================= -->
  <!-- 2. VAPOR CHAMBER CROSS-SECTION GEOMETRY (X: 135..665, Y: 108..320)      -->
  <!--    Top Plate:    Y = 108..148 (40px -> 0.08 mm)                         -->
  <!--    Top Wick:     Y = 148..172 (24px -> 0.06 mm)                         -->
  <!--    Air/Vapor Gap:Y = 172..256 (84px -> 0.09 mm / 70-110 µm core)        -->
  <!--    Bottom Wick:  Y = 256..280 (24px -> 0.06 mm)                         -->
  <!--    Bottom Plate: Y = 280..320 (40px -> 0.08 mm)                         -->
  <!--    Total Stack:  Y = 108..320 (212px -> 0.35 mm)                        -->
  <!-- ======================================================================= -->

  <!-- Central Vacuum / Air Gap Background (10^-3 Torr) -->
  <rect x="135" y="172" width="530" height="84" fill="#101820" opacity="0.85"/>

  <!-- Subtle Deflection Phantom Curve between Pillars 1 & 2 showing prevented collapse -->
  <path d="M 262 172 Q 315 190 368 172" fill="none" stroke="#F87171" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.75"/>
  <text x="315" y="198" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="8.5" fill="#F87171">
    MAX SPAN DEFLECTION &lt; 3 µm
  </text>

  <!-- Vapor / Steam Flow Lines in the Air Gap -->
  <line x1="150" y1="214" x2="650" y2="214" stroke="#38BDF8" stroke-width="1.3" stroke-dasharray="8 5" opacity="0.65"/>
  <line x1="150" y1="232" x2="520" y2="232" stroke="#38BDF8" stroke-width="1.1" stroke-dasharray="6 4" opacity="0.45"/>

  <!-- TOP COPPER PLATE (0.08 mm OFHC Copper Foil, with stamped dimple on right column) -->
  <!-- Left & Center flat top plate + Right stamped dimple depression at X=585 -->
  <path d="
    M 135 108
    L 545 108
    C 560 108, 565 162, 575 162
    L 595 162
    C 605 162, 610 108, 625 108
    L 665 108
    L 665 148
    L 622 148
    C 612 148, 606 256, 596 256
    L 574 256
    C 564 256, 558 148, 548 148
    L 135 148
    Z
  " fill="url(#cuHatch-${uid})" stroke="#D97757" stroke-width="2"/>

  <!-- TOP SINTERED WICK LINING (0.06 mm porous copper sponge) -->
  <rect x="135" y="148" width="410" height="24" fill="url(#wickDots-${uid})" stroke="#B45309" stroke-width="1.2"/>
  <rect x="625" y="148" width="40" height="24" fill="url(#wickDots-${uid})" stroke="#B45309" stroke-width="1.2"/>

  <!-- BOTTOM SINTERED WICK LINING (0.06 mm porous copper sponge between pillars) -->
  <rect x="135" y="256" width="58" height="24" fill="url(#wickDots-${uid})" stroke="#B45309" stroke-width="1.2"/>
  <rect x="257" y="256" width="116" height="24" fill="url(#wickDots-${uid})" stroke="#B45309" stroke-width="1.2"/>
  <rect x="437" y="256" width="128" height="24" fill="url(#wickDots-${uid})" stroke="#B45309" stroke-width="1.2"/>
  <rect x="605" y="256" width="60" height="24" fill="url(#wickDots-${uid})" stroke="#B45309" stroke-width="1.2"/>

  <!-- BOTTOM COPPER PLATE + INTEGRAL HALF-ETCHED SUPPORT PILLARS (Monolithic C10200 Copper) -->
  <!-- Bottom plate is 0.08 mm (Y: 280..320) with two half-etched integral columns rising to Y=148 (through wick to top plate) -->
  <path d="
    M 135 280
    L 185 280
    Q 198 280, 198 266
    L 198 148
    L 252 148
    L 252 266
    Q 252 280, 265 280
    L 365 280
    Q 378 280, 378 266
    L 378 148
    L 432 148
    L 432 266
    Q 432 280, 445 280
    L 665 280
    L 665 320
    L 135 320
    Z
  " fill="url(#pillarHatch-${uid})" stroke="#F59E0B" stroke-width="2"/>

  <!-- Diffusion-Bond / Sintered Contact Interfaces at Pillar & Dimple Tops/Bottoms -->
  <line x1="198" y1="148" x2="252" y2="148" stroke="#10B981" stroke-width="3"/>
  <line x1="378" y1="148" x2="432" y2="148" stroke="#10B981" stroke-width="3"/>
  <line x1="572" y1="256" x2="598" y2="256" stroke="#10B981" stroke-width="3"/>

  <!-- Pillar Centerlines (Kinematic Pitch Reference) -->
  <line x1="225" y1="92" x2="225" y2="335" stroke="#9E9C94" stroke-width="1" stroke-dasharray="6 3"/>
  <line x1="405" y1="92" x2="405" y2="335" stroke="#9E9C94" stroke-width="1" stroke-dasharray="6 3"/>
  <line x1="585" y1="92" x2="585" y2="335" stroke="#9E9C94" stroke-width="1" stroke-dasharray="6 3"/>

  <!-- ======================================================================= -->
  <!-- 3. PRECISION ENGINEERING DIMENSIONS & CALLOUTS                          -->
  <!-- ======================================================================= -->

  <!-- A. Left Margin: Total Vapor Chamber Thickness (0.35 mm) -->
  <g>
    <line x1="68" y1="108" x2="132" y2="108" stroke="#EDEDEB" stroke-width="0.9" stroke-dasharray="2 2"/>
    <line x1="68" y1="320" x2="132" y2="320" stroke="#EDEDEB" stroke-width="0.9" stroke-dasharray="2 2"/>
    <line x1="78" y1="112" x2="78" y2="316" stroke="#EDEDEB" stroke-width="1.5" marker-start="url(#arrowWhiteStart-${uid})" marker-end="url(#arrowWhiteEnd-${uid})"/>
    <rect x="14" y="192" width="112" height="44" rx="4" fill="#1C1B19" stroke="#EDEDEB" stroke-width="1.2"/>
    <text x="70" y="211" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700" fill="#EDEDEB">0.35 mm</text>
    <text x="70" y="227" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="8.5" fill="#9E9C94">TOTAL STACK</text>
  </g>

  <!-- B. Right Margin: Top Plate Thickness (0.08 mm), Air Gap (0.09 mm), Bottom Plate (0.08 mm) -->
  <g>
    <!-- Top Plate Extension & Dimension (Y: 108..148) -->
    <line x1="668" y1="108" x2="715" y2="108" stroke="#D97757" stroke-width="1"/>
    <line x1="668" y1="148" x2="715" y2="148" stroke="#D97757" stroke-width="1"/>
    <line x1="702" y1="111" x2="702" y2="145" stroke="#D97757" stroke-width="1.4" marker-start="url(#arrowOrangeStart-${uid})" marker-end="url(#arrowOrangeEnd-${uid})"/>
    <text x="720" y="125" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="700" fill="#D97757">TOP PLATE</text>
    <text x="720" y="139" font-family="'JetBrains Mono', monospace" font-size="10" fill="#EDEDEB">${escapeXml(specs.topPlate)} Cu Foil</text>

    <!-- Wick Thickness Callout (Y: 148..172) -->
    <line x1="668" y1="172" x2="715" y2="172" stroke="#F59E0B" stroke-width="1"/>
    <text x="720" y="164" font-family="'JetBrains Mono', monospace" font-size="9.5" fill="#F59E0B">WICK: ${escapeXml(specs.wickThickness)} (×2)</text>

    <!-- Air / Vapor Gap Extension & Dimension (Y: 172..256) -->
    <line x1="668" y1="256" x2="715" y2="256" stroke="#38BDF8" stroke-width="1"/>
    <line x1="702" y1="175" x2="702" y2="253" stroke="#38BDF8" stroke-width="1.5" marker-start="url(#arrowCyanStart-${uid})" marker-end="url(#arrowCyanEnd-${uid})"/>
    <text x="720" y="205" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="700" fill="#38BDF8">AIR / VAPOR GAP</text>
    <text x="720" y="220" font-family="'JetBrains Mono', monospace" font-size="10" fill="#EDEDEB">0.09 mm (70–110 µm)</text>
    <text x="720" y="234" font-family="'JetBrains Mono', monospace" font-size="8.5" fill="#9E9C94">10⁻³ Torr Vacuum Core</text>

    <!-- Bottom Plate Extension & Dimension (Y: 280..320) -->
    <line x1="668" y1="280" x2="715" y2="280" stroke="#D97757" stroke-width="1"/>
    <line x1="668" y1="320" x2="715" y2="320" stroke="#D97757" stroke-width="1"/>
    <line x1="702" y1="283" x2="702" y2="317" stroke="#D97757" stroke-width="1.4" marker-start="url(#arrowOrangeStart-${uid})" marker-end="url(#arrowOrangeEnd-${uid})"/>
    <text x="720" y="297" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="700" fill="#D97757">BOTTOM PLATE</text>
    <text x="720" y="311" font-family="'JetBrains Mono', monospace" font-size="10" fill="#EDEDEB">${escapeXml(specs.bottomPlate)} Cu Foil</text>
  </g>

  <!-- C. Pillar Width (Ø 0.35 mm) & Etched Pillar Height (0.12 ± 0.005 mm) inside Cross-Section -->
  <g>
    <!-- Pillar 1 Width Dimension (X: 198..252) -->
    <line x1="201" y1="214" x2="249" y2="214" stroke="#EDEDEB" stroke-width="1.4" marker-start="url(#arrowWhiteStart-${uid})" marker-end="url(#arrowWhiteEnd-${uid})"/>
    <rect x="184" y="222" width="82" height="28" rx="3" fill="#161615" stroke="#F59E0B" stroke-width="1"/>
    <text x="225" y="234" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="700" fill="#F59E0B">Ø 0.35 mm</text>
    <text x="225" y="245" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="8" fill="#EDEDEB">PILLAR WIDTH</text>

    <!-- Pillar 2 Height Dimension (Y: 148..280 -> 0.12 ± 0.005 mm half-etched column height) -->
    <line x1="446" y1="148" x2="468" y2="148" stroke="#10B981" stroke-width="1"/>
    <line x1="446" y1="280" x2="468" y2="280" stroke="#10B981" stroke-width="1"/>
    <line x1="458" y1="152" x2="458" y2="276" stroke="#10B981" stroke-width="1.4" marker-start="url(#arrowEmeraldStart-${uid})" marker-end="url(#arrowEmeraldEnd-${uid})"/>
    <rect x="466" y="192" width="96" height="40" rx="3" fill="#161615" stroke="#10B981" stroke-width="1"/>
    <text x="514" y="208" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="700" fill="#10B981">H = 0.12 mm</text>
    <text x="514" y="220" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="8" fill="#EDEDEB">±0.005 mm ETCH</text>
    <text x="514" y="229" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="7.5" fill="#9E9C94">PILLAR HEIGHT</text>

    <!-- Column 3: Stamped Dimple / Support Column Callout -->
    <rect x="536" y="176" width="98" height="32" rx="3" fill="#161615" stroke="#D97757" stroke-width="1"/>
    <text x="585" y="190" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="9" font-weight="700" fill="#D97757">STAMPED DIMPLE</text>
    <text x="585" y="202" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="8" fill="#EDEDEB">Ø 0.35 mm BRIDGE</text>
  </g>

  <!-- D. Pillar Center-to-Center Pitch Dimension (1.20 mm) & Feature Callouts at Bottom -->
  <g>
    <!-- Pitch between Pillar 1 (X=225) and Pillar 2 (X=405) -->
    <line x1="228" y1="88" x2="402" y2="88" stroke="#10B981" stroke-width="1.4" marker-start="url(#arrowEmeraldStart-${uid})" marker-end="url(#arrowEmeraldEnd-${uid})"/>
    <rect x="255" y="74" width="120" height="22" rx="3" fill="#161615" stroke="#10B981" stroke-width="1"/>
    <text x="315" y="89" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="700" fill="#10B981">1.20 mm PITCH</text>

    <!-- Pitch between Pillar 2 (X=405) and Dimple 3 (X=585) -->
    <line x1="408" y1="88" x2="582" y2="88" stroke="#10B981" stroke-width="1.4" marker-start="url(#arrowEmeraldStart-${uid})" marker-end="url(#arrowEmeraldEnd-${uid})"/>
    <rect x="435" y="74" width="120" height="22" rx="3" fill="#161615" stroke="#10B981" stroke-width="1"/>
    <text x="495" y="89" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="700" fill="#10B981">1.20 mm PITCH</text>
  </g>

  <!-- Bottom Engineering Legend Strip -->
  <g transform="translate(24, 384)">
    <rect x="0" y="0" width="772" height="32" rx="5" fill="#1C1B19" stroke="#383734" stroke-width="1"/>
    <circle cx="16" cy="16" r="4" fill="#F59E0B"/>
    <text x="26" y="20" font-family="'JetBrains Mono', monospace" font-size="9.5" fill="#EDEDEB">HALF-ETCHED Cu PILLARS (FeCl₃ ACID ETCH)</text>
    <circle cx="290" cy="16" r="4" fill="#10B981"/>
    <text x="300" y="20" font-family="'JetBrains Mono', monospace" font-size="9.5" fill="#EDEDEB">DIFFUSION-BONDED INTERFACE</text>
    <circle cx="505" cy="16" r="4" fill="#38BDF8"/>
    <text x="515" y="20" font-family="'JetBrains Mono', monospace" font-size="9.5" fill="#EDEDEB">STEAM GAP: 0.35 − 2(0.08) − 2(0.06) = 0.07–0.11 mm</text>
  </g>
</svg>
`.trim();
}

/**
 * FIG 01 — PLANAR VAPOR CHAMBER TEARDOWN:
 * Full-Envelope Cleaved Cross-Section showing SoC Die Hotspot (80 W/cm²),
 * 0.08 mm Top/Bottom Copper Plates, 0.06 mm Wick, 0.09 mm Vapor Cavity, and 0.12 mm Laser Seam Weld
 */
function generateVaporChamberEnvelopeCrossSection(): string {
  const uid = "vc-env-cs";
  return `
<svg viewBox="0 0 820 420" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto bg-[#161615] rounded-xl border border-[#383734]">
  ${buildCadDefs(uid)}
  <rect width="820" height="420" fill="url(#cadMajorGrid-${uid})" />

  <text x="24" y="26" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="700" fill="#D97757" letter-spacing="0.06em">
    SECTION B–B // CLEAVED 0.35 mm PLANAR VAPOR CHAMBER &amp; TWO-PHASE LOOP ARCHITECTURE
  </text>
  <text x="796" y="26" text-anchor="end" font-family="'JetBrains Mono', monospace" font-size="10" fill="#9E9C94">
    k_eff &gt; 6,500 W/(m·K) • 10⁻³ TORR VACUUM
  </text>

  <!-- Condenser Heat Rejection Arrows at Top Left & Top Right -->
  <g>
    <text x="195" y="58" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="700" fill="#38BDF8">CONDENSER ZONE (LATENT HEAT OUT)</text>
    <line x1="145" y1="92" x2="145" y2="66" stroke="#38BDF8" stroke-width="1.5" marker-end="url(#arrowCyanEnd-${uid})"/>
    <line x1="195" y1="92" x2="195" y2="66" stroke="#38BDF8" stroke-width="1.5" marker-end="url(#arrowCyanEnd-${uid})"/>
    <line x1="245" y1="92" x2="245" y2="66" stroke="#38BDF8" stroke-width="1.5" marker-end="url(#arrowCyanEnd-${uid})"/>

    <text x="615" y="58" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="700" fill="#38BDF8">CONDENSER ZONE (LATENT HEAT OUT)</text>
    <line x1="565" y1="92" x2="565" y2="66" stroke="#38BDF8" stroke-width="1.5" marker-end="url(#arrowCyanEnd-${uid})"/>
    <line x1="615" y1="92" x2="615" y2="66" stroke="#38BDF8" stroke-width="1.5" marker-end="url(#arrowCyanEnd-${uid})"/>
    <line x1="665" y1="92" x2="665" y2="66" stroke="#38BDF8" stroke-width="1.5" marker-end="url(#arrowCyanEnd-${uid})"/>
  </g>

  <!-- Main Vapor Chamber Cross-Section (X: 70..740, Y: 98..288) -->
  <!-- Internal Vapor Core (0.09 mm) -->
  <rect x="105" y="152" width="600" height="82" fill="#0F1722"/>

  <!-- Top Copper Shell (0.08 mm) with pinched perimeter flanges -->
  <path d="M 70 175 L 105 98 L 705 98 L 740 175 L 740 193 L 700 130 L 110 130 L 70 193 Z" fill="url(#cuHatch-${uid})" stroke="#D97757" stroke-width="2"/>

  <!-- Bottom Copper Shell (0.08 mm) with pinched perimeter flanges -->
  <path d="M 70 193 L 110 256 L 700 256 L 740 193 L 740 211 L 705 288 L 105 288 L 70 211 Z" fill="url(#cuHatch-${uid})" stroke="#D97757" stroke-width="2"/>

  <!-- Fiber-Laser Hermetic Edge Welds (Left & Right Flanges, 0.12 mm seam) -->
  <circle cx="72" cy="193" r="6" fill="#10B981" stroke="#EDEDEB" stroke-width="1.2"/>
  <circle cx="738" cy="193" r="6" fill="#10B981" stroke="#EDEDEB" stroke-width="1.2"/>
  <text x="72" y="162" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="9" font-weight="700" fill="#10B981">0.12 mm LASER WELD</text>
  <text x="72" y="173" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="8" fill="#9E9C94">&lt;10⁻⁹ mbar·L/s</text>

  <!-- Upper & Lower Sintered Copper Powder Wick (0.06 mm) -->
  <rect x="110" y="130" width="590" height="22" fill="url(#wickDots-${uid})" stroke="#F59E0B" stroke-width="1.2"/>
  <rect x="110" y="234" width="590" height="22" fill="url(#wickDots-${uid})" stroke="#F59E0B" stroke-width="1.2"/>

  <!-- Internal Support Pillars bridging core -->
  <rect x="220" y="130" width="28" height="126" fill="url(#pillarHatch-${uid})" stroke="#F59E0B" stroke-width="1.5"/>
  <rect x="562" y="130" width="28" height="126" fill="url(#pillarHatch-${uid})" stroke="#F59E0B" stroke-width="1.5"/>

  <!-- Outward High-Speed Steam Expansion Arrows in 0.09 mm Vapor Core -->
  <path d="M 385 215 Q 360 190 265 188" fill="none" stroke="#38BDF8" stroke-width="2.2" stroke-dasharray="6 3" marker-end="url(#arrowCyanEnd-${uid})"/>
  <path d="M 425 215 Q 450 190 545 188" fill="none" stroke="#38BDF8" stroke-width="2.2" stroke-dasharray="6 3" marker-end="url(#arrowCyanEnd-${uid})"/>
  <text x="405" y="178" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="700" fill="#38BDF8">
    VAPOR CORE (0.09 mm GAP) • STEAM FLASH EXPANSION (q = ṁ·h_fg)
  </text>

  <!-- Capillary Liquid Return Arrows inside Sintered Wick -->
  <line x1="210" y1="245" x2="355" y2="245" stroke="#10B981" stroke-width="2" marker-end="url(#arrowEmeraldEnd-${uid})"/>
  <line x1="600" y1="245" x2="455" y2="245" stroke="#10B981" stroke-width="2" marker-end="url(#arrowEmeraldEnd-${uid})"/>
  <text x="285" y="272" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="9" font-weight="700" fill="#10B981">CAPILLARY RETURN →</text>
  <text x="525" y="272" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="9" font-weight="700" fill="#10B981">← CAPILLARY RETURN</text>

  <!-- Smartphone 3nm SoC Processor Die (10 x 10 mm, 80 W/cm² Heat Source) -->
  <rect x="335" y="294" width="140" height="32" rx="3" fill="#2A1215" stroke="#F87171" stroke-width="2"/>
  <text x="405" y="310" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="700" fill="#F87171">3nm SoC DIE (10×10 mm)</text>
  <text x="405" y="322" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="8.5" fill="#EDEDEB">EVAPORATOR LOAD: 80–85 W/cm²</text>

  <!-- Total Thickness Dimension on Left -->
  <line x1="34" y1="98" x2="98" y2="98" stroke="#EDEDEB" stroke-width="0.9" stroke-dasharray="2 2"/>
  <line x1="34" y1="288" x2="98" y2="288" stroke="#EDEDEB" stroke-width="0.9" stroke-dasharray="2 2"/>
  <line x1="42" y1="102" x2="42" y2="284" stroke="#EDEDEB" stroke-width="1.4" marker-start="url(#arrowWhiteStart-${uid})" marker-end="url(#arrowWhiteEnd-${uid})"/>
  <text x="42" y="88" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="700" fill="#EDEDEB">0.35 mm</text>

  <!-- Layer Thickness Summary Strip at Bottom -->
  <g transform="translate(24, 356)">
    <rect x="0" y="0" width="772" height="44" rx="5" fill="#1C1B19" stroke="#383734" stroke-width="1"/>
    <text x="18" y="19" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="700" fill="#D97757">TOP/BOT SHELLS: 0.08 mm Cu</text>
    <text x="18" y="34" font-family="'JetBrains Mono', monospace" font-size="8.5" fill="#9E9C94">Flatness ±0.015 mm</text>

    <text x="225" y="19" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="700" fill="#F59E0B">SINTERED WICK: 0.06 mm (×2)</text>
    <text x="225" y="34" font-family="'JetBrains Mono', monospace" font-size="8.5" fill="#9E9C94">35–55 µm Cu Powder • 45% Pores</text>

    <text x="455" y="19" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="700" fill="#38BDF8">STEAM GAP: 0.07–0.11 mm</text>
    <text x="455" y="34" font-family="'JetBrains Mono', monospace" font-size="8.5" fill="#9E9C94">h_fg = 2.45×10⁶ J/kg @ 40°C</text>

    <text x="645" y="19" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="700" fill="#10B981">PILLARS: Ø 0.35 mm</text>
    <text x="645" y="34" font-family="'JetBrains Mono', monospace" font-size="8.5" fill="#9E9C94">1.20 mm Pitch</text>
  </g>
</svg>
`.trim();
}

/**
 * FIG 02 — SINTERED POWDER MICROSTRUCTURE:
 * High-Magnification Metallurgical Cross-Section of the Biporous Dual-Layer Copper Wick
 * on the 0.08 mm Copper Plate showing coarse 60 µm highway layer + fine 25 µm suction layer + necking
 */
function generateSinteredWickCrossSection(): string {
  const uid = "vc-wick-cs";
  return `
<svg viewBox="0 0 820 420" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto bg-[#161615] rounded-xl border border-[#383734]">
  ${buildCadDefs(uid)}
  <rect width="820" height="420" fill="url(#cadMajorGrid-${uid})" />

  <text x="24" y="26" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="700" fill="#D97757" letter-spacing="0.06em">
    DETAIL C // BIPOROUS SINTERED COPPER WICK CROSS-SECTION &amp; YOUNG-LAPLACE MENISCUS
  </text>
  <text x="796" y="26" text-anchor="end" font-family="'JetBrains Mono', monospace" font-size="10" fill="#9E9C94">
    850°C H₂ SINTERING • 45% ± 3% POROSITY
  </text>

  <!-- Vapor Space Above Wick (0.09 mm Steam Core) -->
  <rect x="120" y="55" width="540" height="70" fill="#0F1722" stroke="#262522" stroke-width="1"/>
  <text x="390" y="78" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="700" fill="#38BDF8">
    VAPOR CORE (0.09 mm STEAM GAP) — THIN-FILM EVAPORATION AT CURVED MENISCUS
  </text>

  <!-- Top Layer: Fine Copper Powder Cap (25–35 µm spheres -> High Young-Laplace Suction ΔP_c > 7.2 kPa) -->
  <!-- Concave Water Meniscus Arcs between fine spheres -->
  <path d="M 155 142 Q 190 162 225 142 Q 260 162 295 142 Q 330 162 365 142 Q 400 162 435 142 Q 470 162 505 142 Q 540 162 575 142 Q 610 162 645 142" fill="none" stroke="#38BDF8" stroke-width="2.5"/>

  <!-- Liquid Water saturating pore spaces -->
  <rect x="120" y="145" width="540" height="145" fill="#0C2536" opacity="0.7"/>

  <!-- Fine Copper Spheres Row (Y=152, R=22 -> 25–35 µm fine suction cap) -->
  <g fill="#B45309" stroke="#F59E0B" stroke-width="1.8">
    <circle cx="155" cy="152" r="21"/>
    <circle cx="225" cy="152" r="21"/>
    <circle cx="295" cy="152" r="21"/>
    <circle cx="365" cy="152" r="21"/>
    <circle cx="435" cy="152" r="21"/>
    <circle cx="505" cy="152" r="21"/>
    <circle cx="575" cy="152" r="21"/>
    <circle cx="645" cy="152" r="21"/>
  </g>

  <!-- Coarse Copper Spheres Base Layer (Y=232, R=38 -> 60 µm low-drag return highway) -->
  <g fill="#92400E" stroke="#D97757" stroke-width="2">
    <circle cx="170" cy="232" r="38"/>
    <circle cx="268" cy="232" r="38"/>
    <circle cx="366" cy="232" r="38"/>
    <circle cx="464" cy="232" r="38"/>
    <circle cx="562" cy="232" r="38"/>
    <circle cx="640" cy="232" r="32"/>
  </g>

  <!-- Sintered Solid-State Diffusion Necks between spheres (850°C necking) -->
  <g fill="#10B981">
    <rect x="213" y="224" width="12" height="16" rx="3"/>
    <rect x="311" y="224" width="12" height="16" rx="3"/>
    <rect x="409" y="224" width="12" height="16" rx="3"/>
    <rect x="507" y="224" width="12" height="16" rx="3"/>
  </g>

  <!-- Low-Drag Liquid Return Flow Arrows through Coarse Base Layer -->
  <line x1="620" y1="278" x2="180" y2="278" stroke="#38BDF8" stroke-width="2" stroke-dasharray="8 4" marker-end="url(#arrowCyanEnd-${uid})"/>

  <!-- Bottom Copper Shell Plate (0.08 mm C10200 Copper Wall, Y: 290..340) -->
  <rect x="120" y="290" width="540" height="50" fill="url(#cuHatch-${uid})" stroke="#D97757" stroke-width="2"/>
  <text x="390" y="320" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="700" fill="#EDEDEB">
    BOTTOM COPPER SHELL PLATE (0.08 mm / 80 µm OFHC COPPER)
  </text>

  <!-- Pore Radius & Meniscus Callout -->
  <line x1="260" y1="152" x2="260" y2="105" stroke="#38BDF8" stroke-width="1.2"/>
  <rect x="150" y="86" width="225" height="24" rx="3" fill="#161615" stroke="#38BDF8" stroke-width="1"/>
  <text x="262" y="102" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="9" font-weight="700" fill="#38BDF8">
    r_pore ≈ 20 µm → ΔP_c = 2σ·cosθ / r &gt; 7.2 kPa
  </text>

  <!-- Right-Side Layer Dimension Callouts -->
  <g>
    <line x1="666" y1="130" x2="700" y2="130" stroke="#F59E0B" stroke-width="1"/>
    <line x1="666" y1="185" x2="700" y2="185" stroke="#F59E0B" stroke-width="1"/>
    <text x="708" y="152" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="700" fill="#F59E0B">FINE CAP (25 µm)</text>
    <text x="708" y="166" font-family="'JetBrains Mono', monospace" font-size="8.5" fill="#9E9C94">High Capillary Suction</text>

    <line x1="666" y1="290" x2="700" y2="290" stroke="#D97757" stroke-width="1"/>
    <text x="708" y="232" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="700" fill="#D97757">COARSE BASE (60 µm)</text>
    <text x="708" y="246" font-family="'JetBrains Mono', monospace" font-size="8.5" fill="#9E9C94">K &gt; 2.5×10⁻¹¹ m² Highway</text>

    <line x1="666" y1="340" x2="700" y2="340" stroke="#EDEDEB" stroke-width="1"/>
    <text x="708" y="318" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="700" fill="#EDEDEB">0.08 mm Cu WALL</text>
  </g>

  <!-- Left-Side Total Wick Thickness (0.06 mm) -->
  <line x1="78" y1="130" x2="116" y2="130" stroke="#F59E0B" stroke-width="1"/>
  <line x1="78" y1="290" x2="116" y2="290" stroke="#F59E0B" stroke-width="1"/>
  <line x1="88" y1="134" x2="88" y2="286" stroke="#F59E0B" stroke-width="1.4" marker-start="url(#arrowOrangeStart-${uid})" marker-end="url(#arrowOrangeEnd-${uid})"/>
  <rect x="16" y="192" width="94" height="36" rx="4" fill="#1C1B19" stroke="#F59E0B" stroke-width="1"/>
  <text x="63" y="208" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="700" fill="#F59E0B">0.06 mm</text>
  <text x="63" y="221" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="8" fill="#9E9C94">DUAL WICK</text>

  <!-- Bottom Legend Strip -->
  <g transform="translate(24, 368)">
    <rect x="0" y="0" width="772" height="34" rx="5" fill="#1C1B19" stroke="#383734" stroke-width="1"/>
    <circle cx="18" cy="17" r="4" fill="#10B981"/>
    <text x="28" y="21" font-family="'JetBrains Mono', monospace" font-size="9.5" fill="#EDEDEB">SINTERED DIFFUSION NECKS (850°C)</text>
    <circle cx="275" cy="17" r="4" fill="#38BDF8"/>
    <text x="285" y="21" font-family="'JetBrains Mono', monospace" font-size="9.5" fill="#EDEDEB">MENISCUS SUCTION (ΔP_c ∝ 1/r_pore)</text>
    <circle cx="535" cy="17" r="4" fill="#D97757"/>
    <text x="545" y="21" font-family="'JetBrains Mono', monospace" font-size="9.5" fill="#EDEDEB">KOZENY-CARMAN FLOW (K ∝ d²)</text>
  </g>
</svg>
`.trim();
}

/**
 * FIG 04 — INFRARED THERMOGRAPHY & BENCH METROLOGY:
 * Cross-Section of the Calibrated 120 fps FLIR Thermal Test Bench & Isotherm Profile
 */
function generateThermalBenchCrossSection(): string {
  const uid = "vc-ir-bench";
  return `
<svg viewBox="0 0 820 420" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto bg-[#161615] rounded-xl border border-[#383734]">
  ${buildCadDefs(uid)}
  <rect width="820" height="420" fill="url(#cadMajorGrid-${uid})" />

  <text x="24" y="26" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="700" fill="#D97757" letter-spacing="0.06em">
    BENCH SETUP // 120 FPS RADIOMETRIC IR THERMOGRAPHY &amp; ISOTHERM PROFILE
  </text>
  <text x="796" y="26" text-anchor="end" font-family="'JetBrains Mono', monospace" font-size="10" fill="#9E9C94">
    ε = 0.95 MATTE BLACK • R_th ≤ 0.08 K/W
  </text>

  <!-- FLIR 120 fps IR Camera Optical Head (Top Center) -->
  <rect x="330" y="46" width="160" height="36" rx="4" fill="#1C1B19" stroke="#D97757" stroke-width="1.8"/>
  <text x="410" y="62" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="700" fill="#D97757">FLIR IR RADIOMETER</text>
  <text x="410" y="75" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="8.5" fill="#9E9C94">120 fps • 15 µm Resolution</text>

  <!-- Optical Field of View Cone -->
  <line x1="350" y1="82" x2="120" y2="232" stroke="#D97757" stroke-width="1.2" stroke-dasharray="5 4"/>
  <line x1="470" y1="82" x2="700" y2="232" stroke="#D97757" stroke-width="1.2" stroke-dasharray="5 4"/>

  <!-- Temperature Distribution Curve Comparison (Y: 100..220) -->
  <!-- Solid Copper Spike Curve (Dashed Red: spikes >105°C over chip) -->
  <path d="M 130 212 C 260 210, 345 200, 380 118 C 395 92, 425 92, 440 118 C 475 200, 560 210, 690 212" fill="none" stroke="#F87171" stroke-width="2" stroke-dasharray="5 3"/>
  <text x="535" y="118" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="700" fill="#F87171">SOLID 0.35 mm Cu (105°C SPIKE)</text>

  <!-- Vapor Chamber Isothermal Curve (Solid Emerald: ΔT <= 3.5°C across full 120 mm span) -->
  <path d="M 130 190 Q 410 174 690 190" fill="none" stroke="#10B981" stroke-width="2.5"/>
  <text x="410" y="168" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="700" fill="#10B981">
    0.35 mm VAPOR CHAMBER ISOTHERM (ΔT_evap-cond ≤ 3.5°C @ 20W)
  </text>

  <!-- High-Emissivity Matte Black Paint Coating (ε = 0.95, 5 µm) -->
  <rect x="110" y="232" width="600" height="8" fill="#262626" stroke="#9E9C94" stroke-width="1"/>
  <text x="720" y="240" font-family="'JetBrains Mono', monospace" font-size="9" fill="#9E9C94">ε = 0.95 COATING</text>

  <!-- 0.35 mm Vapor Chamber Cross-Section on Test Rig (Y: 240..278) -->
  <rect x="110" y="240" width="600" height="38" fill="url(#cuHatch-${uid})" stroke="#D97757" stroke-width="1.8"/>
  <rect x="130" y="250" width="560" height="18" fill="#0F1722" stroke="#38BDF8" stroke-width="1"/>
  <text x="410" y="263" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="700" fill="#38BDF8">
    0.35 mm VAPOR CHAMBER ENVELOPE (120 × 65 mm)
  </text>

  <!-- 12 x 12 mm Copper Heater Block (10W - 85W Simulated SoC Load) -->
  <rect x="355" y="278" width="110" height="58" fill="url(#pillarHatch-${uid})" stroke="#F87171" stroke-width="2"/>
  <circle cx="410" cy="292" r="3" fill="#FBBF24"/>
  <circle cx="410" cy="307" r="3" fill="#FBBF24"/>
  <circle cx="410" cy="322" r="3" fill="#FBBF24"/>
  <text x="410" y="352" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="700" fill="#F87171">
    12×12 mm Cu HEATER BLOCK (10–85W LOAD)
  </text>
  <text x="410" y="365" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="8.5" fill="#9E9C94">
    3× Type-T Thermocouples • 360° Gravity Tilt Fixture
  </text>
</svg>
`.trim();
}

/**
 * Dynamic Section-Aware Engineering Cross-Section Generator for any other topic/section
 */
function generateContextualCrossSection(params: CadRequestParams, specs: ExtractedSpecs): string {
  const uid = `cad-${params.figNumber || "01"}`;
  const cleanHeading = (params.sectionHeading || params.topic || "Mechanical Assembly")
    .replace(/^(?:Section\s+\d+[:.]?\s*|\d+[\.:]\s*)/i, "")
    .trim()
    .slice(0, 52)
    .toUpperCase();

  const captionShort = (params.caption || params.title || "Cross-Section Schematic")
    .replace(/^FIG\s+\d+\s*[—–-]\s*/i, "")
    .slice(0, 68);

  const dim1 = specs.dimensions[0] || "0.35 mm";
  const dim2 = specs.dimensions[1] || "0.08 mm";
  const dim3 = specs.dimensions[2] || "±0.005 mm";

  return `
<svg viewBox="0 0 820 400" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto bg-[#161615] rounded-xl border border-[#383734]">
  ${buildCadDefs(uid)}
  <rect width="820" height="400" fill="url(#cadMajorGrid-${uid})" />

  <text x="24" y="28" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="700" fill="#D97757" letter-spacing="0.06em">
    SECTION A–A // ${escapeXml(cleanHeading)}
  </text>
  <text x="796" y="28" text-anchor="end" font-family="'JetBrains Mono', monospace" font-size="9.5" fill="#9E9C94">
    ORTHOGRAPHIC CROSS-SECTION
  </text>

  <!-- Upper Structural Housing / Plate -->
  <rect x="130" y="95" width="540" height="44" fill="url(#cuHatch-${uid})" stroke="#D97757" stroke-width="2"/>
  <!-- Working Clearance / Core Gap -->
  <rect x="130" y="139" width="540" height="92" fill="#101820" stroke="#38BDF8" stroke-width="1.2"/>
  <!-- Internal Load-Bearing Pillars / Guides -->
  <rect x="235" y="139" width="46" height="92" fill="url(#pillarHatch-${uid})" stroke="#F59E0B" stroke-width="1.8"/>
  <rect x="519" y="139" width="46" height="92" fill="url(#pillarHatch-${uid})" stroke="#F59E0B" stroke-width="1.8"/>
  <!-- Lower Baseplate -->
  <rect x="130" y="231" width="540" height="44" fill="url(#cuHatch-${uid})" stroke="#D97757" stroke-width="2"/>

  <!-- Centerline -->
  <line x1="100" y1="185" x2="700" y2="185" stroke="#38BDF8" stroke-width="1.1" stroke-dasharray="8 4"/>

  <!-- Left Stack Dimension -->
  <line x1="78" y1="95" x2="125" y2="95" stroke="#EDEDEB" stroke-width="1"/>
  <line x1="78" y1="275" x2="125" y2="275" stroke="#EDEDEB" stroke-width="1"/>
  <line x1="88" y1="99" x2="88" y2="271" stroke="#EDEDEB" stroke-width="1.4" marker-start="url(#arrowWhiteStart-${uid})" marker-end="url(#arrowWhiteEnd-${uid})"/>
  <text x="54" y="188" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="700" fill="#EDEDEB">${escapeXml(dim1)}</text>

  <!-- Right Layer Dimensions -->
  <text x="685" y="121" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="700" fill="#D97757">UPPER PLATE: ${escapeXml(dim2)}</text>
  <text x="685" y="189" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="700" fill="#38BDF8">CORE GAP: ${escapeXml(dim3)}</text>
  <text x="685" y="257" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="700" fill="#D97757">BASE PLATE: ${escapeXml(dim2)}</text>

  <text x="400" y="345" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="10" fill="#9E9C94">
    ${escapeXml(captionShort)}
  </text>
</svg>
`.trim();
}

export function generateCadVectorSvg(params: CadRequestParams): string {
  // Approach A: Spec -> Renderer -> Automated Visual Quality Gate
  const spec = deriveDrawingSpec(params);
  const svg = renderDrawingSpec(spec);

  // Run through automated visual quality gate
  const validation = validateDrawingSvg(svg, `FIG ${params.figNumber || 'CAD'}`);
  if (!validation.valid) {
    console.warn(
      `[CAD QUALITY GATE WARNING] Generated SVG had validation issues:`,
      validation.errors
    );
  }

  return svg;
}
