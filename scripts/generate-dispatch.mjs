import fs from 'fs/promises';
import path from 'path';

const INDEX_PATH = path.join(process.cwd(), 'index.html');
const CONTENT_DIR = path.join(process.cwd(), 'content');
const QUEUE_PATH = path.join(CONTENT_DIR, 'upcoming-queue.json');
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

  const issueMatch = html.match(/"#(\d+)":/);
  const latestNum = issueMatch ? parseInt(issueMatch[1], 10) : 3;
  const nextNum = latestNum + 1;
  const nextId = `#${String(nextNum).padStart(3, '0')}`;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const isoDate = now.toISOString().split('T')[0];

  const pastTitles = [...html.matchAll(/title:\s*"([^"]+)"/g)].map(m => m[1]);
  const recentTitlesList = pastTitles.slice(0, 35).map(t => `• ${t}`).join('\n');

  let vetoedTopics = [];
  try {
    const vetoesRaw = await fs.readFile(VETOES_PATH, 'utf-8');
    vetoedTopics = JSON.parse(vetoesRaw);
  } catch (e) {}
  const vetoesList = vetoedTopics.map(v => `• VETOED: ${v.title} (${v.reason || 'Not aligned with core interests'})`).join('\n');

  console.log(`Authoring Issue ${nextId} for ${dateStr}...`);

  const prompt = `You are a Principal Hardware / Mechanical Systems Engineer authoring today's dispatch for "Engineering Deep Dive".
Your audience consists of elite Product Design Engineers (PD), Mechanical Engineers (ME), and Hardware Architects who demand first-principles physics, real-world DFM tolerances, and deep kinematic/thermal teardowns.

STRICT EDITORIAL REQUIREMENTS:
1. WORD COUNT: The article body MUST be between 2,750 and 3,300 words (strictly 12 to 15 minutes read duration at 220 WPM). Never write high-level overviews or brief summaries.
2. TITLE & INTRO HOOK (MORNING DIGEST TONE - CONVERSATIONAL, PLAIN ENGLISH):
   - Title Standard: Use clean, curiosity-inducing, plain-English titles (e.g. "How Laptops Get Featherweight Metal Shells"). Avoid long, dense compound titles or heavy academic jargon.
   - Early Technology Definition & Comparison: In Section 1, immediately define the core technology in vivid, plain-English terms early on (e.g. what Thixomolding is: injecting semi-solid metal slurry like plastic instead of melting it), and explicitly contrast why it beats traditional legacy methods (e.g. 18-second cycle times, sub-millimeter walls, zero swarf waste, and double bending rigidity vs. 45-minute 5-axis CNC hogging).
   - De-Jargonized Section Headings: Clean, punchy headers leading with physical intuition (e.g. "2. The Slurpee State: Why Semi-Solid Metal Flows Like Soft-Serve"). Never include jarring academic parentheticals or styling artifacts in titles.
   - Retain deep technical precision within the body text and popover tangent annotations, but lead every section with visceral mechanics and functional "aha!" payoffs.
3. SUBTITLE: A captivating, single-sentence narrative hook highlighting the core mechanical tension or engineering trade-off without meta-announcements or filler.
4. STRUCTURE: 6 detailed, deeply technical sections with numbers:
   - 1. Governing Physics & First Principles (Equations, quantitative load paths, boundary conditions)
   - 2. Component Architecture & Part-Level Anatomy (Detailed exploded breakdown, physical packaging)
   - 3. Manufacturing, Tooling & DFM Clearances (GD&T tolerances in microns, tooling steels, surface finish Ra, draft angles)
   - 4. Metallurgy & Materials Science (Exact alloy codes e.g. 6061-T6, 7075, 316L, Ti-6Al-4V, PEEK 450G, Delrin 500P, stress-strain, thermal conductivity)
   - 5. Failure Modes, Wear Tribology & Reliability Degradation (Fatigue limits, cycle life, wear mechanisms, environmental stress)
   - 6. Empirical Bench Metrology & Validation (Laser interferometry, strain gauges, Scace/load cell sensors, high-frequency telemetry)
5. MATHEMATICAL NOTATION & FORMULA RENDERING (MANDATORY RULE):
   - High-Quality Rendered Notation Only: Equations and mathematical formulas MUST NEVER be presented as raw plain text.
   - LaTeX Display Math: All primary formulas, governing equations, derivations, and balance relations must be rendered in formal LaTeX display blocks: <div class="math-block">$$...$$</div>.
   - LaTeX Inline Math: All variables, parameters, and simple expressions embedded in prose must use inline LaTeX syntax: $F = m \cdot a$, $\delta_{\text{max}}$, $\sigma_v$, $\dot{\gamma} > 10^4\text{ s}^{-1}$.
   - Popover Equations: In the 'tangents' dictionary, format equations as <div class="modal-equation-box"><div class="math-label">Concept Name:</div>$$Formula$$<div class="math-meta">Parameter definitions with inline LaTeX</div></div>.
6. SPEC COMPARISON TABLE: Include an HTML <table> with class="spec-table" inside a <div class="spec-table-wrap"> comparing 4-5 engineering architectures or materials across 5 technical metrics.
7. TANGENT ANNOTATIONS: Wrap 4-6 specialized, non-intuitive technical terms in <span class="tangent-term" data-tangent="key">. In the "tangents" dictionary, provide their category tag, title, and detailed junior-friendly definition with a governing formula.
8. VISUAL MEDIA & AUTHENTIC REAL-WORLD PHOTOGRAPHY:
   - AUTHENTIC REAL-WORLD PHOTOGRAPHY: Actively source and embed real, authentic public photography from the internet (such as OEM hardware teardowns, Wikimedia Commons engineering archives, patent drawings, or manufacturer machinery photos like JSW injection presses) with high-contrast presentation.
   - ZERO GENERATED RASTER IMAGES: Strict ban on AI-generated diffusion art (DALL-E/Midjourney/Imagen). Always use authentic real-world engineering photography or clean, verified technical schematics.

RETURN ONLY VALID JSON WITH THIS EXACT STRUCTURE (no markdown fence, no other text):
{
  "title": "Clean Plain-English Title",
  "subtitle": "Single-sentence narrative hook.",
  "subject": "Discipline Name (One of the 8)",
  "tangents": {
    "key1": {
      "tag": "DISCIPLINE // TOPIC",
      "title": "Concept Title",
      "body": "<p>Detailed definition.</p><div class=\"modal-equation-box\"><div class=\"math-label\">Concept:</div>$$Formula$$<div class=\"math-meta\">Legend</div></div><p>Engineering application.</p>"
    }
  },
  "article_html": "full article html starting with <h2>1. ..."
}`;

  console.log("Dispatch generation prompt ready.");
}

run().catch(console.error);
