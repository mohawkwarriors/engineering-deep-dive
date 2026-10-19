import fs from 'fs';
import path from 'path';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

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
 * Saves the central curation memory bank.
 */
export function saveCurationMemory(memory) {
  try {
    fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`[saveCurationMemory] Error: ${err.message}`);
    return false;
  }
}

/**
 * Resolves an issue JSON file from issueId (e.g. "#005", "005", "5").
 */
export function loadIssueData(issueId) {
  try {
    const num = String(issueId).replace(/[^0-9]/g, '').padStart(3, '0');
    const issueFile = path.join(TOPICS_JSON_PATH, `${num}.json`);
    if (fs.existsSync(issueFile)) {
      return JSON.parse(fs.readFileSync(issueFile, 'utf8'));
    }
  } catch {}
  return null;
}

/**
 * 1. TOPIC FITNESS SIGNALING
 * Records overall topic fitness, training preferred or penalized themes and vetoes.
 */
export function recordTopicFitness(issueId, fitness, feedbackNotes = '') {
  const memory = loadCurationMemory() || {};
  if (!memory.topics) memory.topics = { ratings_history: {}, preferred_themes: [], penalized_themes: [] };
  if (!memory.topics.ratings_history) memory.topics.ratings_history = {};

  const issueData = loadIssueData(issueId);
  const title = issueData?.title || `Issue ${issueId}`;
  const subject = issueData?.subject || 'Hardware';

  memory.topics.ratings_history[issueId] = {
    title,
    subject,
    fitness,
    score: fitness === 'unfit' ? 'down' : 'up',
    timestamp: new Date().toISOString(),
    feedback: feedbackNotes
  };

  if (fitness === 'unfit') {
    // Register as a negative veto constraint
    let vetoes = [];
    try {
      if (fs.existsSync(VETOES_PATH)) vetoes = JSON.parse(fs.readFileSync(VETOES_PATH, 'utf8'));
    } catch {}

    if (!vetoes.some(v => v.topic === title || v.title === title)) {
      vetoes.push({
        issueId,
        topic: title,
        subject,
        reason: feedbackNotes || 'Flagged as unfit/off-topic during editorial review',
        date: new Date().toISOString()
      });
      fs.writeFileSync(VETOES_PATH, JSON.stringify(vetoes, null, 2), 'utf8');
      console.log(`[feedback-learner] Added "${title}" to vetoes.json`);
    }

    if (feedbackNotes && !memory.topics.penalized_themes.includes(feedbackNotes)) {
      memory.topics.penalized_themes.push(feedbackNotes);
    }
  } else if (fitness === 'excellent' && feedbackNotes) {
    if (!memory.topics.preferred_themes.includes(feedbackNotes)) {
      memory.topics.preferred_themes.push(feedbackNotes);
    }
  }

  saveCurationMemory(memory);
  console.log(`[feedback-learner] Recorded Topic Fitness "${fitness}" for ${issueId} ("${title}")`);
  return memory;
}

/**
 * 2. TOPIC NAME & HEADLINE SIGNALING
 * Evaluates whether a title is strong, topic-first, or needs rephrasing.
 */
export function recordTitleCritique({ currentTitle, isApproved, suggestedTitle = '', reason = '' }) {
  const memory = loadCurationMemory() || {};
  if (!memory.titles) memory.titles = { preferred_patterns: [], penalized_patterns: [], critiques: [] };
  if (!memory.titles.critiques) memory.titles.critiques = [];
  if (!memory.titles.preferred_patterns) memory.titles.preferred_patterns = [];
  if (!memory.titles.penalized_patterns) memory.titles.penalized_patterns = [];

  memory.titles.critiques.push({
    current_title: currentTitle,
    is_approved: isApproved,
    suggested_title: suggestedTitle || null,
    reason,
    timestamp: new Date().toISOString()
  });

  if (!isApproved && reason) {
    const penaltyRule = `Avoid headline structure like "${currentTitle}": ${reason}`;
    if (!memory.titles.penalized_patterns.includes(penaltyRule)) {
      memory.titles.penalized_patterns.push(penaltyRule);
    }
  }

  if (suggestedTitle) {
    const prefRule = `Model headline after "${suggestedTitle}" (Topic-first engineering phrasing)`;
    if (!memory.titles.preferred_patterns.includes(prefRule)) {
      memory.titles.preferred_patterns.push(prefRule);
    }
  }

  saveCurationMemory(memory);
  console.log(`[feedback-learner] Recorded Title Critique for "${currentTitle}" (Approved: ${isApproved})`);
  return memory;
}

/**
 * 3. IMAGE QUALITY & ACCURACY SIGNALING
 * Registers positive reference photos or rejected exemplars with physical failure reasons.
 */
export function recordImageFeedback(titleOrFile, status, reason, topic = 'general') {
  const memory = loadCurationMemory() || {};
  if (!memory.images) memory.images = { positive_exemplars: [], rejected_exemplars: [], placement_rules: [] };
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

  saveCurationMemory(memory);
  return memory;
}

/**
 * 3B. IMAGE PLACEMENT & POSITIONING SIGNALING
 * Enforces rules on where images are anchored in the article flow.
 */
export function recordImagePlacement(ruleOrObservation) {
  const memory = loadCurationMemory() || {};
  if (!memory.images) memory.images = { positive_exemplars: [], rejected_exemplars: [], placement_rules: [] };
  if (!memory.images.placement_rules) memory.images.placement_rules = [];

  if (!memory.images.placement_rules.includes(ruleOrObservation)) {
    memory.images.placement_rules.push(ruleOrObservation);
    saveCurationMemory(memory);
    console.log(`[feedback-learner] Added Image Placement Rule: "${ruleOrObservation}"`);
  }
  return memory;
}

/**
 * 4. GENERATED GRAPHIC VS REAL PHOTO DECISION SIGNALING
 * Teaches the model when an SVG schematic was the right choice vs when a real photo was required.
 */
export function recordMediaFormatChoice({ topic = 'general', element = '', formatChoice, reason = '' }) {
  const memory = loadCurationMemory() || {};
  if (!memory.media_format_decisions) {
    memory.media_format_decisions = {
      prefer_real_photos_when: [],
      prefer_generated_schematics_when: [],
      format_critiques: []
    };
  }
  if (!memory.media_format_decisions.format_critiques) memory.media_format_decisions.format_critiques = [];
  if (!memory.media_format_decisions.prefer_real_photos_when) memory.media_format_decisions.prefer_real_photos_when = [];
  if (!memory.media_format_decisions.prefer_generated_schematics_when) memory.media_format_decisions.prefer_generated_schematics_when = [];

  memory.media_format_decisions.format_critiques.push({
    topic,
    element,
    verdict: formatChoice,
    reason,
    timestamp: new Date().toISOString()
  });

  if (formatChoice === 'prefer_real_photo' && reason) {
    if (!memory.media_format_decisions.prefer_real_photos_when.includes(reason)) {
      memory.media_format_decisions.prefer_real_photos_when.push(reason);
    }
  } else if (formatChoice === 'prefer_svg_schematic' && reason) {
    if (!memory.media_format_decisions.prefer_generated_schematics_when.includes(reason)) {
      memory.media_format_decisions.prefer_generated_schematics_when.push(reason);
    }
  }

  saveCurationMemory(memory);
  console.log(`[feedback-learner] Recorded Media Format Decision: "${element || topic}" -> ${formatChoice}`);
  return memory;
}

/**
 * 4B. GRAPHIC LAYOUT & SCHEMATIC DESIGN RULES
 */
export function recordGraphicRule(rule) {
  const memory = loadCurationMemory() || {};
  if (!memory.graphics) memory.graphics = { mandatory_design_rules: [] };
  if (!memory.graphics.mandatory_design_rules) memory.graphics.mandatory_design_rules = [];

  if (!memory.graphics.mandatory_design_rules.includes(rule)) {
    memory.graphics.mandatory_design_rules.push(rule);
    saveCurationMemory(memory);
    console.log(`[feedback-learner] Added graphic design rule: "${rule}"`);
  }
  return memory;
}

/**
 * Adds an editorial theme to preferred or penalized list.
 */
export function recordThemePreference(theme, type = 'preferred') {
  const memory = loadCurationMemory() || {};
  if (!memory.topics) memory.topics = { preferred_themes: [], penalized_themes: [] };
  const key = type === 'preferred' ? 'preferred_themes' : 'penalized_themes';
  if (!memory.topics[key]) memory.topics[key] = [];

  if (!memory.topics[key].includes(theme)) {
    memory.topics[key].push(theme);
    saveCurationMemory(memory);
    console.log(`[feedback-learner] Added ${type} theme: "${theme}"`);
  }
  return memory;
}

/**
 * Backward compatibility wrapper for standard rate command.
 */
export function recordEditorialRating(issueId, score, feedbackNotes = '') {
  return recordTopicFitness(issueId, score === 'up' ? 'excellent' : 'unfit', feedbackNotes);
}

/**
 * Returns formatted prompt guidelines extracted from curation memory across all 5 dimensions.
 */
export function getLearnedEditorialDirectives() {
  const memory = loadCurationMemory();
  if (!memory) return { topicDirectives: '', titleDirectives: '', formatDirectives: '', graphicDirectives: '', imageDirectives: '', placementDirectives: '' };

  const preferred = (memory.topics?.preferred_themes || []).map(t => `  ✓ PREFERRED THEME: ${t}`).join('\n');
  const penalized = (memory.topics?.penalized_themes || []).map(t => `  ✗ PENALIZED THEME: ${t}`).join('\n');
  
  const titlePreferred = (memory.titles?.preferred_patterns || []).map(p => `  ✓ TITLE ARCHITECTURE: ${p}`).join('\n');
  const titlePenalized = (memory.titles?.penalized_patterns || []).map(p => `  ✗ TITLE PITFALL TO AVOID: ${p}`).join('\n');

  const formatRealPhoto = (memory.media_format_decisions?.prefer_real_photos_when || []).map(r => `  📸 USE REAL PHOTO (NOT SVG): ${r}`).join('\n');
  const formatSvg = (memory.media_format_decisions?.prefer_generated_schematics_when || []).map(s => `  📐 USE SVG SCHEMATIC (NOT PHOTO): ${s}`).join('\n');

  const graphics = (memory.graphics?.mandatory_design_rules || []).map(g => `  • ${g}`).join('\n');
  const rejectedImages = (memory.images?.rejected_exemplars || []).map(r => `  • REJECT IMAGE: ${r.title} — Reason: ${r.reason}`).join('\n');
  const placement = (memory.images?.placement_rules || []).map(p => `  • PLACEMENT: ${p}`).join('\n');

  return {
    topicDirectives: `LEARNED EDITORIAL TOPIC PREFERENCES (CONTINUOUS IN-CONTEXT TUNING):\n${preferred}\n${penalized}`,
    titleDirectives: `LEARNED HEADLINE & TITLE RULES:\n${titlePreferred}\n${titlePenalized}`,
    formatDirectives: `MEDIA FORMAT DECISION RULES (REAL HARDWARE PHOTO VS SVG SCHEMATIC):\n${formatRealPhoto}\n${formatSvg}`,
    imageDirectives: `REJECTED IMAGE EXEMPLARS (DO NOT SELECT SIMILAR CANDIDATES):\n${rejectedImages}`,
    placementDirectives: `IMAGE & SCHEMATIC PLACEMENT DISCIPLINE:\n${placement}`,
    graphicDirectives: `LEARNED GRAPHIC & SCHEMATIC DESIGN RULES:\n${graphics}`
  };
}

/**
 * Interactive Terminal Walkthrough: walks the user through the 4 critical evaluation signals.
 */
export async function runInteractiveReview(issueIdInput) {
  let issueId = issueIdInput;
  if (!issueId) {
    // Find latest issue in content/issues
    const files = fs.readdirSync(TOPICS_JSON_PATH).filter(f => f.match(/^\d+\.json$/)).sort();
    if (files.length > 0) {
      issueId = `#${files[files.length - 1].replace('.json', '')}`;
    } else {
      issueId = '#005';
    }
  }

  const issueData = loadIssueData(issueId);
  if (!issueData) {
    console.error(`Issue ${issueId} not found in content/issues.`);
    return;
  }

  const rl = readline.createInterface({ input, output });

  console.log('\n================================================================');
  console.log(`  ENGINEERING DEEP DIVE — MULTI-DIMENSIONAL EDITORIAL REVIEW`);
  console.log(`  Issue: ${issueId} | "${issueData.title}" (${issueData.subject || 'Hardware'})`);
  console.log('================================================================\n');

  try {
    // 1. Overall Topic Fitness
    console.log('--- 1. OVERALL TOPIC FITNESS ---');
    console.log('Does this topic fit an elite mechanical engineering deep-dive publication?');
    console.log('  [1] Excellent: Deep physical mechanics, DFM, first-principles rigor.');
    console.log('  [2] Marginal: Acceptable, but needs tighter engineering focus.');
    console.log('  [3] Unfit: Too generic, consumer review, lacks internal mechanics.');
    const fitChoice = (await rl.question('Select choice [1-3] (default 1): ')).trim() || '1';
    const fitness = fitChoice === '3' ? 'unfit' : fitChoice === '2' ? 'marginal' : 'excellent';
    const topicNotes = (await rl.question('Feedback / physical critique for this topic (optional): ')).trim();
    recordTopicFitness(issueId, fitness, topicNotes);

    // 2. Topic Name & Headline
    console.log('\n--- 2. TOPIC NAME & HEADLINE ---');
    console.log(`Current Headline: "${issueData.title}"`);
    console.log('Is this title strong, topic-first, and technically accurate?');
    console.log('  [1] Strong & Approved');
    console.log('  [2] Needs Rephrase / Too Vague / Clickbaity');
    const titleChoice = (await rl.question('Select choice [1-2] (default 1): ')).trim() || '1';
    if (titleChoice === '2') {
      const suggested = (await rl.question('What should the title be instead? ')).trim();
      const reason = (await rl.question('Why (what rule did the original title violate)? ')).trim();
      recordTitleCritique({ currentTitle: issueData.title, isApproved: false, suggestedTitle: suggested, reason });
    } else {
      recordTitleCritique({ currentTitle: issueData.title, isApproved: true });
    }

    // 3. Image Selection & Placement
    console.log('\n--- 3. HERO & SECTION IMAGES ---');
    const heroImg = issueData.hero_image || issueData.image || '';
    if (heroImg) {
      console.log(`Hero Image: ${heroImg}`);
      console.log('Quality & Subject Fit:');
      console.log('  [1] Authentic: Accurately showcases real internal hardware mechanism.');
      console.log('  [2] Poor / Rejected: Shows wrong subject, exterior casing, or low quality.');
      const imgQuality = (await rl.question('Select choice [1-2] (default 1): ')).trim() || '1';

      console.log('Placement & Position in Article:');
      console.log('  [1] Well Placed: Logical flow and visual rhythm.');
      console.log('  [2] Misplaced: Should be moved or positioned differently.');
      const imgPlacement = (await rl.question('Select choice [1-2] (default 1): ')).trim() || '1';

      if (imgQuality === '2') {
        const rejectReason = (await rl.question('Physical reason for rejecting this image: ')).trim();
        recordImageFeedback(heroImg, 'reject', rejectReason, issueData.subject?.toLowerCase());
      } else {
        recordImageFeedback(heroImg, 'approve', 'Authentic internal hardware view', issueData.subject?.toLowerCase());
      }

      if (imgPlacement === '2') {
        const placeRule = (await rl.question('Where should this image be positioned instead? ')).trim();
        recordImagePlacement(placeRule);
      }
    }

    // 4. Generated Graphic Quality vs Real Photo Decision
    console.log('\n--- 4. GENERATED GRAPHICS (SVG SCHEMATICS) VS REAL PHOTO DECISION ---');
    const figures = issueData.figures || [];
    if (figures.length > 0) {
      for (const fig of figures) {
        console.log(`\nFigure: ${fig.id || 'Figure'} — "${fig.caption || fig.title || 'Schematic'}"`);
        console.log('Media Format Decision:');
        console.log('  [1] SVG Schematic was the RIGHT medium for this concept.');
        console.log('  [2] SHOULD HAVE BEEN A REAL PHOTO (teardown, SEM micrograph, macro camera) instead!');
        const formatChoice = (await rl.question('Select choice [1-2] (default 1): ')).trim() || '1';

        console.log('Visual Quality Check:');
        console.log('  [1] Clean layout, good typography, clear flow paths.');
        console.log('  [2] Visual flaws: overlapping text, bad theme colors, or cluttered vectors.');
        const qualityChoice = (await rl.question('Select choice [1-2] (default 1): ')).trim() || '1';

        const formatVerdict = formatChoice === '2' ? 'prefer_real_photo' : 'prefer_svg_schematic';
        if (formatChoice === '2') {
          const photoReason = (await rl.question('Why should this have been a real photo instead? ')).trim();
          recordMediaFormatChoice({
            topic: issueData.subject?.toLowerCase(),
            element: fig.caption || fig.id,
            formatChoice: formatVerdict,
            reason: photoReason
          });
        }

        if (qualityChoice === '2') {
          const flawReason = (await rl.question('Describe the graphic design flaw to avoid in the future: ')).trim();
          recordGraphicRule(flawReason);
        }
      }
    } else {
      console.log('No figures or SVG schematics found in this issue file.');
    }

    console.log('\n================================================================');
    console.log('  ✓ EDITORIAL REVIEW COMPLETE — MODEL MEMORY BANK TRAINED!');
    console.log('================================================================\n');
  } finally {
    rl.close();
  }
}

// CLI Interface
if (process.argv[1] && process.argv[1].endsWith('feedback-learner.mjs')) {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === 'review') {
    const idArg = args[1] || args.find(a => a.startsWith('--id='))?.split('=')[1] || '';
    runInteractiveReview(idArg).catch(console.error);
  } else if (cmd === 'rate') {
    const idArg = args.find(a => a.startsWith('--id='))?.split('=')[1] || '#005';
    const scoreArg = args.find(a => a.startsWith('--score='))?.split('=')[1] || 'up';
    const noteArg = args.find(a => a.startsWith('--note='))?.split('=')[1] || '';
    recordTopicFitness(idArg, scoreArg === 'down' ? 'unfit' : 'excellent', noteArg);
  } else if (cmd === 'title-critique') {
    const current = args.find(a => a.startsWith('--current='))?.split('=')[1] || '';
    const better = args.find(a => a.startsWith('--better='))?.split('=')[1] || '';
    const reason = args.find(a => a.startsWith('--reason='))?.split('=')[1] || '';
    recordTitleCritique({ currentTitle: current, isApproved: !better, suggestedTitle: better, reason });
  } else if (cmd === 'format-choice') {
    const topic = args.find(a => a.startsWith('--topic='))?.split('=')[1] || 'general';
    const element = args.find(a => a.startsWith('--element='))?.split('=')[1] || '';
    const format = args.find(a => a.startsWith('--format='))?.split('=')[1] || 'prefer_real_photo';
    const reason = args.find(a => a.startsWith('--reason='))?.split('=')[1] || '';
    recordMediaFormatChoice({ topic, element, formatChoice: format, reason });
  } else if (cmd === 'reject-image') {
    const titleArg = args.find(a => a.startsWith('--title='))?.split('=')[1] || '';
    const reasonArg = args.find(a => a.startsWith('--reason='))?.split('=')[1] || '';
    const topicArg = args.find(a => a.startsWith('--topic='))?.split('=')[1] || 'general';
    recordImageFeedback(titleArg, 'reject', reasonArg, topicArg);
  } else if (cmd === 'approve-image') {
    const fileArg = args.find(a => a.startsWith('--file='))?.split('=')[1] || '';
    const reasonArg = args.find(a => a.startsWith('--reason='))?.split('=')[1] || '';
    const topicArg = args.find(a => a.startsWith('--topic='))?.split('=')[1] || 'general';
    recordImageFeedback(fileArg, 'approve', reasonArg, topicArg);
  } else if (cmd === 'image-placement') {
    const ruleArg = args.find(a => a.startsWith('--rule='))?.split('=')[1] || '';
    recordImagePlacement(ruleArg);
  } else if (cmd === 'add-graphic-rule') {
    const ruleArg = args.find(a => a.startsWith('--rule='))?.split('=')[1] || '';
    recordGraphicRule(ruleArg);
  } else if (cmd === 'add-theme') {
    const themeArg = args.find(a => a.startsWith('--theme='))?.split('=')[1] || '';
    const typeArg = args.find(a => a.startsWith('--type='))?.split('=')[1] || 'preferred';
    recordThemePreference(themeArg, typeArg);
  } else {
    console.log('Learned Directives Overview:');
    const d = getLearnedEditorialDirectives();
    console.log(d.topicDirectives);
    console.log('\n' + d.titleDirectives);
    console.log('\n' + d.formatDirectives);
    console.log('\n' + d.imageDirectives);
    console.log('\n' + d.placementDirectives);
    console.log('\n' + d.graphicDirectives);
  }
}
