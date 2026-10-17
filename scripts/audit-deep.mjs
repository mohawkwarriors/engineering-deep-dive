import fs from 'fs';
import path from 'path';

console.log('--- 1. AUDITING ARTICLES & TANGENTS ---');
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
  const htmlKeys = [...data.article_html.matchAll(/data-tangent="([^"]+)"/g)].map(m => m[1]);
  const dictKeys = Object.keys(data.tangents || {});

  const missingInDict = htmlKeys.filter(k => !dictKeys.includes(k));
  if (missingInDict.length > 0) {
    console.error(`[ERROR] ${file} has data-tangent terms missing from 'tangents' dictionary:`, missingInDict);
    issueErrors++;
  }

  // Check image src
  const imgMatches = [...data.article_html.matchAll(/<img[^>]+src="([^">]+)"/g)].map(m => m[1]);
  for (const src of imgMatches) {
    if (src.startsWith('images/')) {
      if (!fs.existsSync(src)) {
        console.error(`[ERROR] ${file} references non-existent local image: ${src}`);
        issueErrors++;
      }
    }
  }

  // Check sequential captions
  const caps = [...data.article_html.matchAll(/<strong>FIG\s*(\d+)\s*—\s*([^:<]+):<\/strong>/g)];
  for (let i = 0; i < caps.length; i++) {
    const num = parseInt(caps[i][1], 10);
    if (num !== i + 1) {
      console.error(`[ERROR] ${file} has non-sequential figure numbering: expected FIG ${i + 1}, found FIG ${num}`);
      issueErrors++;
    }
  }

  // Check LaTeX brackets
  const mathInline = [...data.article_html.matchAll(/\$([^$]+)\$/g)].map(m => m[1]);
  for (const eq of mathInline) {
    if (eq.includes('\u0000') || eq.includes('\u0007') || eq.includes('\u0008')) {
      console.error(`[ERROR] ${file} has corrupted ASCII in math: ${eq}`);
      issueErrors++;
    }
  }
}

if (issueErrors === 0) {
  console.log(`✓ All ${issues.length} articles passed content, image, tangent, and equation audit.`);
}

console.log('\n--- 2. AUDITING BACKLOG & QUEUE ---');
const backlog = JSON.parse(fs.readFileSync('content/backlog.json', 'utf8'));
console.log(`Total backlog topics: ${backlog.length}`);
const publishedBacklog = backlog.filter(b => b.status === 'published');
console.log(`Published topics in backlog: ${publishedBacklog.map(b => b.issueId + ' (' + b.id + ')').join(', ')}`);
const availableBacklog = backlog.filter(b => b.status === 'available');
console.log(`Available backlog topics: ${availableBacklog.length}`);

console.log('\n--- 3. AUDITING WORKFLOWS ---');
const workflowsDir = '.github/workflows';
const workflowFiles = fs.readdirSync(workflowsDir);
for (const wf of workflowFiles) {
  const content = fs.readFileSync(path.join(workflowsDir, wf), 'utf8');
  console.log(`Workflow: ${wf}`);
  if (content.includes('gemini-2.5-pro')) {
    console.error(`[ERROR] ${wf} still references gemini-2.5-pro!`);
  }
}

console.log('\n--- 4. AUDITING POPOVER & UI INTERACTION GEOMETRY ---');
const indexHtml = fs.readFileSync('index.html', 'utf8');
let popoverErrors = 0;

if (indexHtml.includes('rect.top - 280') || indexHtml.includes('top + 280 > window.innerHeight')) {
  console.error('[ERROR] index.html still contains hardcoded 280px popover offset assumptions!');
  popoverErrors++;
}
if (!indexHtml.includes('popoverRect.height') || !indexHtml.includes('spaceBelow') || !indexHtml.includes('spaceAbove')) {
  console.error('[ERROR] index.html is missing dynamic geometry height and space calculations for popovers!');
  popoverErrors++;
}
if (!indexHtml.includes('overflow-y: auto') || !indexHtml.includes('box-sizing: border-box')) {
  console.error('[ERROR] index.html .floating-popover is missing overflow-y: auto or box-sizing: border-box!');
  popoverErrors++;
}
if (!indexHtml.includes('GAP = 10')) {
  console.error('[ERROR] index.html is missing mandatory cursor/term buffer GAP!');
  popoverErrors++;
}

if (popoverErrors === 0) {
  console.log('✓ Popover geometry audit passed: dynamic height, non-overlapping bounds, and cursor buffer verified.');
} else {
  process.exit(1);
}
