import fs from 'fs';
import path from 'path';
import {
  loadVisualBrief,
  searchPremiumHardwareMedia,
  downloadVerifiedMedia,
  verifyMediaWithVision
} from './fetch-media.mjs';

/**
 * Hero image selection that works for ANY topic.
 *
 * Order of trust (highest first):
 *   1. Human-curated references marked "hero_ok" in content/visual-references.json
 *   2. Web candidates that pass the reference-grounded vision gate
 *   3. Nothing -> returns null so the caller fails closed (flags for human review)
 *      instead of silently shipping a bad image.
 *
 * Every topic gets a visual brief. If none exists, one is auto-drafted from the title,
 * so the gate always has a "what should this look like / not look like" rubric.
 */

const REFS_PATH = path.resolve('content/visual-references.json');
const MODELS = ['gemini-3.8-flash', 'gemini-2.5-flash'];
const slugify = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48);

async function geminiJson(prompt, apiKey) {
  for (const model of MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
        })
      });
      if (!res.ok) continue;
      const json = await res.json();
      return JSON.parse(json.candidates?.[0]?.content?.parts?.[0]?.text);
    } catch { /* try next model */ }
  }
  return null;
}

/** Returns an existing brief for the topic, or drafts + persists one (flagged auto_generated). */
export async function ensureVisualBrief(title, subject, apiKey) {
  const existing = loadVisualBrief(title);
  if (existing) return existing;
  if (!apiKey) return null;

  const drafted = await geminiJson(`You write visual briefs for an engineering newsletter's image selector.
Topic: "${title}" (${subject || 'hardware'}).
Describe what the REAL hardware looks like so an image can be judged against it. Distinguish it from look-alike objects that share keywords.
Return ONLY JSON:
{
  "match_keywords": ["3-6 lowercase phrases likely in the topic title"],
  "canonical_form": "one sentence: physical form, construction, scale, typical presentation",
  "must_show": ["3-5 concrete visual features"],
  "must_not_show": ["3-5 look-alike or low-quality subjects to reject (similar parts, full consumer products, clutter, AI-invented scenes)"],
  "search_queries": ["3-5 web image search phrases for real teardown, exploded-view, cutaway or lab photos of exactly this part"]
}`, apiKey);
  if (!drafted?.canonical_form) return null;

  const brief = { ...drafted, auto_generated: true, references: [] };
  const all = fs.existsSync(REFS_PATH) ? JSON.parse(fs.readFileSync(REFS_PATH, 'utf8')) : {};
  all[slugify(title)] = brief;
  fs.writeFileSync(REFS_PATH, JSON.stringify(all, null, 2), 'utf8');
  console.log(`[hero-image] Drafted visual brief for "${title}" (review/improve in content/visual-references.json)`);
  return brief;
}

/** @returns {Promise<null | {src:string, source:'curated'|'verified-web', score?:number, reason?:string}>} */
export async function selectHeroImage({ title, subject, apiKey = process.env.GEMINI_API_KEY }) {
  const brief = await ensureVisualBrief(title, subject, apiKey);
  const base = slugify(title);

  // 1. Human-curated references explicitly approved as hero images
  const curated = (brief?.references || []).find(r => r.hero_ok && fs.existsSync(r.file));
  if (curated) {
    const dest = `images/${base}-hero${path.extname(curated.file)}`;
    fs.copyFileSync(curated.file, dest);
    return { src: dest.replace(/\\/g, '/'), source: 'curated' };
  }

  // 2. Web candidates, judged against the brief + references
  if (!apiKey) return null;
  const queries = [...(brief?.search_queries || []), title];
  const concept = `${title} ${(brief?.match_keywords || []).join(' ')}`;
  const seen = new Set();
  let best = null;

  for (const q of queries.slice(0, 6)) {
    const hits = await searchPremiumHardwareMedia(q, 4);
    for (const hit of hits) {
      if (seen.has(hit.url)) continue;
      seen.add(hit.url);
      const verdict = await verifyMediaWithVision(hit.url, concept, apiKey);
      console.log(`[hero-image] ${verdict.passed ? 'PASS' : 'fail'} (${verdict.score}) ${hit.title} - ${verdict.reason}`);
      if (verdict.passed && (!best || verdict.score > best.score)) best = { ...verdict, url: hit.url };
    }
    if (best && best.score >= 8.5) break;
  }
  if (!best) return null;

  const ext = (path.extname(new URL(best.url).pathname) || '.jpg').toLowerCase();
  const dest = `images/${base}-hero${ext}`;
  if (!(await downloadVerifiedMedia(best.url, dest))) return null;
  return { src: dest, source: 'verified-web', score: best.score, reason: best.reason };
}
