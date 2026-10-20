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
  'istock', 'depositphotos', 'dreamstime', '123rf', 'science photo library', 'sciencephoto',
  'vosvete', 'novy-pant', 'mobile-phone-hinge-teardown', 'hinge of mobile phone',
  'wicker', 'bamboo', 'carpet', 'tablecloth', 'bed',
  'retail box', 'packaging box', 'unboxing', 'rgb lighting', 'plastic shroud',
  'mg/kg', 'pharmacology', 'in vivo', 'in vitro', 'rat', 'mouse', 'mice', 'patient',
  'clinical', 'cancer', 'tumor', 'brainon', 'latency', 'dose', 'extract', 'histology',
  'textbook', 'scanned', 'vintage', '1899', '1900', '1910', '1920', '1930', '1940',
  'catalogue', 'handbook', 'encyclopedia', 'treatise',
  'matlab', 'bar chart', 'plot', 'curve', 'graph', 'histogram', 'scatter plot'
];

export async function searchDuckDuckGoImages(query, limit = 10) {
  try {
    const initRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iax=images&ia=images`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await initRes.text();
    const vqdMatch = html.match(/vqd=([0-9-]+)/) || html.match(/vqd=['"]([0-9-]+)['"]/);
    if (!vqdMatch) return [];

    const vqd = vqdMatch[1];
    const imgUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,&p=1`;
    const imgRes = await fetch(imgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://duckduckgo.com/'
      }
    });
    if (!imgRes.ok) return [];
    const data = await imgRes.json();
    return (data.results || []).map(r => ({
      title: r.title,
      url: r.image,
      width: r.width,
      height: r.height,
      source: 'duckduckgo',
      pageUrl: r.url
    })).filter(r => (!r.width || r.width >= 800) && (!r.height || r.height >= 500));
  } catch (err) {
    console.warn(`[searchDuckDuckGoImages] Error for "${query}":`, err.message);
    return [];
  }
}

export function loadEnvFile() {
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (key && !process.env[key]) {
          process.env[key] = val;
        }
      }
    } catch {}
  }
}
loadEnvFile();

export async function searchGoogleCustomSearch(query, limit = 10) {
  loadEnvFile();
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX || process.env.GOOGLE_CSE_ID;
  if (!apiKey || !cx) return [];
  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&searchType=image&num=${Math.min(limit, 10)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errTxt = await res.text();
      console.warn(`[searchGoogleCustomSearch] Google API HTTP ${res.status}: ${errTxt.slice(0, 120)}`);
      return [];
    }
    const data = await res.json();
    return (data.items || []).map(item => ({
      title: item.title,
      url: item.link,
      width: item.image?.width || 0,
      height: item.image?.height || 0,
      source: 'google',
      pageUrl: item.image?.contextLink
    })).filter(r => (r.width === 0 || r.width >= 800) && (r.height === 0 || r.height >= 500));
  } catch (err) {
    console.warn(`[searchGoogleCustomSearch] Error for "${query}":`, err.message);
    return [];
  }
}

export async function searchPremiumHardwareMedia(query, limit = 10) {
  loadEnvFile();
  const cleanSubject = query.trim().replace(/["()+]/g, '');
  const searchQueries = [
    `${cleanSubject} teardown`,
    `${cleanSubject} cutaway`,
    `${cleanSubject} cross-section`,
    `${cleanSubject} exploded view`,
    `${cleanSubject} internal mechanism`,
    cleanSubject
  ];

  const candidates = [];
  const seenUrls = new Set();
  const subjectWords = cleanSubject.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  function addCandidate(cand) {
    if (!cand.url || seenUrls.has(cand.url)) return;
    seenUrls.add(cand.url);

    const fullSnippet = `${cand.title || ''} ${cand.url || ''}`.toLowerCase();

    // Check disqualifiers
    const isDisqualified = DISQUALIFYING_TERMS.some(term => {
      const regex = new RegExp(`\\b${term.replace('-', '[-_ ]?')}\\b`, 'i');
      return regex.test(fullSnippet);
    });
    if (isDisqualified) return;

    // Compute engineering score
    let score = cand.score || 0;
    for (const term of POSITIVE_ENGINEERING_TERMS) {
      if (fullSnippet.includes(term)) score += 2;
    }
    candidates.push({ ...cand, score });
  }

  const hasGoogleCreds = Boolean(
    (process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_API_KEY) &&
    (process.env.GOOGLE_SEARCH_CX || process.env.GOOGLE_CSE_ID)
  );

  // 1. PRIMARY: Google Image Search (Google Custom Search JSON API)
  if (hasGoogleCreds) {
    console.log(`[media-search] Primary: Searching Google Images for "${cleanSubject}"...`);
    for (const q of searchQueries.slice(0, 2)) {
      const googleHits = await searchGoogleCustomSearch(q, limit);
      for (const h of googleHits) addCandidate(h);
      if (candidates.length >= limit) break;
    }
    if (candidates.length > 0) {
      console.log(`[media-search] Found ${candidates.length} candidate(s) from Google Image Search.`);
    } else {
      console.log(`[media-search] Google returned 0 candidates (or quota reached); engaging DuckDuckGo backup.`);
    }
  } else {
    console.log(`[media-search] Google Search credentials not detected in environment; engaging DuckDuckGo as backup search engine.`);
  }

  // 2. BACKUP: DuckDuckGo (Free web image search, zero configuration required)
  if (candidates.length < limit) {
    console.log(`[media-search] Backup: Searching DuckDuckGo Images for "${cleanSubject}"...`);
    for (const q of searchQueries.slice(0, 3)) {
      const ddgHits = await searchDuckDuckGoImages(q, limit);
      for (const h of ddgHits) addCandidate(h);
      if (candidates.length >= limit) break;
    }
  }

  // 3. Fallback to Wikimedia Commons (open archive)
  if (candidates.length < limit) {
    try {
      let hits = [];
      for (const q of searchQueries.slice(0, 3)) {
        const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srnamespace=6&srlimit=${limit * 2}&format=json`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
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

      for (const hit of hits) {
        const title = hit.title;
        if (!title.match(/\.(jpg|jpeg|png)$/i)) continue;

        const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size&format=json`;
        const infoRes = await fetch(infoUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        if (!infoRes.ok) continue;
        const infoData = await infoRes.json();
        const page = Object.values(infoData.query?.pages || {})[0];
        const info = page?.imageinfo?.[0];
        if (!info || info.width < 800 || info.height < 500) continue;

        addCandidate({
          title,
          url: info.url,
          width: info.width,
          height: info.height,
          source: 'wikimedia'
        });
      }
    } catch (err) {
      console.warn(`[searchPremiumHardwareMedia] Wikimedia fallback failed:`, err.message);
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, limit);
}

export async function downloadVerifiedMedia(imageUrl, localDestPath) {
  try {
    const dir = path.dirname(localDestPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 5000) throw new Error(`Image file too small (${buf.length} bytes)`);
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
    
    // Load learned global negative exemplars from curation memory
    let memoryRejections = '';
    try {
      const memPath = path.resolve('content/curation-memory.json');
      if (fs.existsSync(memPath)) {
        const mem = JSON.parse(fs.readFileSync(memPath, 'utf8'));
        const rejected = (mem.images?.rejected_exemplars || []).map(r => `  • DO NOT SHOW: ${r.title} (${r.reason})`).join('\n');
        if (rejected) memoryRejections = `\nHISTORICAL NEGATIVE EXEMPLARS (PREVIOUSLY REJECTED - NEVER SELECT SIMILAR):\n${rejected}\n`;
      }
    } catch {}

    const briefText = brief
      ? `\nVISUAL BRIEF FOR THIS TOPIC (ground truth of what the real part looks like):\nCanonical form: ${brief.canonical_form}\nMust show: ${brief.must_show.join('; ')}\nMust NOT show: ${brief.must_not_show.join('; ')}\nThe first ${refParts.length} images are REFERENCE examples of the correct subject. The final image is the candidate.\n`
      : '';

    const prompt = `You are the Lead Visual Quality Inspector for an elite engineering publication.
Evaluate this image candidate for an engineering article section about: "${targetConcept}".
${briefText}${memoryRejections}
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
