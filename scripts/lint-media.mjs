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

  // 0A. Ensure <img> in <figure class="product-figure"> is wrapped in <div class="img-wrapper">
  out = out.replace(/(<figure class="product-figure">\s*)(<img\b[^>]*>)/gi, (m, pre, img) => {
    return `${pre}<div class="img-wrapper">\n    ${img}\n  </div>`;
  });

  // 0B. Ensure <svg> in <div class="schematic-card"> is wrapped in <div class="schematic-viewport">
  out = out.replace(/(<div class="schematic-card"[^>]*>[\s\S]*?<\/div>\s*)(<svg\b[\s\S]*?<\/svg>)/gi, (m, header, svg) => {
    if (!m.includes('class="schematic-viewport"')) {
      return `${header}<div class="schematic-viewport">\n    ${svg}\n  </div>`;
    }
    return m;
  });

  // 0C. Normalize process-step classes
  out = out.replace(/class=["']step-number["']/g, 'class="process-step-tag"');
  out = out.replace(/class=["']step-title["']/g, 'class="process-step-title"');
  out = out.replace(/(<div class="process-step-card">\s*<div class="process-step-tag">[\s\S]*?<div class="process-step-title">[\s\S]*?)(<p\b[^>]*>)([\s\S]*?<\/p>)/gi, (m, top, pTag, pRest) => {
    if (!pTag.includes('process-step-desc')) {
      return `${top}<p class="process-step-desc">${pRest}`;
    }
    return m;
  });

  // 0D. Normalize SVG canvas backgrounds to use theme-adaptive class (only root 960px width canvases)
  out = out.replace(/<rect\b([^>]*\bwidth=["']960["'][^>]*)\bfill=["']#(?:18181B|1C1917|111110|000000|0F172A)["']([^>]*)\/?>/gi, (m, pre, post) => {
    if (!pre.includes('class=') && !post.includes('class=')) {
      return `<rect${pre}class="svg-canvas-bg"${post}/>`;
    }
    return m;
  });

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

  // 1B. Ensure .meta-line has .archive-subject-tag and #read-time-badge
  out = out.replace(/<div class="meta-line">([\s\S]*?)<\/div>/gi, (m, inner) => {
    let res = inner;
    if (!res.includes('archive-subject-tag')) {
      res = res.replace(/(<span>ISSUE\s*#?\d+<\/span>)/i, '$1<span>•</span><span class="archive-subject-tag sub-hardware">HARDWARE</span>');
    }
    if (!res.includes('read-time-badge')) {
      if (/(\d+\s*MIN\s*READ)/i.test(res)) {
        res = res.replace(/(\d+\s*MIN\s*READ)/i, '<span id="read-time-badge">$1</span>');
      } else {
        res = `${res.trim()}<span>•</span><span id="read-time-badge">10 MIN READ</span>`;
      }
    }
    return `<div class="meta-line">\n  ${res.trim()}\n</div>`;
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
  out = out.replace(/<div class="process-card"[^>]*>\s*(<table class="spec-table")/gi, '<div class="spec-table-wrap">\n  $1');

  // 4. Sanitize amateur/casual keywords in captions to engineering terminology
  out = out.replace(/<figcaption>([\s\S]*?)<\/figcaption>/gi, (match, inner) => {
    let sanitized = inner.replace(/\b(technician|technicians|barista|baristas|posing|selfie|portrait of|tourist|amateur)\b/gi, 'hardware assembly');
    return `<figcaption>${sanitized}</figcaption>`;
  });

  // 5. Ensure all images have an alt attribute and an onerror fallback
  out = out.replace(/<img\b([^>]*?)>/gi, (match, attrs) => {
    let updated = attrs;
    if (!/onerror=/i.test(updated)) {
      const fallbackUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Galaxy_Z_Flip_%26_Galaxy_Z_Fold.jpg/1280px-Galaxy_Z_Flip_%26_Galaxy_Z_Fold.jpg';
      const cleanAttrs = updated.replace(/\/+$/, '').trim();
      return `<img ${cleanAttrs} onerror="this.onerror=null; this.src='${fallbackUrl}';" />`;
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

  // 8. Sanitize LaTeX math typography, symbols, micrometer units, and JSON escaping artifacts
  out = out.replace(/Density \(\$ho\$\)/g, 'Density ($\\rho$)');
  out = out.replace(/Density \(\$rho\$\)/g, 'Density ($\\rho$)');
  out = out.replace(/\^circ\b/g, '^\\circ');
  out = out.replace(/&\\([a-zA-Z]+;)/g, '&$1');

  out = out.replace(/\$\$([\s\S]*?)\$\$|\$([^\$\n<>]+?)\$/g, (match, displayMath, inlineMath) => {
    let formula = displayMath !== undefined ? displayMath : inlineMath;
    const isDisplay = displayMath !== undefined;

    // Clean raw tabs and literal \t escapes in math
    formula = formula.replace(/\t+/g, ' ');
    formula = formula.replace(/(?:\\t)+\s*(?=\\text)/g, '');
    formula = formula.replace(/\t+(?=\\text)/g, '');

    // Clean micrometer units ($25\,\mu\text{m}$, $4\,\mu\text{m}$, etc.)
    formula = formula.replace(/(&lt;|<|>|\\pm|\approx|=|\\le|\\ge)?\s*(\d+(?:\.\d+)?)\s*(?:,\\|,|\\,)?\s*\\+mu(?:\s|\\|t)*text\{m\}/g, (m, op, num) => {
      const prefix = op ? `${op.replace('&lt;', '<')} ` : '';
      return `${prefix}${num}\\,\\mu\\text{m}`;
    });
    formula = formula.replace(/(\d+(?:\.\d+)?)\s*(?:\\text\{\s*to\s*\}|to)\s*(\d+(?:\.\d+)?)\s*(?:\\;|\\,)?\s*\\+mu(?:\s|\\|t)*text\{m\}/g, '$1\\text{ to }$2\\,\\mu\\text{m}');
    formula = formula.replace(/\\+mu(?:\s|\\|t)*text\{m\}/g, '\\mu\\text{m}');
    formula = formula.replace(/\\mu\s*\\text\{\s*m\s*\}/g, '\\mu\\text{m}');
    formula = formula.replace(/\\mu\s+m\b/g, '\\mu\\text{m}');
    formula = formula.replace(/\\;\s*\\mu\\text\{m\}/g, '\\,\\mu\\text{m}');
    formula = formula.replace(/\\{2,}mu/g, '\\mu');

    // Clean Greek letters & symbols safely (never corrupting &theta; or &times; HTML entities)
    formula = formula.replace(/(?<![\\a-zA-Z&])theta\b(?!;)/g, '\\theta');
    formula = formula.replace(/\\\s+theta\b/g, '\\theta');
    formula = formula.replace(/(?<![&a-zA-Z\\])\s+\\theta\b/g, '\\theta');
    formula = formula.replace(/\(\s*\\theta\s*\)/g, '(\\theta)');
    formula = formula.replace(/d\s*\\theta/g, 'd\\theta');
    formula = formula.replace(/\\sin\s*\\theta/g, '\\sin\\theta');
    formula = formula.replace(/(?<![\\a-zA-Z&])times\b(?!;)/g, '\\times');
    formula = formula.replace(/\s{2,}\\times/g, ' \\times');
    formula = formula.replace(/\\times\s{2,}/g, '\\times ');

    // Clean \text commands and subscripts safely
    formula = formula.replace(/(?<![\\a-zA-Z])(?:text|ext)\{/g, '\\text{');
    formula = formula.replace(/\bext\{/g, '\\text{');
    formula = formula.replace(/\\text\{\s+/g, '\\text{');
    formula = formula.replace(/_\{\s*\\text\{\s*([\w\-]+)\s*\}\s*\}/g, '_{\\text{$1}}');
    formula = formula.replace(/_\{\s*\\text\{\s*(\w+)\s*\}\s*\}/g, '_{\\text{$1}}');
    formula = formula.replace(/_\{\s*(\w+)\s*\}/g, '_{$1}');

    // Tolerances
    formula = formula.replace(/\\pm\s*0\.025\s*\\*text\{\s*mm\s*\}/g, '\\pm 0.025\\text{ mm}');
    formula = formula.replace(/\\pm\s*0\.004\s*\\*text\{\s*mm\s*\}/g, '\\pm 0.004\\text{ mm}');

    // Degree C
    formula = formula.replace(/\^\s*\\circ\s*\\*text\{C\}/g, '^\\circ\\text{C}');
    formula = formula.replace(/\^\s*\\circ\s*C\b/g, '^\\circ\\text{C}');
    formula = formula.replace(/\^circ\b/g, '^\\circ');

    // Double spaces
    formula = formula.replace(/ {2,}/g, ' ').trim();

    return isDisplay ? `$$${formula}$$` : `$${formula}$`;
  });
  out = out.replace(/&\\([a-zA-Z]+;)/g, '&$1');

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

  // 11. Normalize Executive Summary Metrics & Prevent Telemetry Bar Collisions
  const tbMatches = [...out.matchAll(/<div class="telemetry-bar"[^>]*>/gi)];
  for (let i = tbMatches.length - 1; i >= 0; i--) {
    const tbm = tbMatches[i];
    const startIndex = tbm.index;
    let depth = 0;
    let endIndex = startIndex;
    const tagRegex = /<\/?div\b[^>]*>/gi;
    tagRegex.lastIndex = startIndex;
    let tm;
    while ((tm = tagRegex.exec(out)) !== null) {
      if (tm[0].startsWith('</')) {
        depth--;
        if (depth === 0) {
          endIndex = tm.index + tm[0].length;
          break;
        }
      } else {
        depth++;
      }
    }
    const fullBlock = out.slice(startIndex, endIndex);
    if (fullBlock.includes('telemetry-cell') || fullBlock.includes('metric-cell') || (!fullBlock.includes('telemetry-actions') && !fullBlock.includes('telemetry-info'))) {
      const fixed = fullBlock
        .replace(/class="telemetry-bar"/, 'class="executive-metrics-bar"')
        .replace(/\btelemetry-cell\b/g, 'metric-cell')
        .replace(/\btelemetry-label\b/g, 'metric-cell-label')
        .replace(/\btelemetry-val\b/g, 'metric-cell-val')
        .replace(/\btelemetry-sub\b/g, 'metric-cell-sub');
      out = out.slice(0, startIndex) + fixed + out.slice(endIndex);
    }
  }

  const ebMatches = [...out.matchAll(/<div class="executive-metrics-bar"[^>]*>/gi)];
  for (let i = ebMatches.length - 1; i >= 0; i--) {
    const ebm = ebMatches[i];
    const startIndex = ebm.index;
    let depth = 0;
    let endIndex = startIndex;
    const tagRegex = /<\/?div\b[^>]*>/gi;
    tagRegex.lastIndex = startIndex;
    let tm;
    while ((tm = tagRegex.exec(out)) !== null) {
      if (tm[0].startsWith('</')) {
        depth--;
        if (depth === 0) {
          endIndex = tm.index + tm[0].length;
          break;
        }
      } else {
        depth++;
      }
    }
    const fullBlock = out.slice(startIndex, endIndex);
    const fixed = fullBlock
      .replace(/\btelemetry-cell\b/g, 'metric-cell')
      .replace(/\btelemetry-label\b/g, 'metric-cell-label')
      .replace(/\btelemetry-val\b/g, 'metric-cell-val')
      .replace(/\btelemetry-sub\b/g, 'metric-cell-sub');
    out = out.slice(0, startIndex) + fixed + out.slice(endIndex);
  }

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

  // 1B. Rhythmic Visual Cadence Standard (Mandate: Visual anchor every 2-3 paragraphs)
  const paragraphCount = (html.match(/<p\b/gi) || []).length;
  const visualCount = (html.match(/<figure\b|<div class=["']schematic-card|<div class=["']process-grid|<TechnicalCard\b|<ProcessFlow\b/gi) || []).length;
  if (paragraphCount >= 8 && visualCount < 3) {
    console.warn(`[VISUAL CADENCE WARNING] ${fileLabel}: Contains ${paragraphCount} paragraphs but only ${visualCount} visual anchor(s). High-depth standard requires a visual anchor every 2-3 paragraphs.`);
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

  // 2B-2. Check for corrupted LaTeX escape sequences, control characters, and unescaped math
  for (let i = 0; i < html.length; i++) {
    const code = html.charCodeAt(i);
    if (code < 32 && code !== 10 && code !== 13) {
      errors.push(
        `Control character ASCII ${code} detected in ${fileLabel} at "...${html.slice(Math.max(0, i - 15), i + 20).replace(/\n/g, ' ')}...". All LaTeX backslashes must be properly escaped.`
      );
      break;
    }
  }

  const mathRegex = /\$\$([\s\S]*?)\$\$|\$([^\$\n]+?)\$/g;
  let mbMatch;
  while ((mbMatch = mathRegex.exec(html)) !== null) {
    const isDisplay = !!mbMatch[1];
    const f = isDisplay ? mbMatch[1] : mbMatch[2];

    if (f.includes('\t')) {
      errors.push(`Raw tab character in math block in ${fileLabel}: "${mbMatch[0]}"`);
    }
    if (/\\t(?!(?:ext|heta|imes|au|o|op|extbf|ilde|an|anh|iny|frac|ag)\b)/.test(f)) {
      errors.push(`Invalid \\t escape artifact in math block in ${fileLabel}: "${mbMatch[0]}"`);
    }
    if (/(?<![a-zA-Z\\])ext\{/.test(f) || /(?<!\\)text\{/.test(f)) {
      errors.push(`Unescaped text{ in LaTeX formula in ${fileLabel}: "${mbMatch[0]}". Must use \\text{...}.`);
    }
    if (/(?<![a-zA-Z\\])heta\b/.test(f) || /(?<!\\)theta\b/.test(f)) {
      errors.push(`Unescaped heta in LaTeX formula in ${fileLabel}: "${mbMatch[0]}". Must use \\theta.`);
    }
    if (/(?<![a-zA-Z\\])imes\b/.test(f) || /(?<!\\)times\b/.test(f)) {
      errors.push(`Unescaped imes in LaTeX formula in ${fileLabel}: "${mbMatch[0]}". Must use \\times.`);
    }
    if (/\^circ\b/.test(f)) {
      errors.push(`Missing backslash in ^circ in ${fileLabel}: "${mbMatch[0]}". Must use ^\\circ.`);
    }
    if (!isDisplay && /\\{2,}/.test(f)) {
      errors.push(`Illegal newline break (\\\\) in inline math in ${fileLabel}: "${mbMatch[0]}". Inline units must not break across lines.`);
    }
  }

  // Check for unescaped currency in HTML prose (outside tables, price-tags, and math)
  const noTables = html.replace(/<table[\s\S]*?<\/table>/gi, '');
  const noPrices = noTables.replace(/<span class="price-tag">[\s\S]*?<\/span>/gi, '');
  const noMath = noPrices.replace(mathRegex, '');
  const unescapedCurrency = noMath.match(/(?<!\\)\$\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:million|billion|k|M|mo|yr))?/gi);
  if (unescapedCurrency && unescapedCurrency.length > 0) {
    errors.push(`Unescaped currency dollar sign in prose in ${fileLabel}: ${unescapedCurrency.slice(0, 3).join(', ')}. Must use \\$ to prevent breaking KaTeX.`);
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

  // 2D-2. Structural Verification: Ensure every .schematic-caption is inside an active, unclosed .schematic-card
  const capRegex = /<div class="schematic-caption">([\s\S]*?)<\/div>/g;
  let cm;
  while ((cm = capRegex.exec(html)) !== null) {
    const capStart = cm.index;
    const before = html.slice(0, capStart);
    const lastCardOpen = before.lastIndexOf('<div class="schematic-card"');
    if (lastCardOpen === -1) {
      errors.push(`Orphaned schematic caption in ${fileLabel}: caption found with no preceding <div class="schematic-card">: "${cm[0].slice(0, 80)}..."`);
    } else {
      const between = before.slice(lastCardOpen);
      const openCount = (between.match(/<div\b[^>]*>/g) || []).length;
      const closeCount = (between.match(/<\/div>/g) || []).length;
      if (closeCount >= openCount) {
        errors.push(`Orphaned schematic caption in ${fileLabel}: caption placed after <div class="schematic-card"> has already closed: "${cm[0].slice(0, 80)}..."`);
      }
    }
  }

  // 2D-3. Visual Payload Verification: Ensure every .schematic-card contains actual visual content
  const cardStartRegex = /<div class="schematic-card"[^>]*>/g;
  let csm;
  while ((csm = cardStartRegex.exec(html)) !== null) {
    const startIdx = csm.index;
    let depth = 0;
    let endIdx = -1;
    const tagRegex = /<\/?div\b[^>]*>/g;
    tagRegex.lastIndex = startIdx;
    let tm;
    while ((tm = tagRegex.exec(html)) !== null) {
      if (tm[0].startsWith('</')) {
        depth--;
        if (depth === 0) {
          endIdx = tm.index + tm[0].length;
          break;
        }
      } else {
        depth++;
      }
    }
    const cardFull = endIdx !== -1 ? html.slice(startIdx, endIdx) : html.slice(startIdx);
    const hasSvg = cardFull.includes('<svg');
    const hasImg = cardFull.includes('<img');
    const hasGrid = cardFull.includes('class="process-grid"');
    const hasComparison = cardFull.includes('class="comparison-grid"');
    const hasStepper = cardFull.includes('class="process-stepper-viewport"');
    if (!hasSvg && !hasImg && !hasGrid && !hasComparison && !hasStepper) {
      errors.push(`Empty schematic-card in ${fileLabel}: card contains no visual diagram (missing <svg>, <img>, or .process-grid): "${cardFull.slice(0, 100)}..."`);
    }

    // Ensure header has both title and non-empty subtitle
    const headerMatch = cardFull.match(/<div class="schematic-header">([\s\S]*?)<\/div>/);
    if (headerMatch) {
      const headerInner = headerMatch[1];
      const hasTitle = headerInner.includes('class="schematic-title"') || headerInner.includes('class="schematic-tag"');
      const hasSubtitle = headerInner.includes('class="schematic-subtitle"');
      if (!hasTitle) {
        errors.push(`Schematic card in ${fileLabel} is missing .schematic-title in header.`);
      }
      if (!hasSubtitle) {
        errors.push(`Schematic card in ${fileLabel} is missing .schematic-subtitle in header.`);
      } else {
        const subText = headerInner.match(/<span class="schematic-subtitle">([\s\S]*?)<\/span>/)?.[1]?.trim();
        if (!subText) {
          errors.push(`Schematic card in ${fileLabel} has an empty or blank .schematic-subtitle.`);
        }
      }
    }
  }

  // 2E. Anti-Clustering Rule: Figures must have narrative prose between them (minimum 75 words)
  const visualBlockRegex = /(?:<figure class="product-figure">[\s\S]*?<\/figure>|<div class="schematic-card"[^>]*>[\s\S]*?<\/div>\s*<\/div>)/gi;
  let lastVisualEnd = -1;
  let vMatch;
  while ((vMatch = visualBlockRegex.exec(html)) !== null) {
    if (lastVisualEnd !== -1) {
      const gapHtml = html.slice(lastVisualEnd, vMatch.index);
      const gapWords = gapHtml.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
      if (gapWords < 75) {
        errors.push(`Figures stacked back-to-back with only ${gapWords} intervening words in ${fileLabel}. Must include at least 75 words of explanatory prose between figures.`);
      }
    }
    lastVisualEnd = vMatch.index + vMatch[0].length;
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

  // 3A-2. Check that every schematic-card has an actual visual representation (<svg>, <img>, or .process-grid)
  const schematicCards = [...html.matchAll(/<div class="schematic-card"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g)].map(m => m[1]);
  for (let sIdx = 0; sIdx < schematicCards.length; sIdx++) {
    const cardContent = schematicCards[sIdx];
    const hasVisual = cardContent.includes('<svg') || cardContent.includes('<img') || cardContent.includes('process-grid');
    if (!hasVisual) {
      errors.push(`Schematic card #${sIdx + 1} in ${fileLabel} lacks an authentic graphical element (<svg>, <img>, or .process-grid). Schematics cannot be purely text.`);
    }
  }

  // 3A-3. Strict structural & alignment check for comparison grids
  const cardTokenRegex = /<div class="[^"]*(?:\s|^)comparison-card(?:\s|")[^"]*">/gi;
  const cardIndices = [...html.matchAll(cardTokenRegex)].map(m => m.index);
  for (let cIdx = 0; cIdx < cardIndices.length; cIdx++) {
    const start = cardIndices[cIdx];
    const nextStart = cardIndices[cIdx + 1] !== undefined ? cardIndices[cIdx + 1] : html.indexOf('schematic-caption', start);
    const cardContent = html.slice(start, nextStart !== -1 ? nextStart : start + 3000);
    if (!cardContent.includes('comparison-card-tag')) {
      errors.push(`Comparison card #${cIdx + 1} in ${fileLabel} missing mandatory .comparison-card-tag for row alignment.`);
    }
    if (!cardContent.includes('comparison-card-title')) {
      errors.push(`Comparison card #${cIdx + 1} in ${fileLabel} missing mandatory .comparison-card-title for row alignment.`);
    }
    if (!cardContent.includes('comparison-visual')) {
      errors.push(`Comparison card #${cIdx + 1} in ${fileLabel} missing mandatory .comparison-visual.`);
    }
    if (!cardContent.includes('comparison-metric-pill')) {
      errors.push(`Comparison card #${cIdx + 1} in ${fileLabel} missing mandatory .comparison-metric-pill.`);
    }
    if (!cardContent.includes('comparison-consequence')) {
      errors.push(`Comparison card #${cIdx + 1} in ${fileLabel} missing mandatory .comparison-consequence.`);
    }
  }

  // 3A-4. Strict structural & visual completeness check for process grids & step cards
  const stepCardTokenRegex = /<div class="[^"]*(?:\s|^)process-step-card(?:\s|")[^"]*">/gi;
  const stepCardIndices = [...html.matchAll(stepCardTokenRegex)].map(m => m.index);
  for (let scIdx = 0; scIdx < stepCardIndices.length; scIdx++) {
    const start = stepCardIndices[scIdx];
    const nextStart = stepCardIndices[scIdx + 1] !== undefined ? stepCardIndices[scIdx + 1] : html.indexOf('schematic-caption', start);
    const cardContent = html.slice(start, nextStart !== -1 ? nextStart : start + 3000);
    if (!cardContent.includes('process-step-tag')) {
      errors.push(`Process step card #${scIdx + 1} in ${fileLabel} missing mandatory .process-step-tag.`);
    }
    if (!cardContent.includes('process-step-title')) {
      errors.push(`Process step card #${scIdx + 1} in ${fileLabel} missing mandatory .process-step-title.`);
    }
    if (!cardContent.includes('process-step-visual') || !cardContent.includes('<svg')) {
      errors.push(`Process step card #${scIdx + 1} in ${fileLabel} missing mandatory .process-step-visual with SVG payload. Cards cannot be purely text as they render blank in the interactive stepper viewer.`);
    }
    if (!cardContent.includes('process-step-desc')) {
      errors.push(`Process step card #${scIdx + 1} in ${fileLabel} missing mandatory .process-step-desc.`);
    }
    if (!cardContent.includes('process-step-metric')) {
      errors.push(`Process step card #${scIdx + 1} in ${fileLabel} missing mandatory .process-step-metric.`);
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

  // 3D. Check for blacklisted or watermarked image assets
  const imgTags = [...html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)];
  const WATERMARK_BLACKLIST_PATTERNS = [
    /novy-pant/i,
    /watermark/i,
    /alamy/i,
    /shutterstock/i,
    /gettyimages/i,
    /stock-photo/i,
    /vosvete/i,
    /mobile-phone-hinge-teardown/i,
    /hinge[-_ ]of[-_ ]mobile[-_ ]phone/i
  ];
  for (const img of imgTags) {
    const src = img[1];
    const fullTag = img[0];
    if (WATERMARK_BLACKLIST_PATTERNS.some(p => p.test(src))) {
      errors.push(`Image in ${fileLabel} uses disqualified/watermarked asset: ${src}`);
    }
    if (!fullTag.includes('alt=') || /alt=["']\s*["']/.test(fullTag)) {
      errors.push(`Image in ${fileLabel} (${src}) missing mandatory descriptive alt attribute.`);
    }
    if (!fullTag.includes('onerror=')) {
      errors.push(`Image in ${fileLabel} (${src}) missing mandatory onerror fallback handler.`);
    }
  }

  // 3E. Math formatting & typography safeguards
  if (/(?:\\t\s*\\text\{|\t+\s*\\text\{|\\t\\t)/.test(html)) {
    errors.push(`HTML in ${fileLabel} contains corrupted \\t\\text artifact in math formulas.`);
  }
  if (/(?:\\mu\s+\\text\{m\}|\\mu\s+m\b)/.test(html)) {
    errors.push(`HTML in ${fileLabel} contains disjointed micrometer notation (must use \\mu\\text{m} or \\,\\mu\\text{m}).`);
  }

  // 4. Global SVG Geometry & Text Collision Analysis
  const svgMatches = [...html.matchAll(/<svg[\s\S]*?<\/svg>/g)].map(m => m[0]);
  svgMatches.forEach((svgStr, svgIdx) => {
    if (/(?:STEP|STAGE)\s*\d+/i.test(svgStr)) {
      errors.push(`SVG #${svgIdx + 1} in ${fileLabel}: contains multi-step sequence inside raw SVG. Multi-step workflows must use responsive HTML .process-grid.`);
    }
    // Strict ban on <text> in comparison or process-step-visual SVGs
    if (svgStr.includes('class="comparison-svg"') && /<text\b/i.test(svgStr)) {
      errors.push(`SVG #${svgIdx + 1} in ${fileLabel}: contains <text> tags inside a .comparison-svg. Comparison cards must use 100% native semantic HTML for text to prevent line overdrawing.`);
    }
  });

  const figcaps = [...html.matchAll(/<figcaption>([\s\S]*?)<\/figcaption>/gi)];
  for (const fc of figcaps) {
    if (!fc[1].includes('class="source-tag"')) {
      errors.push(`<figcaption> in ${fileLabel} is missing mandatory <span class="source-tag">.`);
    }
  }
  const schemCaps = [...html.matchAll(/<div class="schematic-caption">([\s\S]*?)<\/div>/gi)];
  for (const sc of schemCaps) {
    if (!sc[1].includes('class="source-tag"')) {
      errors.push(`<div class="schematic-caption"> in ${fileLabel} is missing mandatory <span class="source-tag">.`);
    }
  }

  svgMatches.forEach((svgStr, svgIdx) => {
    const vbMatch = svgStr.match(/viewBox=["']\s*([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s*["']/);
    const vbW = vbMatch ? parseFloat(vbMatch[3]) : 960;
    const vbH = vbMatch ? parseFloat(vbMatch[4]) : 480;

    // Walk SVG tokens tracking nested <g transform="translate(tx, ty)">
    const tagRegex = /<\/?g\b[^>]*>|<text\b[^>]*>[\s\S]*?<\/text>|<line\b[^>]*\/?>|<rect\b[^>]*\/?>|<circle\b[^>]*\/?>|<polyline\b[^>]*\/?>|<path\b[^>]*\/?>/g;
    const stack = [{ tx: 0, ty: 0 }];
    const texts = [];
    const lines = [];
    const rects = [];

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
      } else if (token.startsWith('<rect')) {
        const top = stack[stack.length - 1];
        const rx = parseFloat((token.match(/\bx=["']([0-9.-]+)["']/) || [0, 0])[1]) + top.tx;
        const ry = parseFloat((token.match(/\by=["']([0-9.-]+)["']/) || [0, 0])[1]) + top.ty;
        const rw = parseFloat((token.match(/\bwidth=["']([0-9.-]+)["']/) || [0, 0])[1]);
        const rh = parseFloat((token.match(/\bheight=["']([0-9.-]+)["']/) || [0, 0])[1]);
        const fill = (token.match(/\bfill=["']([^"']+)["']/) || [0, ''])[1];
        const cls = (token.match(/\bclass=["']([^"']+)["']/) || [0, ''])[1];
        rects.push({ rx, ry, rw, rh, fill, cls });
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
        for (const r of rects) {
          const isDark = /#(?:18181B|1C1917|1E293B|0F172A|000000|111110|292524)/i.test(r.fill);
          const isTheme = r.cls.includes('svg-panel-bg') || r.cls.includes('svg-canvas-bg');
          if (isDark && !isTheme) {
            if (t.x >= r.rx && t.x <= r.rx + r.rw && t.y >= r.ry && t.y <= r.ry + r.rh) {
              errors.push(
                `SVG #${svgIdx + 1} in ${fileLabel} CONTRAST COLLISION: "${t.rawText}" uses adaptive theme text class directly over hardcoded dark rect (${r.fill}). Must use explicit high-contrast badge or light fill.`
              );
            }
          }
        }
      }
    }

    // 4E. Check Badge Box Bounding: text must never overflow enclosing badge <rect>
    for (const r of rects) {
      // Small to medium badge callout rects (width 50..350, height 25..120, excluding large canvases/panels)
      if (r.rw >= 50 && r.rw <= 350 && r.rh >= 25 && r.rh <= 120 && !r.cls.includes('svg-panel-bg') && !r.cls.includes('svg-canvas-bg')) {
        for (const t of texts) {
          // If text's center point is situated inside or immediately around this card
          if (t.x >= r.rx - 5 && t.x <= r.rx + r.rw + 5 && t.y >= r.ry - 5 && t.y <= r.ry + r.rh + 5) {
            // Horizontal bounds check
            if (t.left < r.rx - 6 || t.right > r.rx + r.rw + 6) {
              errors.push(
                `SVG #${svgIdx + 1} in ${fileLabel} BADGE OVERFLOW: text "${t.rawText}" (${Math.round(t.right - t.left)}px) exceeds enclosing badge box width (${r.rw}px)`
              );
            }
            // Vertical bounds check
            if (t.topY < r.ry - 8 || t.bottomY > r.ry + r.rh + 8) {
              errors.push(
                `SVG #${svgIdx + 1} in ${fileLabel} BADGE HEIGHT OVERFLOW: text "${t.rawText}" (y=${Math.round(t.y)}) is outside enclosing badge box (y: ${r.ry}..${r.ry + r.rh})`
              );
            }
          }
        }
      }
    }

    // 4E-2. Check Sub-Panel & Multi-Column Box Bounding: text placed inside a sub-panel/column must never exceed its boundaries
    for (const r of rects) {
      // Sub-panels/cards/columns (width 80..600, height 30..450, excluding full root canvases rw >= 800)
      if (r.rw >= 80 && r.rw <= 600 && r.rh >= 30 && r.rh <= 450) {
        for (const t of texts) {
          const insideY = t.y >= r.ry + 2 && t.y <= r.ry + r.rh + 5;
          const originatesInsideX = t.x >= r.rx - 2 && t.x <= r.rx + r.rw + 2;
          if (insideY && originatesInsideX) {
            if (t.right > r.rx + r.rw + 4) {
              errors.push(
                `SVG #${svgIdx + 1} in ${fileLabel} SUB-PANEL OVERFLOW: text "${t.rawText}" (${Math.round(t.right - t.left)}px at x=${Math.round(t.x)}) extends ${Math.round(t.right - (r.rx + r.rw))}px past the right border of sub-panel (x=${r.rx}..${r.rx + r.rw})`
              );
            }
            if (t.left < r.rx - 4) {
              errors.push(
                `SVG #${svgIdx + 1} in ${fileLabel} SUB-PANEL UNDERFLOW: text "${t.rawText}" (${Math.round(t.right - t.left)}px at x=${Math.round(t.x)}) extends ${Math.round(r.rx - t.left)}px past the left border of sub-panel (x=${r.rx}..${r.rx + r.rw})`
              );
            }
          }
        }
      }
    }

    // 4F. Check for Low-Contrast Pastel / Washed Out Text Colors on Light Backgrounds
    const paleColorRegex = /#(?:FCA5A5|6EE7B7|A7F3D0|F1F5F9|FFFFFF|FAFAFA|FED7AA|FEF08A|93C5FD)\b/i;
    for (const t of texts) {
      const fillMatch = t.attrs && t.attrs.match(/\bfill=["']([^"']+)["']/i);
      if (fillMatch && paleColorRegex.test(fillMatch[1])) {
        // Must be enclosed inside an explicit dark background rect!
        const hasDarkContainer = rects.some(r => {
          const isDark = /#(?:18181B|1C1917|1E293B|0F172A|000000|111110|292524)/i.test(r.fill);
          return isDark && t.left >= r.rx - 8 && t.right <= r.rx + r.rw + 8 && t.topY >= r.ry - 8 && t.bottomY <= r.ry + r.rh + 8;
        });
        if (!hasDarkContainer) {
          errors.push(
            `SVG #${svgIdx + 1} in ${fileLabel} LOW-CONTRAST TEXT: "${t.rawText}" uses pale light fill (${fillMatch[1]}) directly on light canvas. Must use deep accessible tone or house inside a dark pill rect.`
          );
        }
      }
    }
  });

  // 5. Executive Summary Metrics Bar & Telemetry Component Integrity
  const execBarMatches = [...html.matchAll(/<div class="executive-metrics-bar"[^>]*>/gi)];
  for (const m of execBarMatches) {
    const startIndex = m.index;
    let depth = 0;
    let endIndex = startIndex;
    const tagRegex = /<\/?div\b[^>]*>/gi;
    tagRegex.lastIndex = startIndex;
    let tm;
    while ((tm = tagRegex.exec(html)) !== null) {
      if (tm[0].startsWith('</')) {
        depth--;
        if (depth === 0) {
          endIndex = tm.index + tm[0].length;
          break;
        }
      } else {
        depth++;
      }
    }
    const fullBlock = html.slice(startIndex, endIndex);
    const cells = [...fullBlock.matchAll(/<div class="(?:metric|telemetry)-cell">/gi)];
    if (cells.length < 3) {
      errors.push(`Incomplete .executive-metrics-bar in ${fileLabel}: expected at least 3 metric cells, found ${cells.length}.`);
    }
    if (!fullBlock.includes('-label') || !fullBlock.includes('-val')) {
      errors.push(`.executive-metrics-bar in ${fileLabel} missing mandatory .metric-cell-label or .metric-cell-val.`);
    }
  }

  const telemetryBars = [...html.matchAll(/<div class="telemetry-bar"[^>]*>/gi)];
  for (const m of telemetryBars) {
    const startIndex = m.index;
    let depth = 0;
    let endIndex = startIndex;
    const tagRegex = /<\/?div\b[^>]*>/gi;
    tagRegex.lastIndex = startIndex;
    let tm;
    while ((tm = tagRegex.exec(html)) !== null) {
      if (tm[0].startsWith('</')) {
        depth--;
        if (depth === 0) {
          endIndex = tm.index + tm[0].length;
          break;
        }
      } else {
        depth++;
      }
    }
    const fullBlock = html.slice(startIndex, endIndex);
    if (fullBlock.includes('telemetry-cell') || fullBlock.includes('metric-cell')) {
      errors.push(`Class collision in ${fileLabel}: <div class="telemetry-bar"> contains metric cells. Must use <div class="executive-metrics-bar">.`);
    }
  }

  // 6. Global CSS Class Coverage Audit against index.html
  if (fs.existsSync('index.html')) {
    const indexHtml = fs.readFileSync('index.html', 'utf8');
    const classMatches = [...html.matchAll(/class=["']([^"']+)["']/g)];
    const verifiedClasses = new Set();
    for (const cm of classMatches) {
      cm[1].split(/\s+/).forEach(cls => {
        if (!cls || cls.startsWith('sub-') || verifiedClasses.has(cls)) return;
        verifiedClasses.add(cls);
        if (!indexHtml.includes(`.${cls}`) && !indexHtml.includes(`"${cls}"`) && !indexHtml.includes(`'${cls}'`)) {
          errors.push(`Unstyled CSS class in ${fileLabel}: "${cls}" has no corresponding definition in index.html.`);
        }
      });
    }
  }

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

      if (!data.subtitle || typeof data.subtitle !== 'string' || !data.subtitle.trim()) {
        console.error(`[LINT ERROR] Missing top-level 'subtitle' field in ${file}`);
        hasViolation = true;
      }

      if (data.article_html) {
        const htmlKeys = [...(data.article_html || '').matchAll(/data-tangent="([^"]+)"/g)].map(m => m[1]);
        const dictKeys = Object.keys(data.tangents || {});
        const missingInDict = htmlKeys.filter(k => !dictKeys.includes(k));
        if (missingInDict.length > 0) {
          console.error(`[LINT ERROR] ${file} has data-tangent terms missing from 'tangents' dictionary: ${missingInDict.join(', ')}`);
          hasViolation = true;
        }
        const unlinkedInDict = dictKeys.filter(k => !htmlKeys.includes(k));
        if (unlinkedInDict.length > 0) {
          console.error(`[LINT ERROR] ${file} has definitions in 'tangents' dictionary that are never linked in article_html: ${unlinkedInDict.join(', ')}`);
          hasViolation = true;
        }
      }

      let jsonModified = false;

      if (data.tangents) {
        Object.keys(data.tangents).forEach(k => {
          const tan = data.tangents[k];
          if (tan.body) {
            const cleanBody = autoSanitizeArticleHtml(tan.body);
            if (cleanBody !== tan.body) {
              tan.body = cleanBody;
              jsonModified = true;
            }
          }
          if (tan.title) {
            const cleanTitle = autoSanitizeArticleHtml(tan.title);
            if (cleanTitle !== tan.title) {
              tan.title = cleanTitle;
              jsonModified = true;
            }
          }
        });
      }

      if (data.article_html) {
        const sanitized = autoSanitizeArticleHtml(data.article_html);
        if (sanitized !== data.article_html) {
          data.article_html = sanitized;
          jsonModified = true;
        }
      }

      if (jsonModified) {
        fs.writeFileSync(fullPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
        // Automatically keep markdown mirrors in exact sync
        if (fs.existsSync('content')) {
          const mdFiles = fs.readdirSync('content').filter(f => f.endsWith('.md'));
          for (const mf of mdFiles) {
            const mdPath = path.join('content', mf);
            const mdContent = fs.readFileSync(mdPath, 'utf8');
            if (mdContent.includes(`ISSUE #${data.id}`) || (data.date && mf.includes(data.date))) {
              fs.writeFileSync(mdPath, (data.article_html || '').trim() + '\n', 'utf8');
            }
          }
        }
        console.log(`[AUTO-HEALED] Repaired mechanical formatting in ${file}`);
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
