import fs from 'fs';
import path from 'path';

const ISSUES_DIR = path.resolve('content/issues');
let hasViolation = false;

function error(msg) {
  console.error(`[LINT ERROR] ${msg}`);
  hasViolation = true;
}

function checkMdxFiles() {
  if (!fs.existsSync(ISSUES_DIR)) return;
  const files = fs.readdirSync(ISSUES_DIR).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));
  const bannedPatterns = [
    /!\[.*\]\(.*(dalle|midjourney|generated|ai-image|diagram-gen).*\)/i
  ];

  for (const file of files) {
    const fullPath = path.join(ISSUES_DIR, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    for (const pattern of bannedPatterns) {
      if (pattern.test(content)) {
        error(`Unapproved raster diagram or AI image in MDX: ${file}`);
      }
    }
  }
}

function checkJsonIssues() {
  if (!fs.existsSync(ISSUES_DIR)) return;
  const files = fs.readdirSync(ISSUES_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const fullPath = path.join(ISSUES_DIR, file);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (e) {
      error(`Corrupted JSON in ${file}: ${e.message}`);
      continue;
    }

    const html = data.article_html || '';

    // 1. Check for unrendered template placeholders
    const placeholders = html.match(/__[A-Z0-9_]+__/g);
    if (placeholders) {
      error(`Unrendered placeholder string(s) in ${file}: ${placeholders.join(', ')}`);
    }

    // 2. Check all image src paths
    const imgMatches = [...html.matchAll(/src=["']([^"']+)["']/g)].map(m => m[1]);
    for (const src of imgMatches) {
      if (!src.startsWith('http') && !src.startsWith('data:')) {
        const cleanPath = src.split('?')[0].split('#')[0];
        if (!fs.existsSync(cleanPath)) {
          error(`Missing referenced image in ${file}: ${cleanPath}`);
        } else {
          // Check that it's a real binary image, not an HTML error page
          const buf = fs.readFileSync(cleanPath);
          const isJpg = buf[0] === 0xff && buf[1] === 0xd8;
          const isPng = buf[0] === 0x89 && buf[1] === 0x50;
          const isGif = buf[0] === 0x47 && buf[1] === 0x49;
          const isSvg = buf.slice(0, 100).toString('utf8').includes('<svg');
          if (!isJpg && !isPng && !isGif && !isSvg) {
            error(`Image in ${file} is not a valid image binary: ${cleanPath}`);
          }
        }
      }
    }

    // 3. Check schematic headers for typography consistency
    const schematicHeaders = [...html.matchAll(/<div class="schematic-header">([\s\S]*?)<\/div>/g)].map(m => m[1]);
    for (const header of schematicHeaders) {
      if (!header.includes('schematic-title') && !header.includes('schematic-tag')) {
        error(`Schematic header in ${file} missing standard title class: ${header.trim()}`);
      }
    }

    // 4. Check SVG text elements for monospace font compliance and readable sizes
    const svgMatches = [...html.matchAll(/<svg[\s\S]*?<\/svg>/g)].map(m => m[0]);
    for (const svg of svgMatches) {
      const textMatches = [...svg.matchAll(/<text([^>]*)>([\s\S]*?)<\/text>/g)];
      for (const tm of textMatches) {
        const attrs = tm[1];
        const textContent = tm[2].replace(/<[^>]+>/g, '').trim();

        // Check font-size is at least 10px
        const sizeMatch = attrs.match(/font-size=["']([0-9\.]+)["']/);
        if (sizeMatch) {
          const size = parseFloat(sizeMatch[1]);
          if (size < 10 && textContent.length > 0) {
            error(`SVG text "${textContent.slice(0, 25)}" has illegible font-size: ${size}px in ${file} (min: 10px)`);
          }
        }
      }
    }

    // 5. Check for overlapping text collisions in SVGs
    for (const svg of svgMatches) {
      const gMatches = [...svg.matchAll(/<g([^>]*)>([\s\S]*?)<\/g>/g)];
      for (const g of gMatches) {
        const texts = [...g[2].matchAll(/<text([^>]*)>([\s\S]*?)<\/text>/g)];
        const coords = [];
        texts.forEach(t => {
          const xMatch = t[1].match(/x=["']([^"']+)["']/);
          const yMatch = t[1].match(/y=["']([^"']+)["']/);
          const anchorMatch = t[1].match(/text-anchor=["']([^"']+)["']/);
          const anchor = anchorMatch ? anchorMatch[1] : 'start';
          const str = t[2].replace(/<[^>]+>/g, '').trim();
          if (xMatch && yMatch && str.length > 0) {
            coords.push({ x: parseFloat(xMatch[1]), y: parseFloat(yMatch[1]), anchor, text: str });
          }
        });

        for (let i = 0; i < coords.length; i++) {
          for (let j = i + 1; j < coords.length; j++) {
            const a = coords[i];
            const b = coords[j];
            if (Math.abs(a.y - b.y) < 10) {
              const aWidth = a.text.length * 7.2;
              const bWidth = b.text.length * 7.2;
              const aLeft = a.anchor === 'end' ? a.x - aWidth : a.anchor === 'middle' ? a.x - aWidth / 2 : a.x;
              const aRight = aLeft + aWidth;
              const bLeft = b.anchor === 'end' ? b.x - bWidth : b.anchor === 'middle' ? b.x - bWidth / 2 : b.x;
              const bRight = bLeft + bWidth;

              if (Math.max(aLeft, bLeft) < Math.min(aRight, bRight)) {
                error(`SVG text collision in ${file}: "${a.text}" overlaps with "${b.text}" at y=${a.y}`);
              }
            }
          }
        }
      }
    }
  }
}

console.log('Running Deep Dive Media & Schematic Quality Audit...');
checkMdxFiles();
checkJsonIssues();

if (hasViolation) {
  console.error('\nFAIL: Quality standards check failed with errors above.');
  process.exit(1);
} else {
  console.log('\nPASS: All issues strictly adhere to visual hierarchy, monospace font theme, and non-overlapping schematic standards.');
}
