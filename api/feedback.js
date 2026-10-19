import fs from 'fs';
import path from 'path';
import { selectHeroImage } from '../scripts/select-hero-image.mjs';

function getMemoryPath() {
  return path.resolve(process.cwd(), 'content/curation-memory.json');
}

function getVetoesPath() {
  return path.resolve(process.cwd(), 'content/vetoes.json');
}

function getIssueFile(issueId) {
  const num = String(issueId).replace(/[^0-9]/g, '').padStart(3, '0');
  const filePath = path.resolve(process.cwd(), 'content/issues', `${num}.json`);
  if (fs.existsSync(filePath)) return { num, filePath };
  return null;
}

function updateMarkdownMirror(issueNum, oldTitle, newTitle, newImageSrc = null) {
  try {
    const contentDir = path.resolve(process.cwd(), 'content');
    const mdFiles = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'));
    
    // Read the issue JSON to get the current article_html
    const issueFile = path.resolve(contentDir, 'issues', `${issueNum}.json`);
    if (!fs.existsSync(issueFile)) return;
    const issueData = JSON.parse(fs.readFileSync(issueFile, 'utf8'));

    for (const mdFile of mdFiles) {
      const fullPath = path.join(contentDir, mdFile);
      let content = fs.readFileSync(fullPath, 'utf8');

      // Check if this markdown file belongs to this issue
      if (content.includes(oldTitle) || content.includes(issueData.title) || mdFile.includes(issueNum)) {
        if (newTitle) {
          content = content.replace(new RegExp(oldTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newTitle);
        }
        if (newImageSrc) {
          // Replace hero image src in markdown
          content = content.replace(/(<img\s+src=")[^"]*?("-hero\.[^"]*?"[^>]*?>)/i, `$1${newImageSrc}$2`);
          content = content.replace(/(<img\s+class="hero-img"\s+src=")[^"]*?(")/i, `$1${newImageSrc}$2`);
        }
        // Keep in sync with article_html
        if (issueData.article_html) {
          content = issueData.article_html;
        }
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`[updateMarkdownMirror] Synchronized ${mdFile}`);
        break;
      }
    }
  } catch (err) {
    console.warn('[updateMarkdownMirror] Error:', err.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { action = 'full-review' } = req.body || {};
  const memPath = getMemoryPath();
  const vetoesPath = getVetoesPath();

  let memory = {};
  if (fs.existsSync(memPath)) {
    try {
      memory = JSON.parse(fs.readFileSync(memPath, 'utf8'));
    } catch {}
  }

  // ========================================================
  // ACTION 1: REPLACE IMAGE (Triggered when user clicks "Bad Image")
  // ========================================================
  if (action === 'replace-image') {
    const { issueId = '#005', currentImageSrc = '', reason = 'Marked as bad image by editor' } = req.body;
    console.log(`[api/feedback] Finding replacement image for issue ${issueId}...`);

    const issueInfo = getIssueFile(issueId);
    if (!issueInfo) {
      return res.status(404).json({ error: `Issue ${issueId} not found.` });
    }

    const issueData = JSON.parse(fs.readFileSync(issueInfo.filePath, 'utf8'));

    // 1. Record the bad image in rejected_exemplars so it is never chosen again
    if (!memory.images) memory.images = { positive_exemplars: [], rejected_exemplars: [], placement_rules: [] };
    if (!memory.images.rejected_exemplars) memory.images.rejected_exemplars = [];
    memory.images.rejected_exemplars.push({
      title: currentImageSrc || issueData.hero_image || `Image for ${issueData.title}`,
      reason,
      topic: issueData.subject?.toLowerCase() || 'hardware',
      added_at: new Date().toISOString()
    });
    fs.writeFileSync(memPath, JSON.stringify(memory, null, 2), 'utf8');

    // 2. Query multi-source engine & Gemini Vision for a brand new image
    try {
      const result = await selectHeroImage({
        title: issueData.title,
        subject: issueData.subject
      });

      if (result && result.src) {
        const oldSrc = issueData.hero_image || '';
        issueData.hero_image = result.src;
        if (issueData.article_html && oldSrc) {
          issueData.article_html = issueData.article_html.replace(oldSrc, result.src);
        }
        fs.writeFileSync(issueInfo.filePath, JSON.stringify(issueData, null, 2), 'utf8');
        updateMarkdownMirror(issueInfo.num, issueData.title, null, result.src);

        return res.status(200).json({
          status: 'success',
          action: 'replace-image',
          newImageSrc: result.src,
          score: result.score || 9.0,
          reason: result.reason || 'Verified authentic engineering teardown'
        });
      } else {
        return res.status(200).json({
          status: 'fallback',
          action: 'replace-image',
          message: 'No higher-scoring image found online; preserved current reference.'
        });
      }
    } catch (err) {
      console.error('[api/feedback] replace-image error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ========================================================
  // ACTION 2: RENAME ISSUE & TWEAK SUBJECT LIVE
  // ========================================================
  if (action === 'rename-issue') {
    const { issueId = '#005', newTitle = '', newSubject = '', critiqueNotes = '' } = req.body;
    console.log(`[api/feedback] Renaming issue ${issueId} to "${newTitle}"...`);

    const issueInfo = getIssueFile(issueId);
    if (!issueInfo) {
      return res.status(404).json({ error: `Issue ${issueId} not found.` });
    }

    const issueData = JSON.parse(fs.readFileSync(issueInfo.filePath, 'utf8'));
    const oldTitle = issueData.title;

    if (newTitle && newTitle.trim()) {
      issueData.title = newTitle.trim();
      // Also update h1 inside article_html if present
      if (issueData.article_html) {
        issueData.article_html = issueData.article_html.replace(
          /(<h1\b[^>]*>)([\s\S]*?)(<\/h1>)/i,
          `$1${newTitle.trim()}$3`
        );
      }
    }

    if (newSubject && newSubject.trim()) {
      issueData.subject = newSubject.trim();
    }

    fs.writeFileSync(issueInfo.filePath, JSON.stringify(issueData, null, 2), 'utf8');
    updateMarkdownMirror(issueInfo.num, oldTitle, newTitle.trim());

    // Train curation memory
    if (!memory.titles) memory.titles = { preferred_patterns: [], penalized_patterns: [], critiques: [] };
    if (!memory.titles.critiques) memory.titles.critiques = [];
    memory.titles.critiques.push({
      issueId,
      old_title: oldTitle,
      new_title: newTitle.trim(),
      editorial_rule: critiqueNotes,
      timestamp: new Date().toISOString()
    });

    if (newTitle) {
      const prefRule = critiqueNotes 
        ? `Model headline after "${newTitle.trim()}": ${critiqueNotes}`
        : `Model headline after "${newTitle.trim()}" (Topic-first engineering phrasing)`;
      if (!memory.titles.preferred_patterns.includes(prefRule)) {
        memory.titles.preferred_patterns.push(prefRule);
      }
      const penalizeRule = `Avoid headline structure like "${oldTitle}": Replaced by editor with "${newTitle.trim()}"`;
      if (!memory.titles.penalized_patterns.includes(penalizeRule)) {
        memory.titles.penalized_patterns.push(penalizeRule);
      }
    }

    if (critiqueNotes && !memory.topics.preferred_themes.includes(critiqueNotes)) {
      if (critiqueNotes.toLowerCase().includes('tangent') || critiqueNotes.toLowerCase().includes('avoid')) {
        if (!memory.topics.penalized_themes.includes(critiqueNotes)) memory.topics.penalized_themes.push(critiqueNotes);
      } else {
        memory.topics.preferred_themes.push(critiqueNotes);
      }
    }

    fs.writeFileSync(memPath, JSON.stringify(memory, null, 2), 'utf8');

    return res.status(200).json({
      status: 'success',
      action: 'rename-issue',
      newTitle: issueData.title,
      newSubject: issueData.subject
    });
  }

  // ========================================================
  // ACTION 3: SCORE COMPONENT (Topic fitness, title quality, figure format, etc.)
  // ========================================================
  if (action === 'score-component') {
    const { issueId = '#005', componentType, value, reason = '' } = req.body;
    console.log(`[api/feedback] Scoring component ${componentType} -> ${value}`);

    const issueInfo = getIssueFile(issueId);
    const issueData = issueInfo ? JSON.parse(fs.readFileSync(issueInfo.filePath, 'utf8')) : null;

    if (componentType === 'topic_fitness') {
      if (!memory.topics) memory.topics = { ratings_history: {}, preferred_themes: [], penalized_themes: [] };
      memory.topics.ratings_history[issueId] = {
        fitness: value,
        score: value === 'unfit' ? 'down' : 'up',
        timestamp: new Date().toISOString(),
        feedback: reason
      };
      if (value === 'unfit') {
        if (reason && !memory.topics.penalized_themes.includes(reason)) memory.topics.penalized_themes.push(reason);
        // Add to vetoes
        if (fs.existsSync(vetoesPath)) {
          try {
            const vetoes = JSON.parse(fs.readFileSync(vetoesPath, 'utf8'));
            if (!vetoes.some(v => v.issueId === issueId)) {
              vetoes.push({ issueId, topic: issueData?.title || issueId, reason, date: new Date().toISOString() });
              fs.writeFileSync(vetoesPath, JSON.stringify(vetoes, null, 2), 'utf8');
            }
          } catch {}
        }
      } else if (value === 'excellent' && reason) {
        if (!memory.topics.preferred_themes.includes(reason)) memory.topics.preferred_themes.push(reason);
      }
    } else if (componentType === 'title_quality') {
      if (!memory.titles) memory.titles = { preferred_patterns: [], penalized_patterns: [], critiques: [] };
      if (value === 'approved' && issueData?.title) {
        const approvedRule = `Model headline after "${issueData.title}" (Approved title exemplar)`;
        if (!memory.titles.preferred_patterns.includes(approvedRule)) {
          memory.titles.preferred_patterns.push(approvedRule);
        }
      }
    } else if (componentType === 'figure_format') {
      if (!memory.media_format_decisions) memory.media_format_decisions = { prefer_real_photos_when: [], prefer_generated_schematics_when: [], format_critiques: [] };
      memory.media_format_decisions.format_critiques.push({
        issueId,
        verdict: value, // 'prefer_real_photo' | 'prefer_svg_schematic'
        reason,
        timestamp: new Date().toISOString()
      });
      if (value === 'prefer_real_photo' && reason && !memory.media_format_decisions.prefer_real_photos_when.includes(reason)) {
        memory.media_format_decisions.prefer_real_photos_when.push(reason);
      }
    }

    fs.writeFileSync(memPath, JSON.stringify(memory, null, 2), 'utf8');
    return res.status(200).json({ status: 'success', action: 'score-component' });
  }

  // ========================================================
  // FALLBACK: FULL REVIEW PAYLOAD
  // ========================================================
  const {
    issueId = '#005',
    topicFitness = 'excellent',
    topicNotes = '',
    titleApproved = true,
    suggestedTitle = '',
    imageStatus = 'approve',
    imageReason = '',
    formatChoices = []
  } = req.body;

  if (!memory.topics) memory.topics = { ratings_history: {}, preferred_themes: [], penalized_themes: [] };
  memory.topics.ratings_history[issueId] = {
    fitness: topicFitness,
    score: topicFitness === 'unfit' ? 'down' : 'up',
    timestamp: new Date().toISOString(),
    feedback: topicNotes
  };

  if (!titleApproved && suggestedTitle) {
    if (!memory.titles) memory.titles = { preferred_patterns: [], penalized_patterns: [], critiques: [] };
    const prefRule = `Model headline after "${suggestedTitle}" (Topic-first engineering phrasing)`;
    if (!memory.titles.preferred_patterns.includes(prefRule)) memory.titles.preferred_patterns.push(prefRule);
  }

  if (fs.existsSync(memPath)) {
    fs.writeFileSync(memPath, JSON.stringify(memory, null, 2), 'utf8');
  }

  return res.status(200).json({ status: 'success', issueId });
}
