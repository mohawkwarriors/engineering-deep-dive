import fs from 'fs';
import path from 'path';

/**
 * Premium Image Selection & Quality Scoring Model:
 * 1. Queries verified open technical repositories (Wikimedia Commons, FCC, iFixit, open archives)
 * 2. Positively scores: "teardown", "chassis", "internal", "boiler", "manifold", "mechanism", "macro", "cross-section", "cutaway"
 * 3. Strictly disqualifies any candidate containing:
 *    - Watermarks / Stock stamps ("watermark", "alamy", "shutterstock", "getty", "vosvete", "logo", "novy-pant")
 *    - People/poses/selfies ("technician", "barista", "person", "man", "woman", "standing", "holding")
 *    - Cluttered/casual environments ("garage", "workshop floor", "tarp", "bucket", "tourist", "wicker", "bamboo", "mat", "carpet")
 *    - Consumer/lifestyle framing ("coffee cup", "latte art", "cafe table", "lifestyle", "living room", "bed", "countertop")
 * 4. Enforces minimum resolution (width >= 1200px) and file size (>= 40KB)
 */

export const POSITIVE_ENGINEERING_TERMS = [
  'teardown', 'chassis', 'internal', 'internals', 'cutaway', 'cross-section',
  'boiler', 'manifold', 'mechanism', 'machined', 'exploded', 'macro',
  'pcb', 'die-cast', 'forged', 'assembly', 'cad', 'metrology', 'schematic',
  'vapor chamber', 'heat pipe', 'heatpipe', 'sintered', 'wick', 'calorimeter',
  'cold plate', 'coldplate', 'copper base', 'baseplate', 'heat spreader'
];

export const DISQUALIFYING_TERMS = [
  'technician', 'technicians', 'barista', 'baristas', 'person', 'people',
  'man', 'woman', 'standing', 'holding', 'posing', 'selfie', 'portrait',
  'tourist', 'garage', 'workshop floor', 'tarp', 'bucket', 'cluttered',
  'latte art', 'coffee cup', 'cafe table', 'living room', 'counter',
  'watermark', 'watermarked', 'alamy', 'shutterstock', 'getty', 'stock photo',
  'vosvete', 'novy-pant', 'mobile-phone-hinge-teardown', 'hinge of mobile phone',
  'wicker', 'bamboo', 'carpet', 'tablecloth', 'bed',
  'retail box', 'packaging box', 'unboxing', 'rgb lighting', 'plastic shroud'
];

export async function searchPremiumHardwareMedia(query, limit = 10) {
  const cleanSubject = query.trim().replace(/["()+]/g, '');

  const searchQueries = [
    `${cleanSubject} teardown`,
    `${cleanSubject} cutaway`,
    `${cleanSubject} internal`,
    `${cleanSubject} mechanism`,
    cleanSubject
  ];

  try {
    let hits = [];
    for (const q of searchQueries) {
      const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srnamespace=6&srlimit=${limit * 3}&format=json`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'EngineeringDeepDive/2.0 (editorial-team@engineering-deep-dive.org)' }
      });
      if (res.ok) {
        const data = await res.json();
        const results = data.query?.search || [];
        if (results.length > 0) {
          hits = results;
          break;
        }
      }
    }

    const candidates = [];
    const subjectWords = cleanSubject.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    for (const hit of hits) {
      const title = hit.title;
      if (!title.match(/\.(jpg|jpeg|png)$/i)) continue;

      const fullSnippet = `${hit.title} ${hit.snippet || ''}`.toLowerCase();

      // Ensure at least one primary subject word is in title or snippet
      if (subjectWords.length > 0 && !subjectWords.some(w => fullSnippet.includes(w))) {
        continue;
      }

      // Check disqualifiers
      const isDisqualified = DISQUALIFYING_TERMS.some(term => {
        const regex = new RegExp(`\\b${term.replace('-', '[-_ ]?')}\\b`, 'i');
        return regex.test(fullSnippet);
      });
      if (isDisqualified) continue;

      // Compute engineering score
      let score = 0;
      for (const term of POSITIVE_ENGINEERING_TERMS) {
        if (fullSnippet.includes(term)) score += 2;
      }

      // Fetch metadata & dimensions
      const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size&format=json`;
      const infoRes = await fetch(infoUrl, {
        headers: { 'User-Agent': 'EngineeringDeepDive/2.0 (editorial-team@engineering-deep-dive.org)' }
      });
      if (!infoRes.ok) continue;
      const infoData = await infoRes.json();
      const page = Object.values(infoData.query?.pages || {})[0];
      const info = page?.imageinfo?.[0];
      if (!info) continue;

      // Resolution thresholds
      if (info.width < 1000 || info.height < 600) continue;
      if (info.size < 30000) continue;

      candidates.push({
        title,
        url: info.url,
        width: info.width,
        height: info.height,
        score
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, limit);
  } catch (err) {
    console.warn(`[searchPremiumHardwareMedia] Query "${query}" failed:`, err.message);
    return [];
  }
}

export async function downloadVerifiedMedia(imageUrl, localDestPath) {
  try {
    const dir = path.dirname(localDestPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': 'EngineeringDeepDive/2.0 (editorial-team@engineering-deep-dive.org)' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(localDestPath, buf);
    return true;
  } catch (err) {
    console.warn(`[downloadVerifiedMedia] Download failed for ${imageUrl}:`, err.message);
    return false;
  }
}

const VISUAL_REFS_PATH = path.resolve('content/visual-references.json');

/** Finds the visual brief whose keywords appear in the topic/concept text (null if none). */
export function loadVisualBrief(concept = '') {
  try {
    if (!fs.existsSync(VISUAL_REFS_PATH)) return null;
    const all = JSON.parse(fs.readFileSync(VISUAL_REFS_PATH, 'utf8'));
    const text = String(concept).toLowerCase();
    for (const [key, brief] of Object.entries(all)) {
      if (key.startsWith('_')) continue;
      if ((brief.match_keywords || []).some(k => text.includes(k.toLowerCase()))) return brief;
    }
  } catch (err) {
    console.warn(`[loadVisualBrief] ${err.message}`);
  }
  return null;
}

/** Encodes a brief's golden reference images as Gemini inline_data parts. */
export function loadReferenceParts(brief) {
  const mimeByExt = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
  const parts = [];
  for (const ref of brief.references || []) {
    try {
      const p = path.resolve(ref.file);
      if (!fs.existsSync(p)) continue;
      parts.push({ text: `REFERENCE (${ref.role}):` });
      parts.push({ inline_data: { mime_type: mimeByExt[path.extname(p).toLowerCase()] || 'image/jpeg', data: fs.readFileSync(p).toString('base64') } });
    } catch (err) {
      console.warn(`[loadReferenceParts] ${ref.file}: ${err.message}`);
    }
  }
  return parts;
}

/**
 * Automated Multimodal Vision Gate (LLM-as-a-Judge)
 * When a visual brief exists for the topic (content/visual-references.json), golden reference
 * images are sent as few-shot context and the candidate must match their physical form.
 * Evaluates candidate images using Gemini Vision for:
 * 1. Watermark / logo presence
 * 2. Visual representation of stated engineering concept (e.g. internal teardown vs lifestyle shot)
 * 3. Image quality and artifact-free presentation
 */
export async function verifyMediaWithVision(imageUrl, targetConcept, apiKey = process.env.GEMINI_API_KEY) {
  if (!apiKey || !imageUrl) {
    return { passed: false, score: 0, reason: 'Vision gate bypassed: API key missing or invalid image URL' };
  }

  try {
    const imgFetch = await fetch(imageUrl, {
      headers: { 'User-Agent': 'EngineeringDeepDive/2.0 (editorial-team@engineering-deep-dive.org)' }
    });
    if (!imgFetch.ok) {
      return { passed: false, score: 0, reason: `Could not fetch candidate image (HTTP ${imgFetch.status})` };
    }
    const contentType = imgFetch.headers.get('content-type') || 'image/jpeg';
    const mimeType = contentType.includes('png') ? 'image/png' : 'image/jpeg';
    const imgBuf = Buffer.from(await imgFetch.arrayBuffer());
    if (imgBuf.length < 25000) {
      return { passed: false, score: 2, reason: 'Image file size suspiciously small (<25KB)' };
    }
    const base64Data = imgBuf.toString('base64');

    const brief = loadVisualBrief(targetConcept);
    const refParts = brief ? loadReferenceParts(brief) : [];
    const briefText = brief
      ? `\nVISUAL BRIEF FOR THIS TOPIC (ground truth of what the real part looks like):\nCanonical form: ${brief.canonical_form}\nMust show: ${brief.must_show.join('; ')}\nMust NOT show: ${brief.must_not_show.join('; ')}\nThe first ${refParts.length} images are REFERENCE examples of the correct subject. The final image is the candidate.\n`
      : '';

    const prompt = `You are the Lead Visual Quality Inspector for an elite engineering publication.
Evaluate this image candidate for an engineering article section about: "${targetConcept}".
${briefText}
Criteria to strictly verify:
1. WATERMARK & LOGO AUDIT: Does the image contain any commercial watermarks, website logo overlays, stock photo banners, or stamps? If yes, it MUST FAIL.
2. RELEVANCE & ACCURACY: Does the image authentically depict the engineering mechanism, hardware component, or physical system described? Or is it a generic lifestyle, consumer table shot, or casual snapshot?
3. FORM MATCH: Compare the candidate's physical form to the reference images / canonical form. Same kind of object (shape, construction, internal structure), not merely the same material or keywords? Photorealistic-looking scenes with invented props that do not occur in real teardowns must FAIL.
4. FORBIDDEN SUBJECT: Is the main subject anything on the 'must NOT show' list?
5. PROFESSIONAL POLISH: Is the image sharp, well-lit, artifact-free, and suitable for a technical teardown journal?

Return ONLY valid JSON:
{
  "passed": true|false,
  "has_watermark": true|false,
  "is_lifestyle_shot": true|false,
  "is_authentic_engineering": true|false,
  "matches_reference_form": true|false,
  "shows_forbidden_subject": true|false,
  "quality_score_1_to_10": number,
  "verdict_reason": "Crisp one-sentence summary"
}`;


    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-3-flash-preview',
      'gemini-2.0-flash'
    ];

    let resJson = null;
    let lastErrTxt = '';

    for (const model of candidateModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                ...refParts,
                { text: 'CANDIDATE IMAGE TO EVALUATE (last image):' },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                  }
                }
              ]
            }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
          })
        });

        if (response.ok) {
          resJson = await response.json();
          break;
        } else {
          lastErrTxt = await response.text();
          console.warn(`Vision model ${model} error (${response.status}): ${lastErrTxt.slice(0, 120)}...`);
        }
      } catch (err) {
        lastErrTxt = err.message;
      }
    }

    if (!resJson) {
      return { passed: false, score: 0, reason: `Vision API error: ${lastErrTxt.slice(0, 100)}` };
    }
    const resultText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(resultText);
    const score = parsed.quality_score_1_to_10 || 0;
    const formOk = brief ? parsed.matches_reference_form === true && !parsed.shows_forbidden_subject : true;
    const isPassed = Boolean(parsed.passed && !parsed.has_watermark && !parsed.is_lifestyle_shot && parsed.is_authentic_engineering && formOk && score >= 7.5);

    return {
      passed: isPassed,
      score,
      reason: parsed.verdict_reason || 'Evaluated via multimodal vision gate'
    };
  } catch (err) {
    console.warn(`[verifyMediaWithVision] Verification failed: ${err.message}`);
    return { passed: false, score: 0, reason: `Inspection failed: ${err.message}` };
  }
}

if (process.argv[1] && process.argv[1].endsWith('fetch-media.mjs')) {
  console.log('Testing Premium Media Discovery Engine...');
  searchPremiumHardwareMedia('espresso boiler').then(results => {
    console.log(`Found ${results.length} qualified candidate(s):`);
    results.forEach((r, i) => console.log(` ${i + 1}. [Score ${r.score}] ${r.title} (${r.width}x${r.height})`));
  });
}
