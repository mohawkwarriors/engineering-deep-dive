import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const {
    issueId = '#005',
    topicFitness = 'excellent',
    topicNotes = '',
    titleApproved = true,
    suggestedTitle = '',
    titleReason = '',
    imageFile = '',
    imageStatus = 'approve',
    imageReason = '',
    imagePlacement = '',
    formatChoices = [],
    graphicRules = []
  } = req.body || {};

  console.log(`[api/feedback] Processing review for issue ${issueId}`);

  // 1. If running locally with disk access (e.g. local dev server):
  const memPath = path.resolve(process.cwd(), 'content/curation-memory.json');
  const vetoesPath = path.resolve(process.cwd(), 'content/vetoes.json');

  if (fs.existsSync(memPath)) {
    try {
      const memory = JSON.parse(fs.readFileSync(memPath, 'utf8'));

      // Topic fitness
      if (!memory.topics) memory.topics = { ratings_history: {}, preferred_themes: [], penalized_themes: [] };
      if (!memory.topics.ratings_history) memory.topics.ratings_history = {};
      memory.topics.ratings_history[issueId] = {
        fitness: topicFitness,
        score: topicFitness === 'unfit' ? 'down' : 'up',
        timestamp: new Date().toISOString(),
        feedback: topicNotes
      };
      if (topicFitness === 'unfit' && topicNotes && !memory.topics.penalized_themes.includes(topicNotes)) {
        memory.topics.penalized_themes.push(topicNotes);
      } else if (topicFitness === 'excellent' && topicNotes && !memory.topics.preferred_themes.includes(topicNotes)) {
        memory.topics.preferred_themes.push(topicNotes);
      }

      // Title
      if (!memory.titles) memory.titles = { preferred_patterns: [], penalized_patterns: [], critiques: [] };
      if (!titleApproved && suggestedTitle) {
        memory.titles.critiques.push({
          issueId,
          suggested_title: suggestedTitle,
          reason: titleReason,
          timestamp: new Date().toISOString()
        });
        const prefRule = `Model headline after "${suggestedTitle}" (Topic-first engineering phrasing)`;
        if (!memory.titles.preferred_patterns.includes(prefRule)) {
          memory.titles.preferred_patterns.push(prefRule);
        }
      }

      // Image
      if (!memory.images) memory.images = { positive_exemplars: [], rejected_exemplars: [], placement_rules: [] };
      if (imageFile && imageStatus === 'reject') {
        memory.images.rejected_exemplars.push({
          title: imageFile,
          reason: imageReason || 'Rejected via editorial review panel',
          added_at: new Date().toISOString()
        });
      } else if (imageFile && imageStatus === 'approve') {
        memory.images.positive_exemplars.push({
          file: imageFile,
          reason: imageReason || 'Approved authentic teardown',
          added_at: new Date().toISOString()
        });
      }
      if (imagePlacement && !memory.images.placement_rules.includes(imagePlacement)) {
        memory.images.placement_rules.push(imagePlacement);
      }

      // Format decisions (Real Photo vs SVG)
      if (!memory.media_format_decisions) {
        memory.media_format_decisions = { prefer_real_photos_when: [], prefer_generated_schematics_when: [], format_critiques: [] };
      }
      for (const fc of formatChoices) {
        if (fc.verdict === 'prefer_real_photo' && fc.reason) {
          if (!memory.media_format_decisions.prefer_real_photos_when.includes(fc.reason)) {
            memory.media_format_decisions.prefer_real_photos_when.push(fc.reason);
          }
        }
      }

      fs.writeFileSync(memPath, JSON.stringify(memory, null, 2), 'utf8');

      // Vetoes update if unfit
      if (topicFitness === 'unfit' && fs.existsSync(vetoesPath)) {
        try {
          const vetoes = JSON.parse(fs.readFileSync(vetoesPath, 'utf8'));
          if (!vetoes.some(v => v.issueId === issueId)) {
            vetoes.push({ issueId, reason: topicNotes, date: new Date().toISOString() });
            fs.writeFileSync(vetoesPath, JSON.stringify(vetoes, null, 2), 'utf8');
          }
        } catch {}
      }

      return res.status(200).json({ status: 'success', storage: 'local_disk', issueId });
    } catch (err) {
      console.warn('[api/feedback] Local write failed:', err.message);
    }
  }

  // 2. If running deployed on Vercel (using GitHub Contents API):
  const token = process.env.GITHUB_TOKEN || process.env.GH_PAT;
  const owner = 'mohawkwarriors';
  const repo = 'engineering-deep-dive';

  if (token) {
    try {
      const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/content/curation-memory.json`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'DeepDive-Review-Bot'
        }
      });

      if (fileRes.ok) {
        const fileData = await fileRes.json();
        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        const memory = JSON.parse(content);

        // Update topic ratings
        if (!memory.topics) memory.topics = { ratings_history: {}, preferred_themes: [], penalized_themes: [] };
        if (!memory.topics.ratings_history) memory.topics.ratings_history = {};
        memory.topics.ratings_history[issueId] = {
          fitness: topicFitness,
          score: topicFitness === 'unfit' ? 'down' : 'up',
          timestamp: new Date().toISOString(),
          feedback: topicNotes
        };
        if (topicFitness === 'unfit' && topicNotes && !memory.topics.penalized_themes.includes(topicNotes)) {
          memory.topics.penalized_themes.push(topicNotes);
        } else if (topicFitness === 'excellent' && topicNotes && !memory.topics.preferred_themes.includes(topicNotes)) {
          memory.topics.preferred_themes.push(topicNotes);
        }

        // Update titles
        if (!titleApproved && suggestedTitle) {
          if (!memory.titles) memory.titles = { preferred_patterns: [], penalized_patterns: [], critiques: [] };
          const prefRule = `Model headline after "${suggestedTitle}" (Topic-first engineering phrasing)`;
          if (!memory.titles.preferred_patterns.includes(prefRule)) {
            memory.titles.preferred_patterns.push(prefRule);
          }
        }

        // Format choices
        if (!memory.media_format_decisions) {
          memory.media_format_decisions = { prefer_real_photos_when: [], prefer_generated_schematics_when: [], format_critiques: [] };
        }
        for (const fc of formatChoices) {
          if (fc.verdict === 'prefer_real_photo' && fc.reason) {
            if (!memory.media_format_decisions.prefer_real_photos_when.includes(fc.reason)) {
              memory.media_format_decisions.prefer_real_photos_when.push(fc.reason);
            }
          }
        }

        const updatedBase64 = Buffer.from(JSON.stringify(memory, null, 2)).toString('base64');
        await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/content/curation-memory.json`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'DeepDive-Review-Bot'
          },
          body: JSON.stringify({
            message: `chore: editorial review feedback for ${issueId}`,
            content: updatedBase64,
            sha: fileData.sha
          })
        });

        return res.status(200).json({ status: 'success', storage: 'github_commit', issueId });
      }
    } catch (err) {
      console.warn('[api/feedback] GitHub commit failed:', err.message);
    }
  }

  // Fallback return if running static without credentials
  return res.status(200).json({ status: 'success', storage: 'client_cached', issueId });
}
