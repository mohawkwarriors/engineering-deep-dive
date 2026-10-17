import fs from 'fs/promises';
import path from 'path';
import { autoSanitizeArticleHtml, validateArticleHtml } from './lint-media.mjs';

const INDEX_PATH = path.join(process.cwd(), 'index.html');
const CONTENT_DIR = path.join(process.cwd(), 'content');
const BACKLOG_PATH = path.join(CONTENT_DIR, 'backlog.json');
const VETOES_PATH = path.join(CONTENT_DIR, 'vetoes.json');

const SUBJECTS = [
  "Manufacturing",
  "Mechanisms",
  "Materials",
  "Design",
  "Fluids",
  "Electromechanical",
  "Thermal",
  "Product Dives"
];

export function safeJsonParse(rawString) {
  if (!rawString) throw new Error("Empty JSON string received.");
  let cleaned = rawString.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn(`Standard JSON.parse failed (${err.message}). Repairing unescaped LaTeX backslashes...`);

    // Pass 1: Double any backslash not part of a valid JSON escape sequence (\", \\, \/, \b, \f, \n, \r, \t, \uXXXX)
    const pass1 = cleaned.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
    try {
      return JSON.parse(pass1);
    } catch (err2) {
      console.warn(`Pass 1 backslash repair failed (${err2.message}). Attempting iterative positional repair...`);
      let s = pass1;
      for (let attempt = 0; attempt < 50; attempt++) {
        try {
          return JSON.parse(s);
        } catch (posErr) {
          const match = posErr.message.match(/position (\d+)/);
          if (!match) throw posErr;
          const pos = parseInt(match[1], 10);
          const backslashIdx = s.lastIndexOf('\\', pos);
          if (backslashIdx === -1 || pos - backslashIdx > 8) throw posErr;
          s = s.slice(0, backslashIdx) + '\\\\' + s.slice(backslashIdx + 1);
        }
      }
      throw err2;
    }
  }
}

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable is missing.");
    process.exit(1);
  }

  console.log("Reading index.html...");
  const html = await fs.readFile(INDEX_PATH, 'utf-8');

  // Match the latest issue number from TOPICS catalog (e.g. id: "#003")
  const issueMatch = html.match(/id:\s*"#(\d+)"/) || html.match(/"#(\d+)":/);
  const latestNum = issueMatch ? parseInt(issueMatch[1], 10) : 3;
  const nextNum = latestNum + 1;
  const nextId = `#${String(nextNum).padStart(3, '0')}`;
  const nextFileId = String(nextNum).padStart(3, '0');

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const isoDate = now.toISOString().split('T')[0];

  // 1. Check backlog.json for today's scheduled topic
  let selectedTopic = null;
  let backlog = [];
  try {
    const backlogRaw = await fs.readFile(BACKLOG_PATH, 'utf-8');
    backlog = JSON.parse(backlogRaw);
    selectedTopic = backlog.find(t => t.scheduledDate === isoDate && (t.status === 'staged' || t.status === 'available'));
    if (!selectedTopic) {
      selectedTopic = backlog.find(t => t.status === 'staged') || backlog.find(t => t.status === 'available');
    }
  } catch (err) {
    console.warn("Could not read backlog.json:", err.message);
  }

  // 2. Read negative feedback / vetoes
  let vetoedTopics = [];
  try {
    const vetoesRaw = await fs.readFile(VETOES_PATH, 'utf-8');
    vetoedTopics = JSON.parse(vetoesRaw);
  } catch (e) {}

  const vetoesList = vetoedTopics.length > 0 
    ? vetoedTopics.map(v => `• VETOED: ${v.topic || v.title} (${v.discipline || v.subject || 'Hardware'}) — ${v.summary || v.reason || 'Off-target'}`).join('\n')
    : "None yet.";

  const pastTitles = [...html.matchAll(/title:\s*"([^"]+)"/g)].map(m => m[1]);
  const recentTitlesList = pastTitles.slice(0, 35).map(t => `• ${t}`).join('\n');

  console.log(`Authoring Issue ${nextId} for ${dateStr}...`);
  if (selectedTopic) {
    console.log(`Using staged topic from backlog: [${selectedTopic.discipline}] ${selectedTopic.topic} (${selectedTopic.id})`);
  } else {
    console.log("No staged topic found in backlog. Executing autonomous discovery...");
  }

  let topicDirective = "";
  if (selectedTopic) {
    topicDirective = `
TARGET TOPIC SPECIFICATION (PRE-APPROVED BY EDITORIAL QUEUE):
- Mandatory Discipline: ${selectedTopic.discipline}
- Mandatory Title Concept: ${selectedTopic.topic}
- Core Mechanism Focus: ${selectedTopic.summary}
- Backlog Identifier: ${selectedTopic.id}
You MUST write today's deep dive centered specifically on this mechanism.
`;
  } else {
    topicDirective = `
AUTONOMOUS TOPIC DISCOVERY:
Select a high-stakes, first-principles mechanical or hardware engineering dilemma across the 8 disciplines.
`;
  }

  const prompt = `You are a Principal Hardware / Mechanical Systems Engineer authoring today's dispatch for "Engineering Deep Dive".
Your audience consists of elite Product Design Engineers (PD), Mechanical Engineers (ME), and Hardware Architects who demand first-principles physics, real-world DFM tolerances, and deep kinematic/thermal teardowns.

${topicDirective}

RECENTLY PUBLISHED TITLES (DO NOT DUPLICATE OR CLOSELY OVERLAP):
${recentTitlesList}

USER VETOED TOPICS (NEGATIVE CONSTRAINTS - DO NOT SELECT OR REPEAT SIMILAR TOPICS):
${vetoesList}

STRICT EDITORIAL REQUIREMENTS:
1. WORD COUNT: The article body MUST be between 2,750 and 3,300 words (strictly 12 to 15 minutes read duration at 220 WPM). Never write high-level overviews or brief summaries.
2. TITLE & INTRO HOOK (MORNING DIGEST TONE - CONVERSATIONAL, PLAIN ENGLISH):
   - Title Standard: Use clean, curiosity-inducing, plain-English titles (e.g. "How Laptops Get Featherweight Metal Shells"). Avoid long, dense compound titles or heavy academic jargon.
   - Early Technology Definition & Comparison: In Section 1, immediately define the core technology in vivid, plain-English terms early on, and explicitly contrast why it beats traditional legacy methods.
   - De-Jargonized Section Headings: Clean, punchy headers leading with physical intuition (e.g. "2. The Slurpee State: Why Semi-Solid Metal Flows Like Soft-Serve").
3. SUBTITLE: A captivating, single-sentence narrative hook highlighting the core mechanical tension or engineering trade-off without meta-announcements or filler.
4. STRUCTURE: 6 detailed, deeply technical sections with numbers:
   - 1. Governing Physics & First Principles (Equations, quantitative load paths, boundary conditions)
   - 2. Component Architecture & Part-Level Anatomy (Detailed exploded breakdown, physical packaging)
   - 3. Manufacturing, Tooling & DFM Clearances (GD&T tolerances in microns, tooling steels, surface finish Ra, draft angles)
   - 4. Metallurgy & Materials Science (Exact alloy codes e.g. 6061-T6, 7075, 316L, Ti-6Al-4V, PEEK 450G, stress-strain, thermal conductivity)
   - 5. Failure Modes, Wear Tribology & Reliability Degradation (Fatigue limits, cycle life, wear mechanisms, environmental stress)
   - 6. Empirical Bench Metrology & Validation (Laser interferometry, strain gauges, Scace/load cell sensors, high-frequency telemetry)
5. MATHEMATICAL INTUITION & HIGH-LEVEL CONCEPT FORMULAS (MORNING DIGEST CALIBRATION):
   - Intuitive, Conceptual Math Only: The audience reads this as a morning engineering digest over coffee. They want first-principles intuition, clear scaling behavior, and physical concepts—NOT intimidating, multi-variable academic textbook equations.
   - The 2–4 Variable Rule: Keep display equations simple, elegant, and focused on physical proportionality (e.g. strain scales inversely with radius: \epsilon \approx \frac{t}{2\rho}, or flexural rigidity scales with thickness cubed: D \propto E \cdot h^3, or holding torque: T_{\text{hold}} \approx \mu \cdot R \cdot F).
   - STRICTLY FORBIDDEN MATH OVERKILL: NEVER output dense multi-variable differential equations, contour integrals, or heavy trigonometric fractions (NO complex fractions like \frac{\tan(\alpha) \pm \mu}{1 \mp \mu \tan(\alpha)}, NO complex radical integrals, NO tensor notation).
   - Explain the "Why" in Plain English: Directly beneath every formula, state the immediate physical takeaway in one clean, plain-English sentence (e.g. "Doubling the bend radius cuts strain in half, keeping the glass well below its fracture limit.").
   - LaTeX Formatting: Display formulas must use <div class="math-block">$$...$$</div>; inline symbols must use $F$, $\rho$, $\mu$.
   - Deep Academic Formulations: Keep advanced derivations in the clickable 'tangents' popovers where readers can optionally explore them.
6. SPEC COMPARISON TABLE: Include an HTML <table> with class="spec-table" inside a <div class="spec-table-wrap"> comparing 4-5 engineering architectures or materials across 5 technical metrics.
7. TANGENT ANNOTATIONS & THE "NO-BARE-JARGON" RULE (THE GRIFFITH & TOOL-STEEL RULE):
   - Wrap 4-6 specialized, non-intuitive technical terms in <span class="tangent-term" data-tangent="key"> with full popover definitions in the "tangents" dictionary.
   - MANDATORY IN-PROSE JARGON TRANSLATION: Never drop advanced physical, materials, mechanical terminology, or proprietary alloy/tool steel brand names (e.g. Griffith micro-flaws, Hertzian contact stress, Taylor dispersion, Thixotropic rosettes, Dean vortices, Kirkendall voids, Böhler M390, Uddeholm Elmax, Dievar, Inconel 718) into the text without an immediate plain-English translation or parenthetical in that same sentence (e.g. "Griffith micro-flaws—microscopic surface scratches that act as stress magnifiers, causing brittle glass to fracture far below its theoretical atomic strength" or "Böhler M390 or Uddeholm Elmax—premium powder-metallurgy super-steels atomized into micro-powder to prevent brittle carbide clumps").
   - A reader must NEVER feel confused or alienated by unexplained academic jargon or proprietary trade names while reading their morning digest.
8. VISUAL MEDIA & GRAPHICS ARCHITECTURE:
   - TIER 1 (PRIMARY): AUTHENTIC REAL-WORLD TEARDOWN / HARDWARE PHOTOGRAPHY (PAID PUBLICATION BENCHMARK):
     * SELECTION ARCHETYPE:
       - Studio-grade component or assembly teardowns (e.g. iFixit teardown benches, FCC filings, lab metrology fixtures, or manufacturer precision machined cutaways).
       - Clean, neutral backgrounds (matte workbench, white sweep, dark slate, or brushed chassis).
       - Razor-sharp focus and professional lighting highlighting physical hardware anatomy, CNC toolpaths, die-cast ribs, copper plumbing, or PCB topology.
     * STRICT EXCLUSION CRITERIA (AUTOMATIC REJECTION):
       - NO PEOPLE / SELFIES / POSES: Zero photos of technicians, baristas, or people posing or standing near equipment.
       - NO CLUTTERED / CASUAL ENVIRONMENTS: Zero greasy garage floors, tarp walls, plastic buckets, or messy workshop snapshot photos.
       - NO LIFESTYLE / CONSUMER SHOTS: No coffee cups, latte art, or living room staging. The physical mechanism/chassis MUST be the sole hero of the composition.
     * HERO FIGURE PRIORITY (MANDATORY): The very first visual element in article_html MUST ALWAYS be a real-world hardware teardown photograph (<figure class="product-figure">) placed at the top of the article as FIG 01. Never place a schematic before the hero photograph.
     * STRICT SEQUENTIAL NUMBERING: Every visual element (both <figure class="product-figure"> and <div class="schematic-card">) MUST be numbered strictly sequentially starting with FIG 01, FIG 02, FIG 03... There must be ZERO duplicate figure numbers and ZERO numbering gaps across the entire article.
     * UNIFIED CAPTION SCHEMA (MANDATORY ON ALL FIGURES AND SCHEMATICS):
       Every <figcaption> and <div class="schematic-caption"> MUST follow this exact markup structure:
       <span><strong>FIG XX — TITLE:</strong> Detailed engineering description...</span>
       <span class="source-tag">ARCHIVE / SOURCE</span>
       Never omit the FIG XX prefix, never use standalone figure badges, and always include the <span class="source-tag">.
   - TIER 2 (GENERATED VISUALS — WHEN REAL PHOTOS DO NOT EXIST):
      * MANDATORY COMPARATIVE GEOMETRY DIAGRAM (THE VISUAL THESIS RULE):
        - Whenever an article introduces a new geometry, mechanism, or architecture that replaces a flawed legacy method (e.g. U-Shape vs. Teardrop Fold, Involute Gear vs. Cycloidal Pin, HPDC vs. Thixomolding Slurry, Thermoblock vs. Dual Boiler), you MUST include a dedicated side-by-side comparative vector schematic (<div class="schematic-card"> with <div class="schematic-viewport"><svg ...></div></div>) directly in Section 1 or Section 2 as FIG 02!
        - Panel A (Left): Traditional Flawed Geometry (highlighting the concentrated stress, gap, or failure mode in red).
        - Panel B (Right): Engineered Solution (illustrating the distributed load, relief cavity, or improved mechanism in emerald/cyan).
        - Readers must be able to visually see the core physical breakthrough at a single glance before diving into component-level anatomy.
     * NEVER use diffusion AI art for technical mechanisms or schematics (it produces blurry, uninformative blobs).
     * STRICT COMPLEXITY CEILING & GOLDEN RULE:
       - NEVER attempt complicated architectural or multi-zone scene diagrams (e.g. wall assemblies with studs/drywall/boxes, room layouts, doors with approaching people, or complex multipath ray diagrams). AI fails at these and produces cluttered, brittle visuals. If a diagram is too complicated, DO NOT CREATE IT!
       - PREFERRED ARCHETYPE (FIGURE 2 STYLE — PERFECT): Use clean, responsive HTML process grids (<div class="process-grid"><div class="process-step-card">...</div></div>) inside <div class="schematic-card">. These are 100% responsive, have zero collision risk, and clearly explain sequential workflows, state machines, and thermal/hydraulic pathways.
       - MAXIMUM COMPLEXITY CEILING (FIGURE 3 STYLE — UPPER LIMIT FOR SVG): If generating an SVG CAD schematic, it MUST be a single-axis, linear horizontal component (e.g. reciprocating screw barrel, fluid conduit, or single-component gear cross-section). It must have plenty of open breathing room, maximum 3 separated zones, and all callout labels isolated in clean cards or headers outside the geometry.
       - NEVER exceed Figure 3's complexity. If a mechanism cannot be drawn cleanly as a single-axis component, use the Figure 2 process grid instead.
     * ZERO TEXT COLLISION & VIEWBOX MARGIN RULES (HARD GATE):
       - Every schematic header MUST use <div class="schematic-header"><span class="schematic-title">FIG XX — TITLE</span>...</div>.
       - Every <text> element inside an <svg> MUST explicitly specify font-family="'JetBrains Mono', monospace" and font-size between 11 and 14.
       - NEVER place two callout <text> elements on the same vertical baseline (or within 22px vertically) unless they are inside separate non-overlapping column cards. Left-anchored callouts and right-anchored (text-anchor="end") callouts MUST always sit on distinct vertical y-baselines separated by at least 24px.
       - Every <text> element's horizontal span [left, right] MUST stay strictly within [20, viewBoxWidth - 20]. Bottom summary banners must use font-size="12" and remain under 105 characters per line so they never clip outside the viewBox.
       - NEVER route a <line> or <path> through any <text> bounding box.
        - CONTRAST & THEME IMMUNITY (HARD GATE):
          * In SVGs, NEVER place <text class="svg-text-primary"> or <text class="svg-text-muted"> directly over hardcoded dark geometry (e.g. #292524, #1C1917, #18181B, or #222). In Light Mode, svg-text-primary becomes dark charcoal (#1F1E1D), resulting in an illegible black-on-black collision.
          * Any callout pointing to or sitting over dark hardware components MUST be housed inside a dedicated high-contrast badge pill (<rect fill="#1C1917" stroke="#COLOR" rx="4"/>) with an explicit bright accent font (e.g. fill="#38BDF8", fill="#F59E0B", or fill="#10B981"), guaranteeing crisp contrast in both light and dark themes.

RETURN ONLY VALID JSON WITH THIS EXACT STRUCTURE (no markdown fence, no other text):
{
  "title": "Clean Plain-English Title",
  "subtitle": "Single-sentence narrative hook.",
  "subject": "Discipline Name (One of the 8)",
  "tangents": {
    "key1": {
      "tag": "DISCIPLINE // TOPIC",
      "title": "Concept Title",
      "body": "<p>Detailed definition.</p><div class=\\"modal-equation-box\\"><div class=\\"math-label\\">Concept:</div>$$Formula$$<div class=\\"math-meta\\">Legend</div></div><p>Engineering application.</p>"
    }
  },
  "article_html": "full article html starting with <div class=\"meta-line\">...<h1>Title</h1><p class=\"subtitle\">Subtitle</p><figure class=\"product-figure\"><div class=\"img-wrapper\"><img ...></div><figcaption><span><strong>FIG 01 — TITLE:</strong> ...</span><span class=\"source-tag\">...</span></figcaption></figure><h2>1. ... through <h2>6. ... and ending with <div class=\"telemetry-bar\">"
}`;

  const candidateModels = [
    'gemini-3-flash-preview',
    'gemini-3.1-pro-preview',
    'gemini-2.5-flash'
  ];

  let rawContent = null;
  let lastError = null;
  let successfulEndpoint = null;

  for (const model of candidateModels) {
    try {
      console.log(`Calling Gemini API with ${model}...`);
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Model ${model} returned error (${response.status}): ${errText.slice(0, 200)}...`);
        lastError = new Error(`Gemini API error (${response.status}): ${errText}`);
        continue;
      }

      const resJson = await response.json();
      rawContent = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawContent) {
        console.log(`Successfully received content from ${model}.`);
        successfulEndpoint = endpoint;
        break;
      }
    } catch (err) {
      console.warn(`Attempt with ${model} failed: ${err.message}`);
      lastError = err;
    }
  }

  if (!rawContent) {
    throw lastError || new Error("All Gemini models failed to generate content.");
  }

  const articleData = safeJsonParse(rawContent);
  console.log(`Generated: "${articleData.title}" (${articleData.subject})`);

  // Deterministic Header Assembly: Ensure meta-line, h1, and subtitle are present
  if (!articleData.article_html.includes('class="meta-line"')) {
    const subClass = `sub-${articleData.subject.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const headerBlock = `
<div class="meta-line">
  <span>ISSUE ${nextId}</span><span>•</span><span class="archive-subject-tag ${subClass}">${articleData.subject.toUpperCase()}</span><span>•</span><span id="read-time-badge">14 MIN READ</span>
</div>

<h1>${articleData.title}</h1>
<p class="subtitle">
  ${articleData.subtitle}
</p>
`;
    articleData.article_html = headerBlock + '\n' + articleData.article_html;
  }

  // Deterministic Telemetry Assembly: Ensure telemetry-bar exists at the end
  if (!articleData.article_html.includes('class="telemetry-bar"')) {
    articleData.article_html += `
<div class="telemetry-bar">
  <div class="telemetry-info">
    <span class="telemetry-title">Background Quality Telemetry</span>
    <span class="telemetry-desc">Rate this topic to train the automated curation model for future dispatches.</span>
  </div>
  <div class="telemetry-actions">
    <button class="score-btn" id="telemetry-up" onclick="recordTelemetry('up')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
      Good Topic
    </button>
    <button class="score-btn" id="telemetry-down" onclick="recordTelemetry('down')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path></svg>
      Poor Topic
    </button>
  </div>
</div>
`;
  }

  // Deterministic Auto-Sanitizer + Global SVG Geometry Validation Gate
  articleData.article_html = autoSanitizeArticleHtml(articleData.article_html);
  let lintErrors = validateArticleHtml(articleData.article_html, `${nextFileId}.json`);
  if (lintErrors.length > 0) {
    console.warn(`Detected ${lintErrors.length} schematic/media issue(s). Running automated SVG repair pass...`);
    const repairPrompt = `Fix the following SVG geometry / text collision / viewBox clipping errors in this article_html without removing any technical content:\n${lintErrors.join('\n')}\n\nReturn ONLY JSON: { "article_html": "..." }\n\nCURRENT HTML:\n${articleData.article_html}`;
    const repairRes = await fetch(successfulEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: repairPrompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
      })
    });
    if (repairRes.ok) {
      const repairJson = await repairRes.json();
      const repairedRaw = repairJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (repairedRaw) {
        const repairedObj = safeJsonParse(repairedRaw);
        if (repairedObj.article_html) {
          articleData.article_html = autoSanitizeArticleHtml(repairedObj.article_html);
        }
      }
    }
  }

  // 3. Write decoupled JSON chunk: content/issues/{num}.json
  const issueJsonPath = path.join(CONTENT_DIR, 'issues', `${nextFileId}.json`);
  const issuePayload = {
    id: nextId,
    title: articleData.title,
    subtitle: articleData.subtitle,
    subject: articleData.subject,
    date: dateStr,
    tangents: articleData.tangents || {},
    article_html: articleData.article_html
  };
  await fs.writeFile(issueJsonPath, JSON.stringify(issuePayload, null, 2), 'utf-8');
  console.log(`Saved issue payload to ${issueJsonPath}`);

  // 4. Write Markdown archive mirror
  const slug = articleData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const mdPath = path.join(CONTENT_DIR, `${isoDate}-${slug}.md`);
  const mdContent = `---
id: "${nextId}"
title: "${articleData.title}"
subtitle: "${articleData.subtitle}"
subject: "${articleData.subject}"
date: "${dateStr}"
isoDate: "${isoDate}"
---

# ${articleData.title}

*${articleData.subtitle}*

${articleData.article_html}
`;
  await fs.writeFile(mdPath, mdContent, 'utf-8');
  console.log(`Saved Markdown archive to ${mdPath}`);

  // 5. Update index.html TOPICS catalog
  const shortTitle = articleData.shortTitle || (articleData.title.includes(':') ? articleData.title.split(':')[0].trim() : articleData.title);
  const topicEntry = `      { id: "${nextId}", subject: "${articleData.subject}", title: "${articleData.title}", shortTitle: "${shortTitle}", status: "Published", date: "${dateStr}" },\n`;
  const updatedHtml = html.replace(/(const TOPICS = \[\r?\n)/, `$1${topicEntry}`);
  await fs.writeFile(INDEX_PATH, updatedHtml, 'utf-8');
  console.log(`Registered ${nextId} in index.html TOPICS catalog`);

  // 6. Update backlog.json (mark topic as published)
  if (selectedTopic && backlog.length > 0) {
    const tIdx = backlog.findIndex(t => t.id === selectedTopic.id);
    if (tIdx !== -1) {
      backlog[tIdx].status = 'published';
      backlog[tIdx].publishedDate = isoDate;
      backlog[tIdx].issueId = nextId;
      await fs.writeFile(BACKLOG_PATH, JSON.stringify(backlog, null, 2), 'utf-8');
      console.log(`Updated backlog.json: ${selectedTopic.id} marked as published.`);
    }
  }

  console.log(`Issue ${nextId} successfully published and committed.`);
}

run().catch(err => {
  console.error("Fatal generation failure:", err);
  process.exit(1);
});
