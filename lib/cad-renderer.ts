import type { DrawingSpec, DrawingLayer, LayerFeature, HatchType, ColorScheme } from './cad-spec.ts';

function escapeXml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cleanLayerName(name: string): string {
  const n = (name || '').trim();

  // Concise 1-2 word abstractions for high-scent, uncluttered CAD graphics
  if (/upper|top|lid/i.test(n) && /copper|plate|shell|foil/i.test(n)) {
    return 'TOP COPPER';
  }
  if (/bottom|lower|base/i.test(n) && /copper|plate|shell|foil/i.test(n)) {
    return 'BOTTOM COPPER';
  }
  if (/silicon|die|chip|heat\s*source/i.test(n)) {
    return 'SILICON DIE';
  }
  if (/thermal\s*interface|tim/i.test(n)) {
    return 'TIM';
  }
  if (/spreader|vapor\s*chamber/i.test(n)) {
    return 'VC SPREADER';
  }
  if (/cold\s*plate|heat\s*sink|cooler/i.test(n)) {
    return 'COLD PLATE';
  }
  if (/fine/i.test(n)) {
    return 'FINE WICK';
  }
  if (/coarse|arterial/i.test(n)) {
    return 'COARSE WICK';
  }
  if (/vapor|cavity|core|channel/i.test(n)) {
    return 'VAPOR CORE';
  }
  if (/wick|sintered/i.test(n)) {
    return 'POROUS WICK';
  }

  return n
    .replace(/\s*&\s*Pillar\s*Matrix/i, '')
    .replace(/\s*(?:stamped|sintered|monolithic|hermetic|capillary|arterial)\s*/gi, ' ')
    .replace(/\s*(?:layer|matrix|array|structure|base)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20);
}

function cleanThickness(label: string): string {
  return (label || '').replace(/\s*\([^)]*\)/g, '').trim();
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
    case 'amber':
      return { primary: '#F59E0B', secondary: '#FBBF24', bg: '#2B1D0C' };
    case 'purple':
      return { primary: '#A855F7', secondary: '#C084FC', bg: '#200D2E' };
    case 'steel':
    default:
      return { primary: '#EDEDEB', secondary: '#9E9C94', bg: '#1F1E1C' };
  }
}

export function renderDrawingSpec(spec: DrawingSpec): string {
  const uid = `cad-${Math.random().toString(36).substring(2, 8)}`;
  const width = 860;
  const height = 360;

  // 1. Horizontal Calculations (Equidistant Left & Right Margins)
  const nominalLabel = spec.nominalThickness || '0.35 mm';
  const leftAnnotationSpan = Math.max(70, Math.round(24 + nominalLabel.length * 5.8 + 6));

  const layers = spec.layers || [];
  const maxLabelChars = Math.max(
    14,
    ...layers.map((l) => (cleanLayerName(l.name) + ' • ' + cleanThickness(l.thicknessLabel)).length)
  );
  const rightAnnotationSpan = Math.round(28 + maxLabelChars * 5.4 + 6);

  // Responsive chamber width preserving balance
  const availableChamberWidth = width - leftAnnotationSpan - rightAnnotationSpan;
  const viewWidth = Math.min(480, Math.max(420, availableChamberWidth - 120));

  const totalGraphicWidth = leftAnnotationSpan + viewWidth + rightAnnotationSpan;
  const horizontalMargin = Math.floor((width - totalGraphicWidth) / 2);
  const viewLeft = horizontalMargin + leftAnnotationSpan;
  const viewRight = viewLeft + viewWidth;

  // 2. Vertical Calculations (Equidistant Top & Bottom Margins)
  const hasTopLoad = (spec.boundaryLoads || []).some((b) => b.side === 'top' && b.direction === 'inward');
  const topOverhead = hasTopLoad ? 36 : 0;

  const hasBottomPitch = !!(spec.columns && spec.columns.pitchLabel && spec.columns.xPercents && spec.columns.xPercents.length > 1);
  const hasBottomWidth = !!(spec.columns && spec.columns.widthLabel);
  const bottomOverhead = hasBottomPitch ? 54 : (hasBottomWidth ? 28 : 0);

  // Dynamic chamber height: taller if no bottom dimensions to eliminate empty void
  const viewHeight = bottomOverhead === 0 ? 190 : 176;
  const totalContentHeight = topOverhead + viewHeight + bottomOverhead;
  const verticalMargin = Math.floor((height - totalContentHeight) / 2);
  const viewTop = verticalMargin + topOverhead;
  const viewBottom = viewTop + viewHeight;

  // Layer vertical allocation (Exact sum equals viewHeight)
  const totalThicknessUnits = layers.reduce((sum, l) => sum + (l.thickness > 0 ? l.thickness : 1), 0) || 1;
  const safeMin = Math.min(16, Math.floor(viewHeight / Math.max(1, layers.length)));

  let remainingHeight = viewHeight;
  let currentY = viewTop;

  const computedLayers = layers.map((layer, idx) => {
    const isLast = idx === layers.length - 1;
    let layerH: number;
    if (isLast) {
      layerH = Math.max(safeMin, remainingHeight);
    } else {
      const propH = Math.round((layer.thickness / totalThicknessUnits) * viewHeight);
      layerH = Math.max(safeMin, propH);
      remainingHeight -= layerH;
    }
    const yTop = currentY;
    const yBottom = yTop + layerH;
    currentY = yBottom;
    return {
      ...layer,
      yTop,
      yBottom,
      height: layerH,
      colors: getColorToken(layer.colorScheme),
    };
  });

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

    <!-- Metallic 45° ANSI Copper Hatch - Clean Spacing -->
    <pattern id="hatch-copper-${uid}" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <rect width="12" height="12" fill="#241712"/>
      <line x1="0" y1="0" x2="0" y2="12" stroke="#D97757" stroke-width="1.1" stroke-opacity="0.35"/>
    </pattern>

    <!-- Silicon Monolithic Crystalline Hatch -->
    <pattern id="hatch-silicon-${uid}" width="10" height="10" patternUnits="userSpaceOnUse">
      <rect width="10" height="10" fill="#0C1A24"/>
      <path d="M 0 5 L 10 5 M 5 0 L 5 10" stroke="#0284C7" stroke-width="0.7" stroke-opacity="0.4"/>
    </pattern>

    <!-- Porous Sintered Spherical Powder Matrix - Calm Micro-Pore Texture -->
    <pattern id="hatch-sintered-${uid}" width="16" height="16" patternUnits="userSpaceOnUse">
      <rect width="16" height="16" fill="#1C1613"/>
      <circle cx="4" cy="4" r="1.5" fill="#D97757" opacity="0.45"/>
      <circle cx="12" cy="12" r="1.2" fill="#F59E0B" opacity="0.4"/>
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
    <marker id="arr-amber-end-${uid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#F59E0B"/>
    </marker>
    <marker id="arr-amber-start-${uid}" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 10 1.5 L 1 5 L 10 8.5 z" fill="#F59E0B"/>
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

  <!-- 1. Header Information Strip (Clean title without redundant scale boilerplate) -->
  <text x="24" y="26" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700" fill="#D97757" letter-spacing="0.05em">
    SECTION // ${escapeXml(spec.title.toUpperCase())}
  </text>

  <!-- 2. Boundary External Loads (Single Centered Clean Load Vector) -->
  ${(() => {
    const topLoad = (spec.boundaryLoads || []).find((b) => b.side === 'top' && b.direction === 'inward');
    if (!topLoad) return '';
    const centerX = viewLeft + viewWidth / 2;
    const labelText = topLoad.magnitude ? `${topLoad.magnitude} • ${topLoad.label}` : topLoad.label;
    return `
    <g>
      <text x="${centerX}" y="${viewTop - 20}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="8.5" font-weight="700" fill="${topLoad.color || '#F87171'}">
        ${escapeXml(labelText)}
      </text>
      <line x1="${centerX}" y1="${viewTop - 14}" x2="${centerX}" y2="${viewTop - 4}" stroke="${topLoad.color || '#F87171'}" stroke-width="1.4" marker-end="url(#arr-red-end-${uid})"/>
    </g>`;
  })()}

  <!-- 3. Layer Stackup -->
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
        <rect x="${viewLeft}" y="${l.yTop}" width="${viewWidth}" height="${l.height}" fill="${fillPattern}" stroke="${l.colors.primary}" stroke-width="1.2"/>
      `;

      // Non-column standalone features (e.g. nozzles, dimples) if spec.columns is not handling them
      const featuresSvg = (!spec.columns && l.features ? l.features : []).map((feat) => {
        const featCenterX = viewLeft + (feat.xPercent / 100) * viewWidth;
        const featLeft = featCenterX - feat.widthPx / 2;
        const featH = feat.heightPx || l.height;

        if (feat.type === 'dimple') {
          return `
            <g>
              <path d="M ${featLeft} ${l.yTop} Q ${featCenterX} ${l.yTop + featH} ${featLeft + feat.widthPx} ${l.yTop} Z" fill="url(#hatch-copper-${uid})" stroke="#D97757" stroke-width="1.5"/>
              <line x1="${featCenterX}" y1="${l.yTop - 4}" x2="${featCenterX}" y2="${l.yTop + featH + 4}" stroke="#9E9C94" stroke-width="0.8" stroke-dasharray="4 2"/>
            </g>`;
        }
        if (feat.type === 'nozzle_throat') {
          return `
            <g>
              <path d="M ${featLeft} ${l.yTop} L ${featCenterX - 8} ${l.yTop + featH} L ${featCenterX + 8} ${l.yTop + featH} L ${featLeft + feat.widthPx} ${l.yTop} Z" fill="#031726" stroke="#38BDF8" stroke-width="1.5"/>
            </g>`;
        }
        return '';
      }).join('');

      // Flow vectors (if any, rendered cleanly)
      const flowsSvg = (l.flowVectors || []).map((vec) => {
        const fromX = viewLeft + (vec.fromX / 100) * viewWidth;
        const toX = viewLeft + (vec.toX / 100) * viewWidth;
        const flowY = l.yTop + l.height / 2 + (vec.yOffsetPercent ? (vec.yOffsetPercent / 100) * l.height : 0);
        return `
          <g>
            <line x1="${fromX}" y1="${flowY}" x2="${toX}" y2="${flowY}" stroke="#38BDF8" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#arr-cyan-end-${uid})"/>
            ${vec.label ? `
              <text x="${(fromX + toX) / 2}" y="${flowY - 4}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="8" font-weight="700" fill="#38BDF8">
                ${escapeXml(vec.label)}
              </text>` : ''}
          </g>`;
      }).join('');

      return `${layerSvg}${featuresSvg}${flowsSvg}`;
    }).join('')}
  </g>

  <!-- 4. Monolithic Support Columns (ColumnArray) spanning internal layers -->
  ${(() => {
    if (!spec.columns || !spec.columns.xPercents || spec.columns.xPercents.length === 0) return '';
    const fromLayer = computedLayers.find(l => l.id === spec.columns!.fromLayerId) || computedLayers[1] || computedLayers[0];
    const toLayer = computedLayers.find(l => l.id === spec.columns!.toLayerId) || computedLayers[computedLayers.length - 2] || computedLayers[computedLayers.length - 1];
    const colTop = fromLayer ? fromLayer.yTop : viewTop;
    const colBottom = toLayer ? toLayer.yBottom : finalLayerBottom;
    const colH = colBottom - colTop;
    const widthPx = spec.columns.widthPx || 38;

    return `
    <g>
      ${spec.columns.xPercents.map((xPct) => {
        const colCenterX = viewLeft + (xPct / 100) * viewWidth;
        const colLeft = colCenterX - widthPx / 2;
        return `
        <rect x="${colLeft}" y="${colTop}" width="${widthPx}" height="${colH}" fill="url(#hatch-copper-${uid})" stroke="#D97757" stroke-width="1.5"/>
        <line x1="${colCenterX}" y1="${colTop - 4}" x2="${colCenterX}" y2="${colBottom + 4}" stroke="#9E9C94" stroke-width="0.8" stroke-dasharray="4 2"/>
        <line x1="${colLeft}" y1="${colBottom}" x2="${colLeft + widthPx}" y2="${colBottom}" stroke="#10B981" stroke-width="2.2"/>
        `;
      }).join('')}
    </g>`;
  })()}

  <!-- 5. Left Total Stackup Dimension Annotation -->
  <g>
    <line x1="${viewLeft - 30}" y1="${viewTop}" x2="${viewLeft - 6}" y2="${viewTop}" stroke="#9E9C94" stroke-width="0.8"/>
    <line x1="${viewLeft - 30}" y1="${finalLayerBottom}" x2="${viewLeft - 6}" y2="${finalLayerBottom}" stroke="#9E9C94" stroke-width="0.8"/>
    <line x1="${viewLeft - 18}" y1="${viewTop + 4}" x2="${viewLeft - 18}" y2="${finalLayerBottom - 4}" stroke="#EDEDEB" stroke-width="1.2" marker-start="url(#arr-white-start-${uid})" marker-end="url(#arr-white-end-${uid})"/>
    <text x="${viewLeft - 24}" y="${(viewTop + finalLayerBottom) / 2 + 3.5}" text-anchor="end" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="700" fill="#EDEDEB">
      ${escapeXml(spec.nominalThickness || '0.35 mm')}
    </text>
  </g>

  <!-- 6. Right-Hand Clean Layer Leaders & Compact Metrics -->
  <g>
    ${computedLayers.map((l) => {
      const midY = (l.yTop + l.yBottom) / 2;
      const cleanName = escapeXml(cleanLayerName(l.name).toUpperCase());
      const cleanDim = escapeXml(cleanThickness(l.thicknessLabel));
      return `
      <g>
        <line x1="${viewRight + 4}" y1="${midY}" x2="${viewRight + 22}" y2="${midY}" stroke="${l.colors.primary}" stroke-width="1.2"/>
        <circle cx="${viewRight + 4}" cy="${midY}" r="2" fill="${l.colors.primary}"/>
        <text x="${viewRight + 28}" y="${midY + 3.5}" font-family="'JetBrains Mono', monospace" font-size="9" font-weight="600" fill="#EDEDEB"><tspan fill="${l.colors.primary}" font-weight="700">${cleanName}</tspan><tspan fill="#9E9C94"> • ${cleanDim}</tspan></text>
      </g>`;
    }).join('')}
  </g>

  <!-- 7. Bottom Pillar Metrology Dimensions (Orthogonal & Collision-Free) -->
  ${(() => {
    if (!spec.columns || !spec.columns.xPercents || spec.columns.xPercents.length === 0) return '';
    const widthPx = spec.columns.widthPx || 38;
    const extStartY = finalLayerBottom + 4;
    const dimWidthY = finalLayerBottom + 22;
    const dimPitchY = finalLayerBottom + 48;

    // Use column 0 for width dimension
    const col0CenterX = viewLeft + (spec.columns.xPercents[0] / 100) * viewWidth;
    const col0Left = col0CenterX - widthPx / 2;
    const col0Right = col0CenterX + widthPx / 2;

    // Use column 0 and column 1 for pitch dimension
    const col1CenterX = spec.columns.xPercents.length > 1
      ? viewLeft + (spec.columns.xPercents[1] / 100) * viewWidth
      : 0;

    return `
    <g>
      ${spec.columns.widthLabel ? `
      <!-- Pillar Width Dimension -->
      <line x1="${col0Left}" y1="${extStartY}" x2="${col0Left}" y2="${dimWidthY + 4}" stroke="#9E9C94" stroke-width="0.8" stroke-dasharray="2 2"/>
      <line x1="${col0Right}" y1="${extStartY}" x2="${col0Right}" y2="${dimWidthY + 4}" stroke="#9E9C94" stroke-width="0.8" stroke-dasharray="2 2"/>
      <line x1="${col0Left + 2}" y1="${dimWidthY}" x2="${col0Right - 2}" y2="${dimWidthY}" stroke="#EDEDEB" stroke-width="1.2" marker-start="url(#arr-white-start-${uid})" marker-end="url(#arr-white-end-${uid})"/>
      <text x="${col0CenterX}" y="${dimWidthY - 4}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="8.5" font-weight="700" fill="#EDEDEB" style="paint-order: stroke fill; stroke: #141413; stroke-width: 4px; stroke-linejoin: round;">
        ${escapeXml(spec.columns.widthLabel)}
      </text>
      ` : ''}

      ${spec.columns.pitchLabel && col1CenterX > 0 ? `
      <!-- Pillar Array Pitch Dimension (Stepped cleanly below feature width dimension) -->
      <line x1="${col0CenterX}" y1="${dimWidthY + 8}" x2="${col0CenterX}" y2="${dimPitchY + 4}" stroke="#F59E0B" stroke-width="0.8" stroke-dasharray="2 2"/>
      <line x1="${col1CenterX}" y1="${dimWidthY + 8}" x2="${col1CenterX}" y2="${dimPitchY + 4}" stroke="#F59E0B" stroke-width="0.8" stroke-dasharray="2 2"/>
      <line x1="${col0CenterX + 2}" y1="${dimPitchY}" x2="${col1CenterX - 2}" y2="${dimPitchY}" stroke="#F59E0B" stroke-width="1.2" marker-start="url(#arr-amber-start-${uid})" marker-end="url(#arr-amber-end-${uid})"/>
      <text x="${(col0CenterX + col1CenterX) / 2}" y="${dimPitchY - 4}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="8.5" font-weight="700" fill="#F59E0B" style="paint-order: stroke fill; stroke: #141413; stroke-width: 4px; stroke-linejoin: round;">
        ${escapeXml(spec.columns.pitchLabel)}
      </text>
      ` : ''}
    </g>`;
  })()}
</svg>
`.trim();
}
