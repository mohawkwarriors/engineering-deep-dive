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
    ? vetoedTopics.map(v => `• VETOED: ${v.topic} (${v.discipline}) — ${v.summary}`).join('\n')
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
5. MATHEMATICAL NOTATION & FORMULA RENDERING (MANDATORY RULE):
   - High-Quality Rendered Notation Only: Equations and mathematical formulas MUST NEVER be presented as raw plain text.
   - LaTeX Display Math: All primary formulas, governing equations, derivations, and balance relations must be rendered in formal LaTeX display blocks: <div class="math-block">$$...$$</div>.
   - LaTeX Inline Math: All variables, parameters, and simple expressions embedded in prose must use inline LaTeX syntax: $F = m \\cdot a$, $\\delta_{\\text{max}}$, $\\sigma_v$.
   - Popover Equations: In the 'tangents' dictionary, format equations as <div class="modal-equation-box"><div class="math-label">Concept Name:</div>$$Formula$$<div class="math-meta">Parameter definitions with inline LaTeX</div></div>.
6. SPEC COMPARISON TABLE: Include an HTML <table> with class="spec-table" inside a <div class="spec-table-wrap"> comparing 4-5 engineering architectures or materials across 5 technical metrics.
7. TANGENT ANNOTATIONS: Wrap 4-6 specialized, non-intuitive technical terms in <span class="tangent-term" data-tangent="key">. In the "tangents" dictionary, provide their category tag, title, and detailed junior-friendly definition with a governing formula.
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
  "article_html": "full article html starting with <h2>1. ..."
}`;

  console.log("Calling Gemini API...");
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
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
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const resJson = await response.json();
  const rawContent = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawContent) {
    throw new Error("Gemini returned empty candidate response.");
  }

  const articleData = JSON.parse(rawContent);
  console.log(`Generated: "${articleData.title}" (${articleData.subject})`);

  // Deterministic Auto-Sanitizer + Global SVG Geometry Validation Gate
  articleData.article_html = autoSanitizeArticleHtml(articleData.article_html);
  let lintErrors = validateArticleHtml(articleData.article_html, `${nextFileId}.json`);
  if (lintErrors.length > 0) {
    console.warn(`Detected ${lintErrors.length} schematic/media issue(s). Running automated SVG repair pass...`);
    const repairPrompt = `Fix the following SVG geometry / text collision / viewBox clipping errors in this article_html without removing any technical content:\n${lintErrors.join('\n')}\n\nReturn ONLY JSON: { "article_html": "..." }\n\nCURRENT HTML:\n${articleData.article_html}`;
    const repairRes = await fetch(endpoint, {
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
        const repairedObj = JSON.parse(repairedRaw);
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
  const updatedHtml = html.replace(/(const TOPICS = \[\n)/, `$1${topicEntry}`);
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
