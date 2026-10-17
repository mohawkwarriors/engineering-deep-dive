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

  // 1. Ensure .schematic-header has .schematic-title
  out = out.replace(/<div class="schematic-header">\s*<span>([\s\S]*?)<\/span>/g, '<div class="schematic-header">\n    <span class="schematic-title">$1</span>');

  // 2. Ensure every <text> inside <svg> has font-family="'JetBrains Mono', monospace"
  out = out.replace(/<text\b([^>]*)>/g, (match, attrs) => {
    if (!/font-family=/.test(attrs)) {
      return `<text font-family="'JetBrains Mono', monospace"${attrs}>`;
    }
    return match;
  });

  // 3. Auto-separate colliding text baselines inside SVG groups
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
            // Shift item b down by 22px to a dedicated non-overlapping baseline
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

  // 3. Check schematic headers for typography consistency
  const schematicHeaders = [...html.matchAll(/<div class="schematic-header">([\s\S]*?)<\/div>/g)].map(m => m[1]);
  for (const header of schematicHeaders) {
    if (!header.includes('schematic-title') && !header.includes('schematic-tag')) {
      errors.push(`Schematic header in ${fileLabel} missing standard .schematic-title class: ${header.trim()}`);
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

        texts.push({ rawText, x, y, fSize, anchor, left, right, topY, bottomY });
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

    // 4C. Check horizontal lines striking directly through text
    for (const t of texts) {
      for (const l of lines) {
        if (Math.abs(l.y1 - l.y2) < 1) {
          const ly = l.y1;
          const lxMin = Math.min(l.x1, l.x2);
          const lxMax = Math.max(l.x1, l.x2);
          if (ly > t.topY + 2 && ly < t.bottomY - 2) {
            const ox = Math.min(t.right, lxMax) - Math.max(t.left, lxMin);
            if (ox > 12) {
              errors.push(
                `SVG #${svgIdx + 1} in ${fileLabel} LINE STRIKE-THROUGH: "${t.rawText}" is crossed by horizontal line y=${ly} (${lxMin}..${lxMax})`
              );
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
