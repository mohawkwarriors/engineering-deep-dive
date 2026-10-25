import fs from 'fs';
import path from 'path';
import { searchDuckDuckGoImages, loadEnvFile } from './fetch-media.mjs';
import { populateQueueToFloor } from './fast-populate-drafts.mjs';

loadEnvFile();

const STAGING_DIR = path.resolve('staging');
const APPROVED_DIR = path.resolve('approved');
const CONTENT_DIR = path.resolve('content');
const ISSUES_DIR = path.resolve('content/issues');
const VETOES_PATH = path.resolve('content/vetoes.json');
const TARGET_CAPACITY = 40;

const MODELS = ['gemini-3.8-flash', 'gemini-2.5-flash'];

const SUBJECTS = [
  'Manufacturing',
  'Mechanisms',
  'Materials',
  'Design',
  'Fluids',
  'Electromechanical',
  'Thermal',
  'Product Dives'
];

/**
 * 3-List Semantic Deduplication:
 * 1. Published /content/ archive (issues + mdx/md files)
 * 2. Current drafts in /staging/ and /approved/
 * 3. The vetoes.json rejection log
 */
export function getDeduplicationIndex() {
  const index = new Set();

  // 1. Published issues & markdown
  if (fs.existsSync(ISSUES_DIR)) {
    fs.readdirSync(ISSUES_DIR).forEach(f => {
      if (f.endsWith('.json')) {
        try {
          const d = JSON.parse(fs.readFileSync(path.join(ISSUES_DIR, f), 'utf8'));
          if (d.title) index.add(d.title.toLowerCase().trim());
        } catch {}
      }
    });
  }
  if (fs.existsSync(CONTENT_DIR)) {
    fs.readdirSync(CONTENT_DIR).forEach(f => {
      if (f.endsWith('.md')) {
        index.add(f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '').replace(/-/g, ' ').toLowerCase());
      }
    });
  }

  // 2. Drafts in /staging/ and /approved/
  if (fs.existsSync(STAGING_DIR)) {
    fs.readdirSync(STAGING_DIR).forEach(f => {
      if (f.endsWith('.json')) {
        try {
          const d = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, f), 'utf8'));
          if (d.title) index.add(d.title.toLowerCase().trim());
        } catch {}
      }
    });
  }
  if (fs.existsSync(APPROVED_DIR)) {
    fs.readdirSync(APPROVED_DIR).forEach(f => {
      if (f.endsWith('.json')) {
        try {
          const d = JSON.parse(fs.readFileSync(path.join(APPROVED_DIR, f), 'utf8'));
          if (d.title) index.add(d.title.toLowerCase().trim());
        } catch {}
      }
    });
  }

  // 3. Vetoes log
  if (fs.existsSync(VETOES_PATH)) {
    try {
      const vetoes = JSON.parse(fs.readFileSync(VETOES_PATH, 'utf8'));
      if (Array.isArray(vetoes)) {
        vetoes.forEach(v => {
          if (v.topic) index.add(v.topic.toLowerCase().trim());
        });
      }
    } catch {}
  }

  return index;
}

export function isTopicDuplicated(topic, index) {
  const t = topic.toLowerCase().trim();
  for (const item of index) {
    if (item.includes(t) || t.includes(item)) return true;
  }
  return false;
}

export async function harvestStaging() {
  if (!fs.existsSync(STAGING_DIR)) fs.mkdirSync(STAGING_DIR, { recursive: true });
  if (!fs.existsSync(APPROVED_DIR)) fs.mkdirSync(APPROVED_DIR, { recursive: true });

  const existingFiles = fs.readdirSync(STAGING_DIR).filter(f => f.endsWith('.json'));
  const currentCount = existingFiles.length;
  console.log(`[Harvester] Current staging capacity: ${currentCount} / ${TARGET_CAPACITY} drafts (Floor: 40).`);

  if (currentCount >= TARGET_CAPACITY) {
    console.log(`[Harvester] Queue meets or exceeds minimum floor (${currentCount} >= ${TARGET_CAPACITY}). System pristine.`);
    return;
  }

  console.log(`[Harvester] Queue below minimum volume floor (${currentCount} < ${TARGET_CAPACITY}). Populating to floor...`);
  await populateQueueToFloor();
}

if (process.argv[1] && process.argv[1].endsWith('harvest-staging.mjs')) {
  harvestStaging()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[Harvester] Fatal error:', err);
      process.exit(1);
    });
}
