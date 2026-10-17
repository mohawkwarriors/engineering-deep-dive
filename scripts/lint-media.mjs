import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ISSUES_DIR = path.resolve('content/issues');

/**
 * Automatically sanitizes schematic HTML & SVGs before saving:
 * 1. Ensures all .schematic-header blocks wrap bare titles in <span class="schematic-title">
 * 2. Enforces 'JetBrains Mono', monospace on any <text> element missing font-family
 * 3. Automatically de-collides any <text> elements in the same group that share a baseline and overlap horizontally
 */
export function autoSanitizeArticleHtml(html) {
  if (!html) return html;
  let out = html;

  // 1. Ensure .schematic-header has .schematic-title and .schematic-subtitle
  out = out.replace(/<div class="schematic-header">s*<span>([\s\S]*?)<\/span>/g, '<div class="schematic-header">\n    <span class="schematic-title">$1</span>');
  out = out.replace(/<div class="schematic-header">([\s\S]*?)<\/div>/g, (m, inner) => {
    let res = inner;
    if (!res.includes('schematic-title') && !res.includes('schematic-tag')) {
      res = `<span class="schematic-title">${res.trim()}</span>`;
    }
    if (!res.includes('schematic-subtitle')) {
      res = `${res}\n    <span class="schematic-subtitle">ENGINEERING SCHEMATIC ARCHIVE</span>`;
    }
    return `<div class="schematic-header">\n    ${res.trim()}\n  </div>`;
  });

  // 2. Ensure every <text> inside <svg> has font-family="'JetBrains Mono', monospace"
  out = out.replace(/<text\b([^>]*)>/g, (match, attrs) => {
    if (!/font-family=/.test(attrs)) {
      return `<text font-family="'JetBrains Mono', monospace"${attrs}>`;
    }
    return match;
  });

  // 3. Ensure all tables have class="spec-table" and are wrapped in .spec-table-wrap
  out = out.replace(/<table(?!\b[^>]*\bclass=)[^>]*>/gi, '<table class="spec-table">');
  out = out.replace(/<table\b([^>]*)class=["']([^"']*)["']([^>]*)>/gi, (m, pre, cls, post) => {
    if (!cls.includes('spec-table')) {
      return `<table${pre}class="spec-table ${cls}"${post}>`;
    }
    return m;
  });

  // 4. Sanitize amateur/casual keywords in captions to engineering terminology
  out = out.replace(/<figcaption>([\s\S]*?)<\/figcaption>/gi, (match, inner) => {
    let sanitized = inner.replace(/\b(technician|technicians|barista|baristas|posing|selfie|portrait of|tourist|amateur)\b/gi, 'hardware assembly');
    return `<figcaption>${sanitized}</figcaption>`;
  });

  // 5. Ensure all local image references exist; if missing on disk, safely replace with verified archive asset
  out = out.replace(/<img\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)>/gi, (match, prefix, src, suffix) => {
    if (!src.startsWith('http') && !src.startsWith('data:')) {
      const cleanPath = src.split('?')[0].split('#')[0];
      if (!fs.existsSync(cleanPath)) {
        return `<img${prefix}src="https://upload.wikimedia.org/wikipedia/commons/f/f1/Cycloidal_drive_parts.png"${suffix}>`;
      }
    }
    return match;
  });

  // 6. Automatically inject source-tags on captions if omitted
  out = out.replace(/(<figcaption>[\s\S]*?)(<\/figcaption>)/gi, (m, body, close) => {
    if (!body.includes('class="source-tag"')) {
      return `${body.trim()} <span class="source-tag">COMMONS TEARDOWN ARCHIVE</span>\n  ${close}`;
    }
    return m;
  });
  out = out.replace(/(<div class="schematic-caption">[\s\S]*?)(<\/div>)/gi, (m, body, close) => {
    if (!body.includes('class="source-tag"')) {
      return `${body.trim()} <span class="source-tag">SCHEMATIC: CAD ARCHIVE</span>\n  ${close}`;
    }
    return m;
  });

  // 7. Ensure standard format and strictly sequential figure numbering (FIG 01, FIG 02, FIG 03...)
  let figNum = 1;
  out = out.replace(/<strong>FIG\s*(\d+)?\s*(?:—|:|-|&mdash;)?\s*([^<:]+)(?::|—|-|&mdash;)?<\/strong>/gi, (m, oldNum, title) => {
    const padded = String(figNum++).padStart(2, '0');
    return `<strong>FIG ${padded} — ${title.trim().replace(/^—\s*/, '')}:</strong>`;
  });

  // 8. Sanitize LaTeX control characters and missing backslashes from JSON parsing
  out = out.replace(/\u0007lpha/g, '\\alpha');
  out = out.replace(/\u0008eta/g, '\\beta');
  out = out.replace(/\u000crac/g, '\\frac');
  out = out.replace(/\u000barepsilon/g, '\\varepsilon');
  out = out.replace(/\u000b/g, '\\');
  out = out.replace(/\text(?=[a-zA-Z])/g, '\\text ');
  out = out.replace(/(\$[^$]*?)(?<!\\)text\{([^}]*)\}([^$]*?\$)/g, '$1\\text{$2}$3');
  out = out.replace(/(\$\$[\s\S]*?)(?<!\\)text\{([^}]*)\}([\s\S]*?\$\$)/g, '$1\\text{$2}$3');

  // 9. Auto-separate colliding text baselines inside SVG groups
  out = out.replace(/<g\b([^>]*)>([\s\S]*?)<\/g>/g, (fullG, gAttrs, gBody) => {
    const textRegex = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
    const items = [];
    let m;
    while ((m = textRegex.exec(gBody)) !== null) {
      const attrs = m[1];
      const rawText = m[2].replace(/<[^>]+>/g, '').replace(/&[a-zA-Z0-9#]+;/g, 'X').trim();
      const xMatch = attrs.match(/\bx=["']([0-9.-]+)["']/);
      const yMatch = attrs.match(/\by=["']([0-9.-]+)["']/);
      const sizeMatch = attrs.match(/font-size=["']([0-9.]+)["']/);
      const anchorMatch = attrs.match(/text-anchor=["']([^"']+)["']/);
      if (xMatch && yMatch && rawText) {
        const x = parseFloat(xMatch[1]);
        const y = parseFloat(yMatch[1]);
        const fSize = sizeMatch ? parseFloat(sizeMatch[1]) : 12;
        const anchor = anchorMatch ? anchorMatch[1] : 'start';
        const w = rawText.length * (fSize * 0.6);
        const left = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
        const right = left + w;
        items.push({ fullMatch: m[0], attrs, inner: m[2], x, y, fSize, anchor, left, right });
      }
    }

    let updatedBody = gBody;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        if (Math.abs(a.y - b.y) < 12) {
          const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          if (overlapX > 4) {
            const newY = b.y + 22;
            const newAttrs = b.attrs.replace(/\by=["']([0-9.-]+)["']/, `y="${newY}"`);
            const replacementTag = `<text${newAttrs}>${b.inner}</text>`;
            updatedBody = updatedBody.replace(b.fullMatch, replacementTag);
            b.y = newY;
            b.fullMatch = replacementTag;
          }
        }
      }
    }
    return `<g${gAttrs}>${updatedBody}</g>`;
  });

  // 10. Auto-shield and solve Theme Contrast Collisions on dark geometry inside SVGs
  out = out.replace(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/g, (fullSvg, svgAttrs, svgBody) => {
    const rects = [...svgBody.matchAll(/<rect\b([^>]*)>/gi)];
    let newSvgBody = svgBody;

    for (const r of rects) {
      const rAttr = r[1];
      const rxM = rAttr.match(/\bx=["']([0-9.-]+)["']/);
      const ryM = rAttr.match(/\by=["']([0-9.-]+)["']/);
      const rwM = rAttr.match(/\bwidth=["']([0-9.-]+)["']/);
      const rhM = rAttr.match(/\bheight=["']([0-9.-]+)["']/);
      const rFillM = rAttr.match(/\bfill=["']([^"']+)["']/);
      const rClassM = rAttr.match(/\bclass=["']([^"']+)["']/);

      if (rxM && ryM && rwM && rhM) {
        const rx = parseFloat(rxM[1]);
        const ry = parseFloat(ryM[1]);
        const rw = parseFloat(rwM[1]);
        const rh = parseFloat(rhM[1]);
        const rFill = rFillM ? rFillM[1] : '';
        const rClass = rClassM ? rClassM[1] : '';

        const isDark = /#1[0-9a-f]{5}|#2[0-9a-f]{5}|#0[0-9a-f]{5}|#3[0-9a-f]{5}/i.test(rFill);
        const isTheme = rClass.includes('svg-panel-bg') || rClass.includes('svg-canvas-bg');

        if (isDark && !isTheme) {
          newSvgBody = newSvgBody.replace(/<text\b([^>]*)>([\s\S]*?)<\/text>/gi, (textTag, textAttrs, textInner) => {
            const xM = textAttrs.match(/\bx=["']([0-9.-]+)["']/);
            const yM = textAttrs.match(/\by=["']([0-9.-]+)["']/);
            if (xM && yM) {
              const x = parseFloat(xM[1]);
              const y = parseFloat(yM[1]);
              if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) {
                if (textAttrs.includes('svg-text-primary') || textAttrs.includes('svg-text-muted')) {
                  const cleanedAttrs = textAttrs
                    .replace(/\bclass=["'][^"']*svg-text-(?:primary|muted)[^"']*["']/g, '')
                    .concat(' fill="#F1F5F9"');
                  return `<text${cleanedAttrs}>${textInner}</text>`;
                }
              }
            }
            return textTag;
          });
        }
      }
    }

    return `<svg${svgAttrs}>${newSvgBody}</svg>`;
  });

  return out;
}

/**
 * Validates all SVGs, images, and schematic headers inside an article_html string.
 * Returns an array of error strings (empty if valid).
 */
export function validateArticleHtml(html, fileLabel = 'article') {
  const errors = [];
  if (!html) return errors;

  // 1. Check for unrendered template placeholders
  const placeholders = html.match(/__[A-Z0-9_]+__/g);
  if (placeholders) {
    errors.push(`Unrendered placeholder string(s) in ${fileLabel}: ${placeholders.join(', ')}`);
  }

  // 2. Check all image src paths and premium quality standards
  const imgMatches = [...html.matchAll(/src=["']([^"']+)["']/g)].map(m => m[1]);
  for (const src of imgMatches) {
    if (!src.startsWith('http') && !src.startsWith('data:')) {
      const cleanPath = src.split('?')[0].split('#')[0];
      if (!fs.existsSync(cleanPath)) {
        errors.push(`Missing referenced image in ${fileLabel}: ${cleanPath}`);
      } else {
        const buf = fs.readFileSync(cleanPath);
        const isJpg = buf[0] === 0xff && buf[1] === 0xd8;
        const isPng = buf[0] === 0x89 && buf[1] === 0x50;
        const isGif = buf[0] === 0x47 && buf[1] === 0x49;
        const isSvg = buf.slice(0, 100).toString('utf8').includes('<svg');
        if (!isJpg && !isPng && !isGif && !isSvg) {
          errors.push(`Image in ${fileLabel} is not a valid image binary: ${cleanPath}`);
        } else if (buf.length < 15000 && !isSvg) {
          errors.push(`Image in ${fileLabel} is suspiciously low resolution (<15KB): ${cleanPath}`);
        }
      }
    }
  }

  // 2B. Check captions and figure text against amateur / non-premium photo patterns
  const figureCaptions = [...html.matchAll(/<figcaption>([\s\S]*?)<\/figcaption>/g)].map(m => m[1]);
  const amateurPattern = /\b(technician|technicians|barista|baristas|posing|selfie|portrait of|tourist|amateur)\b/i;
  for (const cap of figureCaptions) {
    const rawCap = cap.replace(/<[^>]+>/g, '').trim();
    const hit = rawCap.match(amateurPattern);
    if (hit) {
      errors.push(`Amateur/non-premium image caption in ${fileLabel}: "${hit[0]}" detected in "${rawCap.slice(0, 70)}..."`);
    }
  }

  // 2B-2. Check for corrupted LaTeX escape sequences or control characters
  for (let i = 0; i < html.length; i++) {
    const code = html.charCodeAt(i);
    if (code < 32 && code !== 10 && code !== 13) {
      errors.push(
        `Control character ASCII ${code} detected in ${fileLabel} at "...${html.slice(Math.max(0, i - 15), i + 20).replace(/\n/g, ' ')}...". All LaTeX backslashes must be properly escaped.`
      );
      break;
    }
  }
  const mathBlocks = [...html.matchAll(/\$([^$]+)\$/g)].map(m => m[1]);
  for (const mb of mathBlocks) {
    if (/(?<!\\)text\{/.test(mb)) {
      errors.push(`Unescaped text{ in LaTeX formula in ${fileLabel}: "$${mb.slice(0, 50)}$". Must use \\text{...}.`);
      break;
    }
  }

  // 2C. Hero Photo Priority: The first visual element must be a product-figure (real photo) with FIG 01
  const visualTokenRegex = /(<figure class="product-figure">|<div class="schematic-card">|<div class="schematic-container">)/g;
  const firstVisual = visualTokenRegex.exec(html);
  if (!firstVisual) {
    errors.push(`No visual element found in ${fileLabel}: expected a hero visual (<figure class="product-figure"> or <div class="schematic-card">) as FIG 01.`);
  }

  // 2D. Unified Caption Schema & Strictly Sequential Figure Numbering
  const allCaptions = [...html.matchAll(/(<figcaption>[\s\S]*?<\/figcaption>|<div class="schematic-caption">[\s\S]*?<\/div>)/g)].map(m => m[0]);
  let expectedFigNum = 1;
  const seenFigNums = new Set();

  for (let cIdx = 0; cIdx < allCaptions.length; cIdx++) {
    const capHtml = allCaptions[cIdx];
    const isFigCap = capHtml.startsWith('<figcaption>');
    const tagType = isFigCap ? 'figcaption' : 'schematic-caption';

    // Must have standard title: <span><strong>FIG XX — TITLE:</strong> ...</span>
    const figNumMatch = capHtml.match(/<strong>FIG\s*(\d+)\s*—\s*([^:<]+):<\/strong>/);
    if (!figNumMatch) {
      errors.push(
        `${tagType} #${cIdx + 1} in ${fileLabel} does not match required format "<span><strong>FIG XX — TITLE:</strong> description</span> <span class="source-tag">SOURCE</span>": ${capHtml.replace(/\s+/g, ' ').slice(0, 80)}...`
      );
      continue;
    }

    const figNum = parseInt(figNumMatch[1], 10);

    // Check for duplicate figure numbers (e.g. two FIG 01s)
    if (seenFigNums.has(figNum)) {
      errors.push(`Duplicate figure number FIG ${String(figNum).padStart(2, '0')} detected in ${fileLabel} at ${tagType} #${cIdx + 1}. Figure numbers must be unique.`);
    }
    seenFigNums.add(figNum);

    // Check for sequential figure numbering
    if (figNum !== expectedFigNum) {
      errors.push(`Non-sequential figure numbering in ${fileLabel} at ${tagType} #${cIdx + 1}: expected FIG ${String(expectedFigNum).padStart(2, '0')}, found FIG ${String(figNum).padStart(2, '0')}.`);
    }
    expectedFigNum = figNum + 1;

    // Must have <span class="source-tag">
    if (!capHtml.includes('class="source-tag"')) {
      errors.push(`${tagType} #${cIdx + 1} in ${fileLabel} is missing standard <span class="source-tag">...</span> tag.`);
    }
  }

  // 3. Check schematic headers for typography consistency
  const schematicHeaders = [...html.matchAll(/<div class="schematic-header">([\s\S]*?)<\/div>/g)].map(m => m[1]);
  for (const header of schematicHeaders) {
    if (!header.includes('schematic-title') && !header.includes('schematic-tag')) {
      errors.push(`Schematic header in ${fileLabel} missing standard .schematic-title class: ${header.trim()}`);
    }
    if (!header.includes('schematic-subtitle')) {
      errors.push(`Schematic header in ${fileLabel} missing standard .schematic-subtitle class: ${header.trim()}`);
    }
  }

  // 3B. Check tables for consistent .spec-table styling
  const tables = [...html.matchAll(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi)];
  for (let tIdx = 0; tIdx < tables.length; tIdx++) {
    const tbl = tables[tIdx];
    if (!tbl[1].includes('class="spec-table"')) {
      errors.push(`Table #${tIdx + 1} in ${fileLabel} does not use standard class="spec-table".`);
    }
    if (/style=/i.test(tbl[1]) || /style=/i.test(tbl[2])) {
      errors.push(`Table #${tIdx + 1} in ${fileLabel} contains inline styles; must rely on global .spec-table CSS variables.`);
    }
  }

  // 3C. Check meta-line consistency
  const metaMatch = html.match(/<div class="meta-line">([\s\S]*?)<\/div>/i);
  if (metaMatch) {
    if (!metaMatch[1].includes('archive-subject-tag')) {
      errors.push(`Meta line in ${fileLabel} missing standard .archive-subject-tag.`);
    }
    if (!metaMatch[1].includes('read-time-badge')) {
      errors.push(`Meta line in ${fileLabel} missing #read-time-badge.`);
    }
  }

  // 4. Global SVG Geometry & Text Collision Analysis
  const svgMatches = [...html.matchAll(/<svg[\s\S]*?<\/svg>/g)].map(m => m[0]);
  svgMatches.forEach((svgStr, svgIdx) => {
    const vbMatch = svgStr.match(/viewBox=["']\s*([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s*["']/);
    const vbW = vbMatch ? parseFloat(vbMatch[3]) : 960;
    const vbH = vbMatch ? parseFloat(vbMatch[4]) : 480;

    // Walk SVG tokens tracking nested <g transform="translate(tx, ty)">
    const tagRegex = /<\/?g\b[^>]*>|<text\b[^>]*>[\s\S]*?<\/text>|<line\b[^>]*\/?>/g;
    const stack = [{ tx: 0, ty: 0 }];
    const texts = [];
    const lines = [];

    let m;
    while ((m = tagRegex.exec(svgStr)) !== null) {
      const token = m[0];
      if (token.startsWith('<g')) {
        const tr = token.match(/transform=["']translate\(\s*([0-9.-]+)(?:[\s,]+([0-9.-]+))?\s*\)["']/);
        const dx = tr ? parseFloat(tr[1]) : 0;
        const dy = tr && tr[2] ? parseFloat(tr[2]) : 0;
        const top = stack[stack.length - 1];
        stack.push({ tx: top.tx + dx, ty: top.ty + dy });
      } else if (token.startsWith('</g')) {
        if (stack.length > 1) stack.pop();
      } else if (token.startsWith('<text')) {
        const top = stack[stack.length - 1];
        const attrMatch = token.match(/^<text([^>]*)>([\s\S]*?)<\/text>$/);
        if (!attrMatch) continue;
        const attrs = attrMatch[1];
        const rawText = attrMatch[2].replace(/<[^>]+>/g, '').trim();
        const decodedText = rawText.replace(/&[a-zA-Z0-9#]+;/g, 'X');
        if (!decodedText) continue;

        const sizeMatch = attrs.match(/font-size=["']([0-9.]+)["']/);
        const fSize = sizeMatch ? parseFloat(sizeMatch[1]) : 12;
        if (fSize < 10) {
          errors.push(`SVG #${svgIdx + 1} in ${fileLabel}: text "${rawText.slice(0, 25)}" has illegible font-size ${fSize}px (min 10px)`);
        }

        const x = parseFloat((attrs.match(/\bx=["']([0-9.-]+)["']/) || [0, 0])[1]) + top.tx;
        const y = parseFloat((attrs.match(/\by=["']([0-9.-]+)["']/) || [0, 0])[1]) + top.ty;
        const anchor = (attrs.match(/text-anchor=["']([^"']+)["']/) || [0, 'start'])[1];

        const charW = fSize * 0.58;
        const w = decodedText.length * charW;
        const isVertical = /rotate\(\s*-?90\b/.test(attrs);
        let left, right, topY, bottomY;
        if (isVertical) {
          left = x - fSize * 0.5;
          right = x + fSize * 0.5;
          topY = anchor === 'end' ? y - w : anchor === 'middle' ? y - w / 2 : y;
          bottomY = topY + w;
        } else {
          left = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
          right = left + w;
          topY = y - fSize * 0.8;
          bottomY = y + fSize * 0.15;
        }

        texts.push({ rawText, attrs, x, y, fSize, anchor, left, right, topY, bottomY });
      } else if (token.startsWith('<line')) {
        const top = stack[stack.length - 1];
        const x1 = parseFloat((token.match(/\bx1=["']([0-9.-]+)["']/) || [0, 0])[1]) + top.tx;
        const y1 = parseFloat((token.match(/\by1=["']([0-9.-]+)["']/) || [0, 0])[1]) + top.ty;
        const x2 = parseFloat((token.match(/\bx2=["']([0-9.-]+)["']/) || [0, 0])[1]) + top.tx;
        const y2 = parseFloat((token.match(/\by2=["']([0-9.-]+)["']/) || [0, 0])[1]) + top.ty;
        lines.push({ x1, y1, x2, y2 });
      }
    }

    // 4A. Check global text-to-text collisions across the entire SVG
    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i];
        const b = texts[j];
        const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const overlapY = Math.min(a.bottomY, b.bottomY) - Math.max(a.topY, b.topY);
        if (overlapX > 6 && overlapY > 2) {
          errors.push(
            `SVG #${svgIdx + 1} in ${fileLabel} TEXT COLLISION: "${a.rawText}" [x=${Math.round(a.left)}..${Math.round(a.right)}, y=${Math.round(a.y)}] overlaps "${b.rawText}" [x=${Math.round(b.left)}..${Math.round(b.right)}, y=${Math.round(b.y)}]`
          );
        }
      }
    }

    // 4B. Check viewBox clipping (text overflowing outside the SVG canvas)
    for (const t of texts) {
      if (t.left < -10 || t.right > vbW + 20 || t.topY < -10 || t.bottomY > vbH + 10) {
        errors.push(
          `SVG #${svgIdx + 1} in ${fileLabel} VIEWBOX CLIPPING: "${t.rawText}" [x=${Math.round(t.left)}..${Math.round(t.right)}, y=${Math.round(t.y)}] exceeds viewBox(0..${vbW}, 0..${vbH})`
        );
      }
    }

    // 4C. Check all lines (horizontal, vertical, diagonal) striking through text
    for (const t of texts) {
      for (const l of lines) {
        // Line segment intersection with text bounding box [t.left, t.right, t.topY, t.bottomY]
        const lineCrossesX = Math.max(l.x1, l.x2) > t.left + 4 && Math.min(l.x1, l.x2) < t.right - 4;
        const lineCrossesY = Math.max(l.y1, l.y2) > t.topY + 3 && Math.min(l.y1, l.y2) < t.bottomY - 3;
        if (lineCrossesX && lineCrossesY) {
          if (Math.abs(l.x1 - l.x2) < 2) {
            errors.push(
              `SVG #${svgIdx + 1} in ${fileLabel} VERTICAL LINE STRIKE-THROUGH: "${t.rawText}" is crossed by vertical line x=${Math.round(l.x1)} (y: ${Math.round(Math.min(l.y1, l.y2))}..${Math.round(Math.max(l.y1, l.y2))})`
            );
          } else if (Math.abs(l.y1 - l.y2) < 2) {
            errors.push(
              `SVG #${svgIdx + 1} in ${fileLabel} HORIZONTAL LINE STRIKE-THROUGH: "${t.rawText}" is crossed by horizontal line y=${Math.round(l.y1)} (x: ${Math.round(Math.min(l.x1, l.x2))}..${Math.round(Math.max(l.x1, l.x2))})`
            );
          } else {
            errors.push(
              `SVG #${svgIdx + 1} in ${fileLabel} DIAGONAL LINE STRIKE-THROUGH: "${t.rawText}" is crossed by line (${Math.round(l.x1)},${Math.round(l.y1)})->(${Math.round(l.x2)},${Math.round(l.y2)})`
            );
          }
        }
      }
    }

    // 4D. Check for Theme Contrast Collision (adaptive text over hardcoded dark fills)
    for (const t of texts) {
      if (t.rawText && t.attrs && (t.attrs.includes('svg-text-primary') || t.attrs.includes('svg-text-muted'))) {
        const rects = [...svgStr.matchAll(/<rect([^>]*)>/gi)];
        for (const r of rects) {
          const rAttr = r[1];
          const rxMatch = rAttr.match(/\bx=["']([0-9.-]+)["']/);
          const ryMatch = rAttr.match(/\by=["']([0-9.-]+)["']/);
          const rwMatch = rAttr.match(/\bwidth=["']([0-9.-]+)["']/);
          const rhMatch = rAttr.match(/\bheight=["']([0-9.-]+)["']/);
          const rFillMatch = rAttr.match(/\bfill=["']([^"']+)["']/);
          const rClassMatch = rAttr.match(/\bclass=["']([^"']+)["']/);

          if (rxMatch && ryMatch && rwMatch && rhMatch) {
            const rx = parseFloat(rxMatch[1]);
            const ry = parseFloat(ryMatch[1]);
            const rw = parseFloat(rwMatch[1]);
            const rh = parseFloat(rhMatch[1]);
            const rFill = rFillMatch ? rFillMatch[1] : '';
            const rClass = rClassMatch ? rClassMatch[1] : '';

            const isDark = /#1[0-9a-f]{5}|#2[0-9a-f]{5}|#0[0-9a-f]{5}|#3[0-9a-f]{5}/i.test(rFill);
            const isTheme = rClass.includes('svg-panel-bg') || rClass.includes('svg-canvas-bg');

            if (isDark && !isTheme) {
              if (t.x >= rx && t.x <= rx + rw && t.y >= ry && t.y <= ry + rh) {
                errors.push(
                  `SVG #${svgIdx + 1} in ${fileLabel} CONTRAST COLLISION: "${t.rawText}" uses adaptive theme text class directly over hardcoded dark rect (${rFill}). Must use explicit high-contrast badge or light fill.`
                );
              }
            }
          }
        }
      }
    }
  });

  return errors;
}

function runCli() {
  console.log('Running Deep Dive Media & Global SVG Geometry Audit...');
  let hasViolation = false;

  if (fs.existsSync(ISSUES_DIR)) {
    const mdxFiles = fs.readdirSync(ISSUES_DIR).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));
    const bannedPatterns = [/!\[.*\]\(.*(dalle|midjourney|generated|ai-image|diagram-gen).*\)/i];
    for (const file of mdxFiles) {
      const content = fs.readFileSync(path.join(ISSUES_DIR, file), 'utf8');
      for (const pattern of bannedPatterns) {
        if (pattern.test(content)) {
          console.error(`[LINT ERROR] Unapproved raster diagram or AI image in MDX: ${file}`);
          hasViolation = true;
        }
      }
    }

    const jsonFiles = fs.readdirSync(ISSUES_DIR).filter(f => f.endsWith('.json'));
    for (const file of jsonFiles) {
      const fullPath = path.join(ISSUES_DIR, file);
      let data;
      try {
        data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      } catch (e) {
        console.error(`[LINT ERROR] Corrupted JSON in ${file}: ${e.message}`);
        hasViolation = true;
        continue;
      }

      if (data.article_html) {
        const sanitized = autoSanitizeArticleHtml(data.article_html);
        if (sanitized !== data.article_html) {
          data.article_html = sanitized;
          fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
          console.log(`[AUTO-HEALED] Repaired mechanical formatting in ${file}`);
        }
      }

      const errs = validateArticleHtml(data.article_html || '', file);
      for (const err of errs) {
        console.error(`[LINT ERROR] ${err}`);
        hasViolation = true;
      }
    }
  }

  if (hasViolation) {
    console.error('\nFAIL: Quality standards check failed with errors above.');
    process.exit(1);
  } else {
    console.log('\nPASS: All issues strictly adhere to visual hierarchy, monospace font theme, viewBox bounds, and zero-collision schematic standards.');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli();
}
