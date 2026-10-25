import fs from 'fs';
import path from 'path';

console.log('--- 1. AUDITING ARTICLES, TANGENTS & EDITORIAL STANDARDS ---');
const issues = fs.readdirSync('content/issues').filter(f => f.endsWith('.json')).sort();
let issueErrors = 0;

for (const file of issues) {
  const filePath = path.join('content/issues', file);
  if (!fs.existsSync(filePath)) {
    console.error(`Missing file: ${filePath}`);
    issueErrors++;
    continue;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const html = data.article_html || '';

  // 1A. Subtitle presence
  if (!data.subtitle || typeof data.subtitle !== 'string' || data.subtitle.trim().length === 0) {
    console.error(`[ERROR] ${file} is missing top-level 'subtitle' field.`);
    issueErrors++;
  }

  // 1B. Tangents check (complete 2-way sync)
  const htmlKeys = [...html.matchAll(/data-tangent="([^"]+)"/g)].map(m => m[1]);
  const dictKeys = Object.keys(data.tangents || {});
  
  // Every html key must be in dict
  const missingInDict = htmlKeys.filter(k => !dictKeys.includes(k));
  if (missingInDict.length > 0) {
    console.error(`[ERROR] ${file} has data-tangent terms missing from 'tangents' dictionary:`, missingInDict);
    issueErrors++;
  }
  
  // Every dict key must be linked in html (zero orphaned definitions)
  const unlinkedInDict = dictKeys.filter(k => !htmlKeys.includes(k));
  if (unlinkedInDict.length > 0) {
    console.error(`[ERROR] ${file} has definitions in 'tangents' dictionary that are never linked in article_html:`, unlinkedInDict);
    issueErrors++;
  }

  // 1C. Image src check
  const imgMatches = [...html.matchAll(/<img[^>]+src="([^">]+)"/g)].map(m => m[1]);
  for (const src of imgMatches) {
    if (src.startsWith('images/')) {
      if (!fs.existsSync(src)) {
        console.error(`[ERROR] ${file} references non-existent local image: ${src}`);
        issueErrors++;
      }
    }
  }

  // 1D. Sequential figure captions
  const caps = [...html.matchAll(/<strong>FIG\s*(\d+)\s*—\s*([^:<]+):<\/strong>/g)];
  for (let i = 0; i < caps.length; i++) {
    const num = parseInt(caps[i][1], 10);
    if (num !== i + 1) {
      console.error(`[ERROR] ${file} has non-sequential figure numbering: expected FIG ${i + 1}, found FIG ${num}`);
      issueErrors++;
    }
  }

  // 1E. Strict ban on raw multi-step process flows in SVG (must use .process-grid)
  const svgs = [...html.matchAll(/<svg\b[^>]*>([\s\S]*?)<\/svg>/gi)];
  for (const s of svgs) {
    if (/(?:STEP|STAGE)\s*\d+/i.test(s[1])) {
      console.error(`[ERROR] ${file} contains multi-step sequence inside raw SVG. Multi-step sequences must use .process-grid with .process-step-card.`);
      issueErrors++;
    }
  }

  // 1F. Unified source tags on all captions
  const figcaps = [...html.matchAll(/<figcaption>([\s\S]*?)<\/figcaption>/gi)];
  for (const fc of figcaps) {
    if (!fc[1].includes('class="source-tag"')) {
      console.error(`[ERROR] ${file} has <figcaption> missing <span class="source-tag">.`);
      issueErrors++;
    }
  }
  const schemCaps = [...html.matchAll(/<div class="schematic-caption">([\s\S]*?)<\/div>/gi)];
  for (const sc of schemCaps) {
    if (!sc[1].includes('class="source-tag"')) {
      console.error(`[ERROR] ${file} has <div class="schematic-caption"> missing <span class="source-tag">.`);
      issueErrors++;
    }
  }

  // 1G. Math equations calibration (Morning Digest standard)
  const mathInline = [...html.matchAll(/\$([^$]+)\$/g)].map(m => m[1]);
  for (const eq of mathInline) {
    if (eq.includes('\u0000') || eq.includes('\u0007') || eq.includes('\u0008')) {
      console.error(`[ERROR] ${file} has corrupted ASCII in math: ${eq}`);
      issueErrors++;
    }
  }

  // Strict ban on raw integrals in display equations (must be intuitive algebra; derivations belong in tangents)
  const displayMath = [...html.matchAll(/<div class="math-block">([\s\S]*?)<\/div>/g)].map(m => m[1]);
  for (const dm of displayMath) {
    if (dm.includes('\\int')) {
      console.error(`[ERROR] ${file} contains raw calculus integral in display math block: "${dm.slice(0, 40)}...". Display formulas must use intuitive 2-4 variable scaling laws.`);
      issueErrors++;
    }
  }

  // 1H. Structural elements check
  if (!html.includes('class="meta-line"')) {
    console.error(`[ERROR] ${file} is missing standard .meta-line header.`);
    issueErrors++;
  }
  
  // 1I. Read duration & pacing check (Issue 001 medium benchmark; strictly 8 to 13 minutes)
  const pWords = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(m => m[1].replace(/<[^>]+>/g, ' '))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\s+/).filter(Boolean).length;

  const totalWords = html
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\s+/).filter(Boolean).length;

  const nonP = Math.max(0, totalWords - pWords);
  const calculatedMinutes = Math.round((pWords / 220) + (nonP / 450));

  const badgeMatch = html.match(/(\d+)\s*MIN\s*READ/i);
  if (!badgeMatch) {
    console.error(`[ERROR] ${file} is missing standard '[X] MIN READ' badge in .meta-line.`);
    issueErrors++;
  } else {
    const badgeMin = parseInt(badgeMatch[1], 10);
    if (badgeMin < 8 || badgeMin > 13) {
      console.error(`[ERROR] ${file} read time badge (${badgeMin} MIN READ) is outside the mandatory 8-13 minute range.`);
      issueErrors++;
    }
    // Calculated minutes must stay within pacing window with 1 minute margin
    if (calculatedMinutes < 7 || calculatedMinutes > 14) {
      console.error(`[ERROR] ${file} calculated read duration (${calculatedMinutes} min) violates 8-13 minute pacing standard.`);
      issueErrors++;
    }
  }

  if (!html.includes('class="telemetry-bar"')) {
    console.error(`[ERROR] ${file} is missing standard .telemetry-bar.`);
    issueErrors++;
  }
}

if (issueErrors === 0) {
  console.log(`✓ All ${issues.length} articles passed content, image, tangent, subtitle, caption source, and structural audits.`);
}

console.log('\n--- 2. AUDITING SYNCHRONIZED MARKDOWN MIRRORS ---');
let mirrorErrors = 0;
const mdFiles = fs.readdirSync('content').filter(f => f.endsWith('.md'));
console.log(`Found ${mdFiles.length} markdown mirror articles in content/:`);
mdFiles.forEach(f => console.log(`  • ${f}`));

if (mdFiles.length < issues.length) {
  console.error(`[ERROR] Mismatch between JSON issues (${issues.length}) and Markdown mirrors (${mdFiles.length})`);
  mirrorErrors++;
} else {
  // Verify exact text synchronization
  for (const file of issues) {
    const jsonPath = path.join('content/issues', file);
    const issueData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const expectedHtml = (issueData.article_html || '').trim().replace(/\r\n/g, '\n');

    // Find corresponding md file
    const matchingMd = mdFiles.find(mf => {
      const mdContent = fs.readFileSync(path.join('content', mf), 'utf8').trim().replace(/\r\n/g, '\n');
      return mdContent === expectedHtml || mdContent.includes(expectedHtml);
    });

    if (!matchingMd) {
      console.error(`[ERROR] No exact synchronized Markdown mirror found for ${file}!`);
      mirrorErrors++;
    }
  }
  if (mirrorErrors === 0) {
    console.log('✓ All historical issues have exact synchronized Markdown archive mirrors.');
  }
}

console.log('\n--- 3. AUDITING BACKLOG & QUEUE ---');
const backlog = JSON.parse(fs.readFileSync('content/backlog.json', 'utf8'));
console.log(`Total backlog topics: ${backlog.length}`);
const publishedBacklog = backlog.filter(b => b.status === 'published');
console.log(`Published topics in backlog: ${publishedBacklog.map(b => b.issueId + ' (' + b.id + ')').join(', ')}`);
const availableBacklog = backlog.filter(b => b.status === 'available');
console.log(`Available backlog topics: ${availableBacklog.length}`);

console.log('\n--- 4. AUDITING WORKFLOWS ---');
const workflowsDir = '.github/workflows';
const workflowFiles = fs.readdirSync(workflowsDir);
for (const wf of workflowFiles) {
  const content = fs.readFileSync(path.join(workflowsDir, wf), 'utf8');
  console.log(`Workflow: ${wf}`);
  if (content.includes('gemini-2.5-pro')) {
    console.error(`[ERROR] ${wf} still references gemini-2.5-pro!`);
  }
}

console.log('\n--- 5. AUDITING POPOVER & UI INTERACTION GEOMETRY ---');
const popoverSrc = fs.existsSync('components/TangentPopoverHandler.tsx')
  ? fs.readFileSync('components/TangentPopoverHandler.tsx', 'utf8')
  : fs.existsSync('legacy/index.html')
  ? fs.readFileSync('legacy/index.html', 'utf8')
  : '';
let popoverErrors = 0;

if (popoverSrc.includes('rect.top - 280') || popoverSrc.includes('top + 280 > window.innerHeight')) {
  console.error('[ERROR] Popover still contains hardcoded 280px popover offset assumptions!');
  popoverErrors++;
}
if (!popoverSrc.includes('spaceBelow') || !popoverSrc.includes('spaceAbove')) {
  console.error('[ERROR] Popover is missing dynamic geometry height and space calculations!');
  popoverErrors++;
}
if (!popoverSrc.includes('overflow-y: auto') && !popoverSrc.includes('overflow-y-auto')) {
  console.error('[ERROR] Popover is missing overflow-y: auto for viewport scrolling!');
  popoverErrors++;
}
if (!popoverSrc.includes('GAP = 10')) {
  console.error('[ERROR] Popover is missing mandatory cursor/term buffer GAP!');
  popoverErrors++;
}

if (popoverErrors === 0 && issueErrors === 0 && mirrorErrors === 0) {
  console.log('✓ Popover geometry audit passed: dynamic height, non-overlapping bounds, and cursor buffer verified.');
} else {
  process.exit(1);
}

console.log('\n--- 6. AUDITING EXECUTIVE METRICS & CSS CLASS COVERAGE ---');
let componentErrors = 0;
const usedClasses = new Set();

for (const issue of issues) {
  const jsonPath = path.join('content/issues', issue);
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const html = data.article_html || '';

  // 1. Audit Executive Metrics Bar
  const ebMatches = [...html.matchAll(/<div class="executive-metrics-bar"[^>]*>/gi)];
  for (const m of ebMatches) {
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
      console.error(`[ERROR] ${issue} has incomplete .executive-metrics-bar: expected at least 3 metric cells, found ${cells.length}`);
      componentErrors++;
    }
    if (!fullBlock.includes('-label') || !fullBlock.includes('-val')) {
      console.error(`[ERROR] ${issue} .executive-metrics-bar missing mandatory labels or values`);
      componentErrors++;
    }
  }

  // 2. Audit Telemetry Bar Isolation
  const tbMatches = [...html.matchAll(/<div class="telemetry-bar"[^>]*>/gi)];
  for (const m of tbMatches) {
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
      console.error(`[ERROR] ${issue} has class collision: .telemetry-bar contains metric cells. Must use .executive-metrics-bar.`);
      componentErrors++;
    }
  }

  // 3. Collect Classes for CSS Coverage Audit
  const classMatches = [...html.matchAll(/class=["']([^"']+)["']/g)];
  for (const cm of classMatches) {
    cm[1].split(/\s+/).forEach(c => {
      if (c && !c.startsWith('sub-')) usedClasses.add(c);
    });
  }
}

for (const cls of usedClasses) {
  if (!indexHtml.includes(`.${cls}`) && !indexHtml.includes(`"${cls}"`) && !indexHtml.includes(`'${cls}'`)) {
    console.error(`[ERROR] Unstyled CSS class found in content without index.html styles: "${cls}"`);
    componentErrors++;
  }
}

if (componentErrors === 0) {
  console.log(`✓ All ${usedClasses.size} content CSS classes are verified against index.html stylesheet.`);
  console.log('✓ Executive metrics bars and quality telemetry bars are cleanly isolated and structured.');
} else {
  console.error(`FAIL: ${componentErrors} component integrity errors detected.`);
  process.exit(1);
}

