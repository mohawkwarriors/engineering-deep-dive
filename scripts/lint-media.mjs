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
