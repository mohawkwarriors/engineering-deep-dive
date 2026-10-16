// scripts/lint-media.mjs
// Validates that committed MDX files contain zero unverified AI raster diagrams.

import fs from 'fs';
import path from 'path';

const ISSUES_DIR = path.resolve('content/issues');

function checkFiles() {
  if (!fs.existsSync(ISSUES_DIR)) {
    console.log('No issues directory found. Skipping check.');
    return;
  }

  const files = fs.readdirSync(ISSUES_DIR).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));
  let hasViolation = false;

  const bannedPatterns = [
    /!\[.*\]\(.*(dalle|midjourney|generated|ai-image|diagram-gen).*\)/i,
    /!\[.*\]\(.*\.png\)/i, // Restrict generic local png diagrams without approved press prefix
  ];

  for (const file of files) {
    const fullPath = path.join(ISSUES_DIR, file);
    const content = fs.readFileSync(fullPath, 'utf8');

    for (const pattern of bannedPatterns) {
      if (pattern.test(content)) {
        console.error(`[VIOLATION] Found unapproved raster diagram or AI image in: ${file}`);
        hasViolation = true;
      }
    }
  }

  if (hasViolation) {
    console.error('Linting failed: Replace raster diagrams with <ProcessFlow> or <TechnicalCard> MDX components.');
    process.exit(1);
  } else {
    console.log('All MDX files conform to the Zero-AI-Raster and Native-Component standard.');
  }
}

checkFiles();
