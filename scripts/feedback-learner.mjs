import fs from 'fs';
import path from 'path';

const MEMORY_PATH = path.resolve('content/curation-memory.json');
const VETOES_PATH = path.resolve('content/vetoes.json');
const TOPICS_JSON_PATH = path.resolve('content/issues');

/**
 * Loads the central curation memory bank.
 */
export function loadCurationMemory() {
  try {
    if (!fs.existsSync(MEMORY_PATH)) return null;
    return JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
  } catch (err) {
    console.warn(`[loadCurationMemory] Error: ${err.message}`);
    return null;
  }
}

/**
 * Records a user rating for an issue, updating both curation memory and vetoes.
 * @param {string} issueId e.g. "#005"
 * @param {'up'|'down'} score
 * @param {string} [feedbackNotes]
 */
export function recordEditorialRating(issueId, score, feedbackNotes = '') {
  const memory = loadCurationMemory() || { topics: { ratings_history: {}, preferred_themes: [], penalized_themes: [] } };
  
  // Find issue title and subject
  let title = `Issue ${issueId}`;
  let subject = 'Hardware';
  try {
    const num = issueId.replace('#', '').padStart(3, '0');
    const issueFile = path.join(TOPICS_JSON_PATH, `${num}.json`);
    if (fs.existsSync(issueFile)) {
      const issueData = JSON.parse(fs.readFileSync(issueFile, 'utf8'));
      title = issueData.title || title;
      subject = issueData.subject || subject;
    }
  } catch {}

  // Update history
  if (!memory.topics) memory.topics = { ratings_history: {}, preferred_themes: [], penalized_themes: [] };
  if (!memory.topics.ratings_history) memory.topics.ratings_history = {};

  memory.topics.ratings_history[issueId] = {
    title,
    subject,
    score,
    timestamp: new Date().toISOString(),
    feedback: feedbackNotes
  };

  // If marked down, automatically register as a veto constraint
  if (score === 'down') {
    let vetoes = [];
    try {
      if (fs.existsSync(VETOES_PATH)) {
        vetoes = JSON.parse(fs.readFileSync(VETOES_PATH, 'utf8'));
      }
    } catch {}
    
    if (!vetoes.some(v => v.topic === title || v.title === title)) {
      vetoes.push({
        issueId,
        topic: title,
        subject,
        reason: feedbackNotes || 'Rated down via reader telemetry',
        date: new Date().toISOString()
      });
      fs.writeFileSync(VETOES_PATH, JSON.stringify(vetoes, null, 2), 'utf8');
      console.log(`[feedback-learner] Added "${title}" to vetoes.json`);
    }
  }

  fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2), 'utf8');
  console.log(`[feedback-learner] Recorded rating "${score}" for ${issueId} ("${title}")`);
  return memory;
}

/**
 * Registers an image critique (positive exemplar or rejected exemplar).
 * @param {string} titleOrFile
 * @param {'approve'|'reject'} status
 * @param {string} reason Physical rationale for why this image succeeded or failed
 * @param {string} [topic]
 */
export function recordImageFeedback(titleOrFile, status, reason, topic = 'general') {
  const memory = loadCurationMemory() || {};
  if (!memory.images) memory.images = { positive_exemplars: [], rejected_exemplars: [] };
  if (!memory.images.positive_exemplars) memory.images.positive_exemplars = [];
  if (!memory.images.rejected_exemplars) memory.images.rejected_exemplars = [];

  if (status === 'approve') {
    memory.images.positive_exemplars.push({
      topic,
      file: titleOrFile,
      reason,
      added_at: new Date().toISOString()
    });
    console.log(`[feedback-learner] Added approved image exemplar: "${titleOrFile}"`);
  } else {
    memory.images.rejected_exemplars.push({
      title: titleOrFile,
      reason,
      topic,
      added_at: new Date().toISOString()
    });
    console.log(`[feedback-learner] Added rejected image exemplar: "${titleOrFile}" (${reason})`);
  }

  fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2), 'utf8');
  return memory;
}

/**
 * Adds a mandatory graphic layout or styling rule to curation memory.
 * @param {string} rule
 */
export function recordGraphicRule(rule) {
  const memory = loadCurationMemory() || {};
  if (!memory.graphics) memory.graphics = { mandatory_design_rules: [] };
  if (!memory.graphics.mandatory_design_rules) memory.graphics.mandatory_design_rules = [];

  if (!memory.graphics.mandatory_design_rules.includes(rule)) {
    memory.graphics.mandatory_design_rules.push(rule);
    fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2), 'utf8');
    console.log(`[feedback-learner] Added graphic design rule: "${rule}"`);
  }
  return memory;
}

/**
 * Adds an editorial theme to preferred or penalized list.
 * @param {string} theme
 * @param {'preferred'|'penalized'} type
 */
export function recordThemePreference(theme, type = 'preferred') {
  const memory = loadCurationMemory() || {};
  if (!memory.topics) memory.topics = { preferred_themes: [], penalized_themes: [] };
  const key = type === 'preferred' ? 'preferred_themes' : 'penalized_themes';
  if (!memory.topics[key]) memory.topics[key] = [];

  if (!memory.topics[key].includes(theme)) {
    memory.topics[key].push(theme);
    fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2), 'utf8');
    console.log(`[feedback-learner] Added ${type} theme: "${theme}"`);
  }
  return memory;
}

/**
 * Returns formatted prompt guidelines extracted from curation memory.
 */
export function getLearnedEditorialDirectives() {
  const memory = loadCurationMemory();
  if (!memory) return { topicDirectives: '', graphicDirectives: '', imageDirectives: '' };

  const preferred = (memory.topics?.preferred_themes || []).map(t => `  ✓ PREFERRED: ${t}`).join('\n');
  const penalized = (memory.topics?.penalized_themes || []).map(t => `  ✗ PENALIZED: ${t}`).join('\n');
  const graphics = (memory.graphics?.mandatory_design_rules || []).map(g => `  • ${g}`).join('\n');
  const rejectedImages = (memory.images?.rejected_exemplars || []).map(r => `  • REJECT: ${r.title} — Reason: ${r.reason}`).join('\n');

  return {
    topicDirectives: `LEARNED EDITORIAL PREFERENCES (CONTINUOUS IN-CONTEXT TUNING):\n${preferred}\n${penalized}`,
    graphicDirectives: `LEARNED GRAPHIC & SCHEMATIC DESIGN RULES:\n${graphics}`,
    imageDirectives: `REJECTED IMAGE EXEMPLARS (DO NOT SELECT SIMILAR CANDIDATES):\n${rejectedImages}`
  };
}

// CLI Interface
if (process.argv[1] && process.argv[1].endsWith('feedback-learner.mjs')) {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === 'rate') {
    const idArg = args.find(a => a.startsWith('--id='))?.split('=')[1] || '#005';
    const scoreArg = args.find(a => a.startsWith('--score='))?.split('=')[1] || 'up';
    const noteArg = args.find(a => a.startsWith('--note='))?.split('=')[1] || '';
    recordEditorialRating(idArg, scoreArg, noteArg);
  } else if (cmd === 'reject-image') {
    const titleArg = args.find(a => a.startsWith('--title='))?.split('=')[1] || '';
    const reasonArg = args.find(a => a.startsWith('--reason='))?.split('=')[1] || '';
    const topicArg = args.find(a => a.startsWith('--topic='))?.split('=')[1] || 'general';
    if (!titleArg || !reasonArg) {
      console.error('Usage: node scripts/feedback-learner.mjs reject-image --title="..." --reason="..." [--topic="..."]');
      process.exit(1);
    }
    recordImageFeedback(titleArg, 'reject', reasonArg, topicArg);
  } else if (cmd === 'approve-image') {
    const fileArg = args.find(a => a.startsWith('--file='))?.split('=')[1] || '';
    const reasonArg = args.find(a => a.startsWith('--reason='))?.split('=')[1] || '';
    const topicArg = args.find(a => a.startsWith('--topic='))?.split('=')[1] || 'general';
    if (!fileArg) {
      console.error('Usage: node scripts/feedback-learner.mjs approve-image --file="..." --reason="..." [--topic="..."]');
      process.exit(1);
    }
    recordImageFeedback(fileArg, 'approve', reasonArg, topicArg);
  } else if (cmd === 'add-graphic-rule') {
    const ruleArg = args.find(a => a.startsWith('--rule='))?.split('=')[1] || '';
    if (!ruleArg) {
      console.error('Usage: node scripts/feedback-learner.mjs add-graphic-rule --rule="..."');
      process.exit(1);
    }
    recordGraphicRule(ruleArg);
  } else if (cmd === 'add-theme') {
    const themeArg = args.find(a => a.startsWith('--theme='))?.split('=')[1] || '';
    const typeArg = args.find(a => a.startsWith('--type='))?.split('=')[1] || 'preferred';
    if (!themeArg) {
      console.error('Usage: node scripts/feedback-learner.mjs add-theme --theme="..." [--type=preferred|penalized]');
      process.exit(1);
    }
    recordThemePreference(themeArg, typeArg);
  } else {
    console.log('Learned Directives Overview:');
    const d = getLearnedEditorialDirectives();
    console.log(d.topicDirectives);
    console.log('\n' + d.graphicDirectives);
    console.log('\n' + d.imageDirectives);
  }
}
