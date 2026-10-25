import type { DrawingSpec, DrawingLayer, LayerFeature, HatchType, ColorScheme } from './cad-spec.ts';

function escapeXml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getColorToken(scheme: ColorScheme | string): { primary: string; secondary: string; bg: string } {
  switch (scheme) {
    case 'copper':
      return { primary: '#D97757', secondary: '#F59E0B', bg: '#2A1C15' };
    case 'silicon':
      return { primary: '#0284C7', secondary: '#38BDF8', bg: '#0C202F' };
    case 'piezo':
      return { primary: '#8B5CF6', secondary: '#A78BFA', bg: '#1E1530' };
    case 'cool_fluid':
      return { primary: '#38BDF8', secondary: '#0284C7', bg: '#082F49' };
    case 'hot_fluid':
      return { primary: '#EF4444', secondary: '#F87171', bg: '#301215' };
    case 'emerald':
      return { primary: '#10B981', secondary: '#34D399', bg: '#0B291E' };
    case 'steel':
    default:
      return { primary: '#EDEDEB', secondary: '#9E9C94', bg: '#1F1E1C' };
  }
}

export function renderDrawingSpec(spec: DrawingSpec): string {
  const uid = `cad-${Math.random().toString(36).substring(2, 8)}`;
  const width = 860;
  const height = 450;

  // Geometry viewport configuration
  const viewLeft = 110;
  const viewWidth = 460;
  const viewRight = viewLeft + viewWidth;
  const viewTop = 100;
  const viewHeight = 230;
  const viewBottom = viewTop + viewHeight;

  // Layer vertical allocation
  const layers = spec.layers || [];
  const totalThicknessUnits = layers.reduce((sum, l) => sum + (l.thickness > 0 ? l.thickness : 1), 0) || 1;

  let currentY = viewTop;
  const computedLayers = layers.map((layer) => {
    const rawH = (layer.thickness / totalThicknessUnits) * viewHeight;
    const layerH = Math.max(16, rawH);
    const yTop = currentY;
    const yBottom = currentY + layerH;
    currentY = yBottom;
    return {
      ...layer,
      yTop,
      yBottom,
      height: layerH,
      colors: getColorToken(layer.colorScheme),
    };
  });

  // Adjust in case of min-height clamping exceeding viewBottom
  const finalLayerBottom = computedLayers.length > 0 ? computedLayers[computedLayers.length - 1].yBottom : viewBottom;

  return `
<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto bg-[#141413] rounded-xl border border-[#383734]">
  <defs>
    <!-- Technical CAD Minor & Major Grid -->
    <pattern id="cadMinor-${uid}" width="15" height="15" patternUnits="userSpaceOnUse">
      <path d="M 15 0 L 0 0 0 15" fill="none" stroke="#1A1918" stroke-width="0.6"/>
    </pattern>
    <pattern id="cadMajor-${uid}" width="60" height="60" patternUnits="userSpaceOnUse">
      <rect width="60" height="60" fill="url(#cadMinor-${uid})"/>
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#232220" stroke-width="0.9"/>
    </pattern>

    <!-- Metallic 45° ANSI Copper Hatch -->
    <pattern id="hatch-copper-${uid}" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <rect width="8" height="8" fill="#241712"/>
      <line x1="0" y1="0" x2="0" y2="8" stroke="#D97757" stroke-width="1.3" stroke-opacity="0.45"/>
    </pattern>

    <!-- Silicon Monolithic Crystalline Hatch -->
    <pattern id="hatch-silicon-${uid}" width="10" height="10" patternUnits="userSpaceOnUse">
      <rect width="10" height="10" fill="#0C1A24"/>
      <path d="M 0 5 L 10 5 M 5 0 L 5 10" stroke="#0284C7" stroke-width="0.7" stroke-opacity="0.4"/>
    </pattern>

    <!-- Porous Sintered Spherical Powder Matrix -->
    <pattern id="hatch-sintered-${uid}" width="12" height="12" patternUnits="userSpaceOnUse">
      <rect width="12" height="12" fill="#1C1613"/>
      <circle cx="3" cy="3" r="2.2" fill="#B45309" stroke="#F59E0B" stroke-width="0.5" opacity="0.85"/>
      <circle cx="9" cy="3" r="1.8" fill="#92400E" stroke="#D97757" stroke-width="0.5" opacity="0.85"/>
      <circle cx="6" cy="9" r="2.4" fill="#B45309" stroke="#F59E0B" stroke-width="0.5" opacity="0.85"/>
    </pattern>

    <!-- Ferroelectric Sol-Gel PZT Dipole Hatch -->
    <pattern id="hatch-piezo-${uid}" width="14" height="14" patternUnits="userSpaceOnUse">
      <rect width="14" height="14" fill="#191124"/>
      <path d="M 3 7 L 11 7 M 7 3 L 7 11" stroke="#8B5CF6" stroke-width="1.1" stroke-opacity="0.5"/>
      <circle cx="7" cy="7" r="1.5" fill="#C4B5FD"/>
    </pattern>

    <!-- Dimension Arrowhead Markers -->
    <marker id="arr-orange-end-${uid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#D97757"/>
    </marker>
    <marker id="arr-orange-start-${uid}" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 10 1.5 L 1 5 L 10 8.5 z" fill="#D97757"/>
    </marker>
    <marker id="arr-cyan-end-${uid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#38BDF8"/>
    </marker>
    <marker id="arr-cyan-start-${uid}" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 10 1.5 L 1 5 L 10 8.5 z" fill="#38BDF8"/>
    </marker>
    <marker id="arr-white-end-${uid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#EDEDEB"/>
    </marker>
    <marker id="arr-white-start-${uid}" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 10 1.5 L 1 5 L 10 8.5 z" fill="#EDEDEB"/>
    </marker>
    <marker id="arr-emerald-end-${uid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#10B981"/>
    </marker>
    <marker id="arr-emerald-start-${uid}" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 10 1.5 L 1 5 L 10 8.5 z" fill="#10B981"/>
    </marker>
    <marker id="arr-red-end-${uid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#F87171"/>
    </marker>
  </defs>

  <rect width="100%" height="100%" fill="url(#cadMajor-${uid})" />

  <!-- 1. Header Information Strip (Clean, un-stroked text) -->
  <text x="24" y="28" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700" fill="#D97757" letter-spacing="0.05em">
    SECTION // ${escapeXml(spec.title.toUpperCase())}
  </text>
  <text x="816" y="28" text-anchor="end" font-family="'JetBrains Mono', monospace" font-size="9.5" fill="#9E9C94">
    ${escapeXml(spec.nominalThickness ? `${spec.nominalThickness} • ` : '')}${escapeXml(spec.scaleAnnotation || 'SCALE 1:1')}
  </text>
  ${spec.subtitle ? `
  <text x="24" y="44" font-family="'JetBrains Mono', monospace" font-size="8.5" fill="#9E9C94">
    ${escapeXml(spec.subtitle)}
  </text>` : ''}

  <!-- 2. Boundary External Loads (e.g. 1 bar atmospheric crush pressure, inlet pressure) -->
  ${(spec.boundaryLoads || []).map((load) => {
    if (load.side === 'top' && load.direction === 'inward') {
      const step = viewWidth / (load.arrows + 1);
      return `
      <g>
        <text x="${viewLeft + viewWidth / 2}" y="62" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="700" fill="${load.color || '#F87171'}">
          ${escapeXml(load.label)}${load.magnitude ? ` (${escapeXml(load.magnitude)})` : ''}
        </text>
        ${Array.from({ length: load.arrows }).map((_, i) => {
          const arrowX = viewLeft + (i + 1) * step;
          return `<line x1="${arrowX}" y1="68" x2="${arrowX}" y2="${viewTop - 6}" stroke="${load.color || '#F87171'}" stroke-width="1.5" marker-end="url(#arr-red-end-${uid})"/>`;
        }).join('')}
      </g>`;
    }
    if (load.side === 'bottom' && load.direction === 'inward') {
      const step = viewWidth / (load.arrows + 1);
      return `
      <g>
        ${Array.from({ length: load.arrows }).map((_, i) => {
          const arrowX = viewLeft + (i + 1) * step;
          return `<line x1="${arrowX}" y1="${finalLayerBottom + 32}" x2="${arrowX}" y2="${finalLayerBottom + 6}" stroke="${load.color || '#F87171'}" stroke-width="1.5" marker-end="url(#arr-red-end-${uid})"/>`;
        }).join('')}
      </g>`;
    }
    return '';
  }).join('')}

  <!-- 3. Layer Stackup & Internal Features -->
  <g>
    ${computedLayers.map((l) => {
      let fillPattern = l.colors.bg;
      if (l.hatchType === 'copper' || l.hatchType === 'solid_metal') fillPattern = `url(#hatch-copper-${uid})`;
      else if (l.hatchType === 'silicon_substrate') fillPattern = `url(#hatch-silicon-${uid})`;
      else if (l.hatchType === 'porous_sintered') fillPattern = `url(#hatch-sintered-${uid})`;
      else if (l.hatchType === 'piezo_film') fillPattern = `url(#hatch-piezo-${uid})`;
      else if (l.hatchType === 'cavity_vacuum') fillPattern = '#0D141F';
      else if (l.hatchType === 'fluid_channel') fillPattern = '#08253A';

      const layerSvg = `
        <rect x="${viewLeft}" y="${l.yTop}" width="${viewWidth}" height="${l.height}" fill="${fillPattern}" stroke="${l.colors.primary}" stroke-width="1.5"/>
      `;

      // Render Layer Internal Features (Pillars, Dimples, Nozzle Chokes, Channels)
      const featuresSvg = (l.features || []).map((feat) => {
        const featCenterX = viewLeft + (feat.xPercent / 100) * viewWidth;
        const featLeft = featCenterX - feat.widthPx / 2;
        const featH = feat.heightPx || l.height;

        if (feat.type === 'pillar') {
          return `
            <g>
              <rect x="${featLeft}" y="${l.yTop}" width="${feat.widthPx}" height="${featH}" fill="url(#hatch-copper-${uid})" stroke="#F59E0B" stroke-width="1.8"/>
              <line x1="${featCenterX}" y1="${l.yTop - 6}" x2="${featCenterX}" y2="${l.yTop + featH + 6}" stroke="#9E9C94" stroke-width="0.8" stroke-dasharray="4 2"/>
              <line x1="${featLeft}" y1="${l.yTop}" x2="${featLeft + feat.widthPx}" y2="${l.yTop}" stroke="#10B981" stroke-width="2.5"/>
              ${feat.dimLabel ? `
                <text x="${featCenterX}" y="${l.yTop + featH / 2 + 3}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="8.5" font-weight="700" fill="#EDEDEB">
                  ${escapeXml(feat.dimLabel)}
                </text>` : ''}
            </g>`;
        }
        if (feat.type === 'dimple') {
          return `
            <g>
              <path d="M ${featLeft} ${l.yTop} Q ${featCenterX} ${l.yTop + featH} ${featLeft + feat.widthPx} ${l.yTop} Z" fill="url(#hatch-copper-${uid})" stroke="#D97757" stroke-width="1.8"/>
              <line x1="${featCenterX}" y1="${l.yTop - 4}" x2="${featCenterX}" y2="${l.yTop + featH + 4}" stroke="#9E9C94" stroke-width="0.8" stroke-dasharray="4 2"/>
            </g>`;
        }
        if (feat.type === 'nozzle_throat') {
          return `
            <g>
              <path d="M ${featLeft} ${l.yTop} L ${featCenterX - 8} ${l.yTop + featH} L ${featCenterX + 8} ${l.yTop + featH} L ${featLeft + feat.widthPx} ${l.yTop} Z" fill="#031726" stroke="#38BDF8" stroke-width="1.8"/>
              <text x="${featCenterX}" y="${l.yTop + featH / 2 + 2}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="8" fill="#38BDF8">NOZZLE</text>
            </g>`;
        }
        return '';
      }).join('');

      // Render Streamline Flow Vectors
      const flowsSvg = (l.flowVectors || []).map((vec) => {
        const fromX = viewLeft + (vec.fromX / 100) * viewWidth;
        const toX = viewLeft + (vec.toX / 100) * viewWidth;
        const flowY = l.yTop + l.height / 2 + (vec.yOffsetPercent ? (vec.yOffsetPercent / 100) * l.height : 0);
        return `
          <g>
            <line x1="${fromX}" y1="${flowY}" x2="${toX}" y2="${flowY}" stroke="#38BDF8" stroke-width="1.8" stroke-dasharray="6 3" marker-end="url(#arr-cyan-end-${uid})"/>
            ${vec.label ? `
              <text x="${(fromX + toX) / 2}" y="${flowY - 5}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="8.5" font-weight="700" fill="#38BDF8">
                ${escapeXml(vec.label)}
              </text>` : ''}
          </g>`;
      }).join('');

      return `${layerSvg}${featuresSvg}${flowsSvg}`;
    }).join('')}
  </g>

  <!-- 4. Left Total Stackup Dimension Annotation -->
  <g>
    <line x1="${viewLeft - 44}" y1="${viewTop}" x2="${viewLeft - 6}" y2="${viewTop}" stroke="#EDEDEB" stroke-width="0.8" stroke-dasharray="2 2"/>
    <line x1="${viewLeft - 44}" y1="${finalLayerBottom}" x2="${viewLeft - 6}" y2="${finalLayerBottom}" stroke="#EDEDEB" stroke-width="0.8" stroke-dasharray="2 2"/>
    <line x1="${viewLeft - 32}" y1="${viewTop + 4}" x2="${viewLeft - 32}" y2="${finalLayerBottom - 4}" stroke="#EDEDEB" stroke-width="1.4" marker-start="url(#arr-white-start-${uid})" marker-end="url(#arr-white-end-${uid})"/>
    <rect x="12" y="${(viewTop + finalLayerBottom) / 2 - 20}" width="92" height="38" rx="4" fill="#1C1B19" stroke="#EDEDEB" stroke-width="1.2"/>
    <text x="58" y="${(viewTop + finalLayerBottom) / 2 - 4}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="700" fill="#EDEDEB">
      ${escapeXml(spec.nominalThickness || '0.35 mm')}
    </text>
    <text x="58" y="${(viewTop + finalLayerBottom) / 2 + 10}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="7.5" fill="#9E9C94">
      TOTAL ENVELOPE
    </text>
  </g>

  <!-- 5. Right-Hand Layer Witness Brackets & Exact Thickness Callouts -->
  <g>
    ${computedLayers.map((l) => {
      const midY = (l.yTop + l.yBottom) / 2;
      return `
      <g>
        <line x1="${viewRight + 2}" y1="${l.yTop}" x2="${viewRight + 22}" y2="${l.yTop}" stroke="${l.colors.primary}" stroke-width="0.8"/>
        <line x1="${viewRight + 2}" y1="${l.yBottom}" x2="${viewRight + 22}" y2="${l.yBottom}" stroke="${l.colors.primary}" stroke-width="0.8"/>
        <line x1="${viewRight + 14}" y1="${l.yTop + 3}" x2="${viewRight + 14}" y2="${l.yBottom - 3}" stroke="${l.colors.primary}" stroke-width="1.2" marker-start="url(#arr-orange-start-${uid})" marker-end="url(#arr-orange-end-${uid})"/>
        <text x="${viewRight + 26}" y="${midY - 2}" font-family="'JetBrains Mono', monospace" font-size="9" font-weight="700" fill="${l.colors.primary}">
          ${escapeXml(l.name.toUpperCase())}
        </text>
        <text x="${viewRight + 26}" y="${midY + 11}" font-family="'JetBrains Mono', monospace" font-size="8" fill="#EDEDEB">
          ${escapeXml(l.thicknessLabel)}${l.material ? ` • ${escapeXml(l.material.length > 25 ? l.material.slice(0, 23) + '…' : l.material)}` : ''}
        </text>
      </g>`;
    }).join('')}
  </g>

  <!-- 6. Free Callout Boxes & Leader Lines (Non-colliding) -->
  <g>
    ${(spec.callouts || []).map((callout) => {
      const boxX = Math.max(16, Math.min(width - 180, callout.boxX));
      const boxY = Math.max(48, Math.min(height - 56, callout.boxY));
      const strokeCol = callout.color || '#10B981';
      return `
      <g>
        <circle cx="${callout.targetX}" cy="${callout.targetY}" r="3" fill="${strokeCol}"/>
        <path d="M ${callout.targetX} ${callout.targetY} L ${boxX + 10} ${boxY + 14}" stroke="${strokeCol}" stroke-width="1.2" stroke-dasharray="3 2" fill="none"/>
        <rect x="${boxX}" y="${boxY}" width="164" height="42" rx="4" fill="#181816" stroke="${strokeCol}" stroke-width="1.2"/>
        <text x="${boxX + 8}" y="${boxY + 15}" font-family="'JetBrains Mono', monospace" font-size="8.5" font-weight="700" fill="${strokeCol}">
          ${escapeXml(callout.header)}
        </text>
        <text x="${boxX + 8}" y="${boxY + 29}" font-family="'JetBrains Mono', monospace" font-size="8" fill="#EDEDEB">
          ${escapeXml(callout.detail)}
        </text>
      </g>`;
    }).join('')}
  </g>

  <!-- 7. Bottom Engineering Legend Strip -->
  <g transform="translate(24, ${height - 38})">
    <rect x="0" y="0" width="${width - 48}" height="26" rx="4" fill="#1A1918" stroke="#333230" stroke-width="0.9"/>
    ${(() => {
      const legendList = (spec.legendItems && spec.legendItems.length > 0
        ? spec.legendItems
        : [
            { label: 'SECTION CROSS-CUT', color: '#D97757' },
            { label: 'DIFFUSION INTERFACE', color: '#10B981' },
            { label: 'WORKING FLUID / CORE', color: '#38BDF8' },
          ]);
      const step = (width - 64) / Math.max(1, legendList.length);
      return legendList.map((item, idx) => {
        const xOffset = 14 + idx * step;
        return `
          <circle cx="${xOffset}" cy="13" r="3.5" fill="${item.color}"/>
          <text x="${xOffset + 9}" y="16" font-family="'JetBrains Mono', monospace" font-size="8" fill="#EDEDEB">
            ${escapeXml(item.label)}
          </text>`;
      }).join('');
    })()}
  </g>
</svg>
`.trim();
}
