import fs from 'fs/promises';
import path from 'path';

const INDEX_PATH = path.join(process.cwd(), 'index.html');
const CONTENT_DIR = path.join(process.cwd(), 'content');

// 8 Core Disciplines Curriculum Loop
const CURRICULUM = [
  { subject: "Manufacturing", topic: "Precision Injection Molding: The DFM of 2-Micron Tooling", focus: "Tooling steels (Stavax ESR), wire EDM, thermal contraction, and gate geometries" },
  { subject: "Mechanisms", topic: "Ballpoint Pen Clickers: The Kinematics of Continuous Rotational Cams", focus: "Continuous cylindrical cam tracks, spring preload, indexing teeth, and tactile force curves" },
  { subject: "Materials", topic: "Chemical Glass Strengthening: Potassium Ion-Exchange and Surface Stress", focus: "Molten KNO3 salt baths, compressive stress depth (DOL), and Griffith crack propagation" },
  { subject: "Design", topic: "The 50-40-10 Fastener Rule: Torque, Friction, and Clamp Load", focus: "Thread friction, under-head bearing friction, bolt stretch, and prevailing torque nuts" },
  { subject: "Fluids", topic: "F1 Ground Effect Venturi Tunnels: Vortex Generators and Underbody Aerodynamics", focus: "Bernoulli pressure differentials, boundary layer separation, porpoising aero-elasticity, and diffuser angles" },
  { subject: "Electromechanical", topic: "Linear Resonant Actuators: Haptic Frequency Tuning and Magnetic Suspension", focus: "Spring-mass resonance, voice coil back-EMF, transient settling latency, and tactile sensory perception" },
  { subject: "Thermal", topic: "Vapor Chambers vs. Heat Pipes: Two-Phase Cooling in Thin Hardware", focus: "Sintered copper wick structures, capillary pumping pressure, thermal resistance, and dryout limits" },
  { subject: "Product Dives", topic: "Smartphone Water Sealing: O-Ring Compression and Porous Acoustic Vents", focus: "Gland aspect ratios, compression set, expanded PTFE acoustic membranes, and IP68 test vacuums" }
];

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable is missing.");
    process.exit(1);
  }

  console.log("Reading index.html...");
  const html = await fs.readFile(INDEX_PATH, 'utf-8');

  // Discover latest issue
  const issueMatch = html.match(/"#(\d{3})":/);
  const latestNum = issueMatch ? parseInt(issueMatch[1], 10) : 2;
  const nextNum = latestNum + 1;
  const nextId = `#${String(nextNum).padStart(3, '0')}`;

  // Determine publication date
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const isoDate = now.toISOString().split('T')[0];

  // Pick next curriculum topic
  const curriculumIndex = (nextNum - 3 + CURRICULUM.length) % CURRICULUM.length;
  const curTopic = CURRICULUM[curriculumIndex];

  console.log(`Generating Issue ${nextId} for ${dateStr} [${curTopic.subject}]: ${curTopic.topic}...`);

  const prompt = `You are a Principal Hardware / Mechanical Systems Engineer writing the daily dispatch for "Engineering Deep Dive".
Write an extraordinarily detailed, first-principles engineering teardown for:
Discipline: ${curTopic.subject}
Title: ${curTopic.topic}
Focus: ${curTopic.focus}

STRICT EDITORIAL REQUIREMENTS:
1. WORD COUNT: The article body MUST be between 2,750 and 3,300 words (strictly 12 to 15 minutes read duration at 220 WPM). Never write brief summaries.
2. TITLE: Direct, clean, topic-first.
3. SUBTITLE: A single-sentence attention-grabbing hook highlighting the core mechanical tension or engineering trade-off without fluff.
4. STRUCTURE: 6 detailed sections with numbers (e.g. "1. Governing Physics & Kinematics", "2. Component Architecture", "3. Manufacturing & DFM Clearances", "4. Materials & Metallurgy", "5. Failure Modes & Degradation", "6. Empirical Bench Metrology").
5. EQUATIONS: Include explicit quantitative formulas (heat flux, stress, flow, clearance).
6. COMPARISON TABLE: Include an HTML <table> with class="spec-table" inside a <div class="spec-table-wrap"> comparing 4-5 engineering architectures across 5 technical metrics.
7. TANGENT ANNOTATIONS: Wrap 4-6 specialized technical terms in <span class="tangent-term" data-tangent="key">.
8. VISUALS & CROSS-SECTIONS: When cutaways, cross-sections, or mechanical figures are generated or described, strictly specify Industrial Design (ID) or CAD-style cross-sections (clean 3D CAD solid model section cutaways, uniform engineering materials rendering, cross-section hatching on cut walls). Enforce strictly: NO background grid, NO background color (must be transparent PNG), NO dimension lines unless specifically required to show a part's exact measurement, and maintain a uniform, cohesive rendering aesthetic across all dispatches. Real-life photos are strictly reserved for actual scraped images.

RETURN ONLY VALID JSON WITH THIS EXACT STRUCTURE (no markdown fence, no other text):
{
  "title": "${curTopic.topic}",
  "subtitle": "Clear single-sentence hook.",
  "subject": "${curTopic.subject}",
  "tangents": {
    "key1": {
      "tag": "CATEGORY // TOPIC",
      "title": "Concept Title",
      "body": "<p>Clear definition.</p><div class=\\"modal-equation-box\\">Formula</div><p>Application.</p>"
    }
  },
  "article_html": "full article html starting with <figure> or <h2>..."
}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API failed with status ${response.status}: ${await response.text()}`);
  }

  const result = await response.json();
  const textOutput = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) throw new Error("Empty response from Gemini API.");

  const data = JSON.parse(textOutput);
  console.log(`Generated dispatch: "${data.title}"`);

  // Build Article HTML Wrapper
  const cleanArticleHtml = `
          <div class="meta-line">
            <span>ISSUE ${nextId}</span><span>•</span><span>${data.subject.toUpperCase()}</span><span>•</span><span id="read-time-badge">13 MIN READ</span>
          </div>

          <h1>${data.title}</h1>
          <p class="subtitle">
            ${data.subtitle}
          </p>

          ${data.article_html}

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
          </div>`;

  // 1. Update TOPICS array in index.html
  const newTopicEntry = `      { id: "${nextId}", subject: "${data.subject}", title: "${data.title.replace(/"/g, '\\"')}", status: "Published", date: "${dateStr}" },\n`;
  let updatedHtml = html.replace('const TOPICS = [\n', 'const TOPICS = [\n' + newTopicEntry);

  // 2. Insert Tangents into TANGENTS in index.html
  let tangentsCode = "";
  for (const [key, tData] of Object.entries(data.tangents || {})) {
    tangentsCode += `      "${key}": ${JSON.stringify(tData, null, 6).trim()},\n`;
  }
  updatedHtml = updatedHtml.replace('const TANGENTS = {\n', 'const TANGENTS = {\n' + tangentsCode);

  // 3. Insert Article into ARTICLES in index.html
  const newArticleCode = `      "${nextId}": \`\n${cleanArticleHtml.trim()}\n      \`,\n`;
  updatedHtml = updatedHtml.replace('const ARTICLES = {\n', 'const ARTICLES = {\n' + newArticleCode);

  await fs.writeFile(INDEX_PATH, updatedHtml, 'utf-8');
  console.log("Successfully updated index.html!");

  // 4. Save markdown copy in content/
  await fs.mkdir(CONTENT_DIR, { recursive: true });
  const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const mdPath = path.join(CONTENT_DIR, `${isoDate}-${slug}.md`);
  const mdText = `---
title: "${data.title}"
issue: "${nextId}"
date: "${isoDate}"
subject: "${data.subject}"
read_time: "13 min read"
subtitle: "${data.subtitle}"
status: "Published"
---

${data.article_html.replace(/<[^>]+>/g, ' ')}
`;
  await fs.writeFile(mdPath, mdText, 'utf-8');
  console.log(`Saved markdown copy to ${mdPath}`);
}

run().catch(err => {
  console.error("Fatal Error during dispatch generation:", err);
  process.exit(1);
});
