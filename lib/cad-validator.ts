export interface CadValidationError {
  code: string;
  message: string;
  element?: string;
}

export interface CadValidationResult {
  valid: boolean;
  errors: CadValidationError[];
  warnings: string[];
  metrics: {
    viewBoxWidth: number;
    viewBoxHeight: number;
    textCount: number;
    rectCount: number;
    lineCount: number;
    hasLegend: boolean;
    hasTitle: boolean;
  };
}

/**
 * Automated Visual Quality Gate for CAD vector schematics.
 * Strictly verifies geometry bounds, text collision, typography integrity,
 * absence of stroke-bleed bugs, and elimination of fake titleblocks.
 */
export function validateDrawingSvg(svg: string, label: string = 'CAD Drawing'): CadValidationResult {
  const errors: CadValidationError[] = [];
  const warnings: string[] = [];

  if (!svg || typeof svg !== 'string' || !svg.trim()) {
    return {
      valid: false,
      errors: [{ code: 'EMPTY_SVG', message: `${label}: SVG payload is empty or not a string` }],
      warnings: [],
      metrics: {
        viewBoxWidth: 0,
        viewBoxHeight: 0,
        textCount: 0,
        rectCount: 0,
        lineCount: 0,
        hasLegend: false,
        hasTitle: false,
      },
    };
  }

  // 1. Root <svg> and viewBox verification
  const svgMatch = svg.match(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/i);
  if (!svgMatch) {
    errors.push({
      code: 'MALFORMED_SVG_ROOT',
      message: `${label}: Missing root <svg> open or closing </svg> tag`,
    });
    return {
      valid: false,
      errors,
      warnings,
      metrics: {
        viewBoxWidth: 0,
        viewBoxHeight: 0,
        textCount: 0,
        rectCount: 0,
        lineCount: 0,
        hasLegend: false,
        hasTitle: false,
      },
    };
  }

  const svgAttrs = svgMatch[1];
  const vbMatch = svgAttrs.match(/viewBox=["']\s*([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s*["']/i);
  if (!vbMatch) {
    errors.push({
      code: 'MISSING_VIEWBOX',
      message: `${label}: <svg> is missing a standard viewBox attribute`,
    });
  }

  const vbMinX = vbMatch ? parseFloat(vbMatch[1]) : 0;
  const vbMinY = vbMatch ? parseFloat(vbMatch[2]) : 0;
  const vbW = vbMatch ? parseFloat(vbMatch[3]) : 840;
  const vbH = vbMatch ? parseFloat(vbMatch[4]) : 450;

  if (vbW < 500 || vbH < 250) {
    errors.push({
      code: 'VIEWBOX_TOO_SMALL',
      message: `${label}: viewBox dimension (${vbW}x${vbH}) is smaller than minimum required resolution (500x250)`,
    });
  }

  // 2. Blacklisted artifacts & fake titleblock elimination
  const bannedKeywords = [
    { pattern: /THE\s+HW\s+INSIDER\s+CAD\s+METROLOGY/i, code: 'BANNED_FAKE_TITLEBLOCK', msg: 'Fake metrology box ("THE HW INSIDER CAD METROLOGY")' },
    { pattern: /\bDWG\s+NO\b/i, code: 'BANNED_DWG_NO', msg: 'Fake titleblock "DWG NO"' },
    { pattern: /\bISO\s+2768-m\b/i, code: 'BANNED_ISO_TOLERANCE', msg: 'Generic fake tolerance "ISO 2768-m"' },
    { pattern: /AUTOPILOT\s+SCHEMATIC/i, code: 'BANNED_AUTOPILOT_WATERMARK', msg: 'Legacy generic "AUTOPILOT SCHEMATIC" placeholder' },
    { pattern: /__UNDEFINED__|__NULL__|\[object\s+Object\]/i, code: 'UNRENDERED_VARIABLE', msg: 'Unrendered template variable or [object Object]' },
    { pattern: /\bNaN\b/i, code: 'NAN_COORDINATE', msg: 'Corrupted NaN coordinate in SVG attributes' },
    { pattern: /<ellipse\b/i, code: 'BANNED_GENERIC_ELLIPSE', msg: 'Generic placeholder <ellipse> element (unacceptable in CAD metrology)' },
  ];

  for (const banned of bannedKeywords) {
    if (banned.pattern.test(svg)) {
      errors.push({
        code: banned.code,
        message: `${label}: Detected prohibited artifact: ${banned.msg}`,
      });
    }
  }

  // 3. Inherited Stroke on Text Bug (Stroke Bleed)
  // Ensures that no parent <g stroke="..."> contains a <text> element without stroke="none" or stroke-width="0"
  const strokeGroupRegex = /<g\b[^>]*\bstroke=["'](?!none\b)[^"']+["'][^>]*>(?:(?!<\/g>)[\s\S])*?<text\b/gi;
  if (strokeGroupRegex.test(svg)) {
    errors.push({
      code: 'STROKE_BLEED_ON_TEXT',
      message: `${label}: Parent <g> with active stroke wraps a <text> element. Text must be rendered in un-stroked groups to prevent illegible font outlines.`,
    });
  }

  // 4. Token Parsing & Coordinate Bounds Checking
  const tagRegex = /<\/?g\b[^>]*>|<text\b[^>]*>([\s\S]*?)<\/text>|<line\b[^>]*\/?>|<rect\b[^>]*\/?>|<circle\b[^>]*\/?>|<path\b[^>]*\/?>/gi;
  const groupStack: Array<{ tx: number; ty: number }> = [{ tx: 0, ty: 0 }];

  interface ParsedText {
    raw: string;
    decoded: string;
    fSize: number;
    x: number;
    y: number;
    anchor: string;
    left: number;
    right: number;
    topY: number;
    bottomY: number;
  }

  interface ParsedLine {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }

  const texts: ParsedText[] = [];
  const lines: ParsedLine[] = [];
  let rectCount = 0;
  let hasLegend = false;
  let hasTitle = false;

  let tokenMatch: RegExpExecArray | null;
  while ((tokenMatch = tagRegex.exec(svg)) !== null) {
    const token = tokenMatch[0];

    if (token.startsWith('<g') || token.startsWith('<G')) {
      const tr = token.match(/transform=["']translate\(\s*([0-9.-]+)(?:[\s,]+([0-9.-]+))?\s*\)["']/i);
      const dx = tr ? parseFloat(tr[1]) : 0;
      const dy = tr && tr[2] ? parseFloat(tr[2]) : 0;
      const top = groupStack[groupStack.length - 1];
      groupStack.push({ tx: top.tx + dx, ty: top.ty + dy });
    } else if (token.startsWith('</g') || token.startsWith('</G')) {
      if (groupStack.length > 1) groupStack.pop();
    } else if (token.startsWith('<rect') || token.startsWith('<RECT')) {
      rectCount++;
    } else if (token.startsWith('<line') || token.startsWith('<LINE')) {
      const top = groupStack[groupStack.length - 1];
      const x1 = parseFloat((token.match(/\bx1=["']([0-9.-]+)["']/i) || ['', '0'])[1]) + top.tx;
      const y1 = parseFloat((token.match(/\by1=["']([0-9.-]+)["']/i) || ['', '0'])[1]) + top.ty;
      const x2 = parseFloat((token.match(/\bx2=["']([0-9.-]+)["']/i) || ['', '0'])[1]) + top.tx;
      const y2 = parseFloat((token.match(/\by2=["']([0-9.-]+)["']/i) || ['', '0'])[1]) + top.ty;

      if (x1 === x2 && y1 === y2) {
        warnings.push(`${label}: Zero-length <line> detected at (${x1}, ${y1})`);
      } else {
        lines.push({ x1, y1, x2, y2 });
      }
    } else if (token.startsWith('<text') || token.startsWith('<TEXT')) {
      const top = groupStack[groupStack.length - 1];
      const attrMatch = token.match(/^<text\b([^>]*)>([\s\S]*?)<\/text>$/i);
      if (!attrMatch) continue;

      const attrs = attrMatch[1];
      const raw = attrMatch[2].replace(/<[^>]+>/g, '').trim();
      const decoded = raw.replace(/&[a-zA-Z0-9#]+;/g, 'X');
      if (!decoded) continue;

      if (raw.includes('SECTION //') || raw.includes('CROSS-SECTION') || raw.includes('ARCHITECTURE')) {
        hasTitle = true;
      }
      if (raw.includes('COPPER') || raw.includes('WICK') || raw.includes('DIFFUSION') || raw.includes('VACUUM')) {
        hasLegend = true;
      }

      // Check font-family
      if (!attrs.includes('JetBrains Mono') && !svg.includes("font-family=\"'JetBrains Mono', monospace\"")) {
        warnings.push(`${label}: Text "${raw.slice(0, 20)}" missing explicit JetBrains Mono font-family.`);
      }

      const sizeMatch = attrs.match(/font-size=["']([0-9.]+)["']/i);
      const fSize = sizeMatch ? parseFloat(sizeMatch[1]) : 10;
      if (fSize < 7.5) {
        errors.push({
          code: 'ILLEGIBLE_FONT_SIZE',
          message: `${label}: Text "${raw.slice(0, 30)}" font-size ${fSize}px is below legible threshold (7.5px)`,
          element: token,
        });
      }

      const x = parseFloat((attrs.match(/\bx=["']([0-9.-]+)["']/i) || ['', '0'])[1]) + top.tx;
      const y = parseFloat((attrs.match(/\by=["']([0-9.-]+)["']/i) || ['', '0'])[1]) + top.ty;
      const anchor = (attrs.match(/text-anchor=["']([^"']+)["']/i) || ['', 'start'])[1];

      const charW = fSize * 0.58;
      const textWidth = decoded.length * charW;
      const left = anchor === 'end' ? x - textWidth : anchor === 'middle' ? x - textWidth / 2 : x;
      const right = left + textWidth;
      const topY = y - fSize * 0.8;
      const bottomY = y + fSize * 0.2;

      // Check viewBox clipping
      if (left < vbMinX - 8 || right > vbW + 8 || topY < vbMinY - 8 || bottomY > vbH + 8) {
        errors.push({
          code: 'VIEWBOX_CLIPPING',
          message: `${label}: Text "${raw.slice(0, 30)}" [x=${Math.round(left)}..${Math.round(right)}, y=${Math.round(y)}] exceeds viewBox bounds (${vbW}x${vbH})`,
          element: token,
        });
      }

      texts.push({
        raw,
        decoded,
        fSize,
        x,
        y,
        anchor,
        left,
        right,
        topY,
        bottomY,
      });
    }
  }

  // 5. Check text-to-text collisions
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i];
      const b = texts[j];

      // Only check collision if both texts are non-empty
      const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const overlapY = Math.min(a.bottomY, b.bottomY) - Math.max(a.topY, b.topY);

      if (overlapX > 8 && overlapY > 2) {
        // Exclude intentional shadows or identical overlapping keys
        if (Math.abs(a.x - b.x) > 2 || Math.abs(a.y - b.y) > 2) {
          errors.push({
            code: 'TEXT_COLLISION',
            message: `${label}: Text collision between "${a.raw.slice(0, 25)}" [y=${Math.round(a.y)}] and "${b.raw.slice(0, 25)}" [y=${Math.round(b.y)}] (overlap: ${Math.round(overlapX)}px)`,
          });
        }
      }
    }
  }

  // 6. Minimum technical metrics
  if (texts.length < 3) {
    errors.push({
      code: 'INSUFFICIENT_LABELS',
      message: `${label}: SVG contains only ${texts.length} text annotations (minimum 3 required for CAD metrology)`,
    });
  }

  if (rectCount < 2) {
    errors.push({
      code: 'INSUFFICIENT_GEOMETRY',
      message: `${label}: SVG contains only ${rectCount} structural elements (minimum 2 layers required)`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metrics: {
      viewBoxWidth: vbW,
      viewBoxHeight: vbH,
      textCount: texts.length,
      rectCount,
      lineCount: lines.length,
      hasLegend,
      hasTitle,
    },
  };
}
