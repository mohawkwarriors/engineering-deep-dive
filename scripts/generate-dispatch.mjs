import fs from 'fs/promises';
import path from 'path';
import { autoSanitizeArticleHtml, validateArticleHtml } from './lint-media.mjs';
import { selectHeroImage } from './select-hero-image.mjs';
import { getLearnedEditorialDirectives } from './feedback-learner.mjs';

const INDEX_PATH = path.join(process.cwd(), 'index.html');
const LEGACY_INDEX_PATH = path.join(process.cwd(), 'legacy', 'index.html');
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

export function findMatchingBrace(str, startPos = 0) {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startPos; i < str.length; i++) {
    const char = str[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (char === '\\') {
        escape = true;
      } else if (char === '"') {
        inString = false;
      }
    } else {
      if (char === '"') {
        inString = true;
      } else if (char === '{' || char === '[') {
        depth++;
      } else if (char === '}' || char === ']') {
        depth--;
        if (depth === 0) {
          return i;
        }
      }
    }
  }
  return -1;
}

export function autoCloseJson(str) {
  let inString = false;
  let escape = false;
  const stack = [];

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (char === '\\') {
        escape = true;
      } else if (char === '"') {
        inString = false;
      }
    } else {
      if (char === '"') {
        inString = true;
      } else if (char === '{') {
        stack.push('}');
      } else if (char === '[') {
        stack.push(']');
      } else if (char === '}' || char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === char) {
          stack.pop();
        }
      }
    }
  }

  let closed = str;
  if (inString) {
    closed += '"';
  }
  while (stack.length > 0) {
    closed += stack.pop();
  }
  return closed;
}

export function safeJsonParse(rawString) {
  if (!rawString) throw new Error("Empty JSON string received.");
  let cleaned = rawString.trim();

  // Strip markdown code fences if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```[\s\S]*$/i, '').trim();

  // Find start of outermost JSON
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  if (startIdx > 0) {
    cleaned = cleaned.slice(startIdx);
  }

  // Find matching outermost closing brace
  const matchingEnd = findMatchingBrace(cleaned, 0);
  if (matchingEnd !== -1) {
    cleaned = cleaned.slice(0, matchingEnd + 1);
  } else {
    cleaned = autoCloseJson(cleaned);
  }

  // Pre-escape common LaTeX commands so single backslashes aren't parsed as JSON control characters
  cleaned = cleaned.replace(/(?<!\\)\\(text|textbf|textit|textrm|textsf|texttt|times|theta|tau|tilde|top|to|frac|flat|forall|rho|right|rangle|rightarrow|Rightarrow|real|nabla|nu|neq|neg|newline|bar|beta|bm|begin|big|bmod|bullet)\b/g, '\\\\$1');

  // 1. Fast path: try standard parsing first
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn(`Standard JSON.parse failed (${err.message}). Repairing unescaped LaTeX backslashes and JSON escapes...`);
  }

  // 2. State-machine string repair
  const latexCommands = /^(?:frac|flat|forall|text|textbf|textit|textrm|textsf|texttt|times|theta|tau|tilde|top|rho|right|rangle|rightarrow|Rightarrow|real|nabla|nu|neq|neg|newline|bar|beta|bm|begin|big|bmod|bullet)\b/;

  let inString = false;
  let repaired = '';
  let i = 0;

  while (i < cleaned.length) {
    const char = cleaned[i];

    if (!inString) {
      if (char === '"') {
        inString = true;
      }
      repaired += char;
      i++;
    } else {
      if (char === '"') {
        inString = false;
        repaired += char;
        i++;
      } else if (char === '\\') {
        const next = cleaned[i + 1];
        if (next === undefined) {
          repaired += '\\\\';
          i++;
        } else if (next === '\\' || next === '"' || next === '/') {
          repaired += '\\' + next;
          i += 2;
        } else if (next === 'u') {
          const hex = cleaned.slice(i + 2, i + 6);
          if (/^[0-9a-fA-F]{4}$/.test(hex)) {
            repaired += '\\u' + hex;
            i += 6;
          } else {
            repaired += '\\\\';
            i++;
          }
        } else if (next === 'b' || next === 'f' || next === 'n' || next === 'r' || next === 't') {
          const remainder = cleaned.slice(i + 1);
          if (latexCommands.test(remainder)) {
            repaired += '\\\\';
            i++;
          } else {
            repaired += '\\' + next;
            i += 2;
          }
        } else {
          // Unescaped backslash before any character (LaTeX symbols like \Delta, \mu, \approx, etc.)
          repaired += '\\\\';
          i++;
        }
      } else {
        const code = char.charCodeAt(0);
        if (code === 8) {
          repaired += '\\b';
          i++;
        } else if (code === 9) {
          repaired += '\\t';
          i++;
        } else if (code === 10) {
          repaired += '\\n';
          i++;
        } else if (code === 12) {
          repaired += '\\f';
          i++;
        } else if (code === 13) {
          repaired += '\\r';
          i++;
        } else if (code < 32) {
          repaired += '\\u' + code.toString(16).padStart(4, '0');
          i++;
        } else {
          repaired += char;
          i++;
        }
      }
    }
  }

  // Remove trailing commas before closing braces or brackets
  let candidateParsed = repaired.replace(/,\s*([\]}])/g, '$1');

  try {
    return JSON.parse(candidateParsed);
  } catch (err2) {
    console.warn(`State-machine repair attempt 1 failed (${err2.message}). Attempting unrelaxed parse...`);
    try {
      return JSON.parse(repaired);
    } catch (err3) {
      const closedAgain = autoCloseJson(candidateParsed);
      return JSON.parse(closedAgain);
    }
  }
}

export function calculateReadTime(html) {
  const pWords = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(m => m[1].replace(/<[^>]+>/g, ' '))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\s+/).filter(Boolean).length;

  const totalWords = html
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\s+/).filter(Boolean).length;

  const nonP = Math.max(0, totalWords - pWords);
  const minutes = Math.round((pWords / 220) + (nonP / 450));
  return Math.max(10, Math.min(14, minutes));
}

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable is missing.");
    process.exit(1);
  }

  // 0. Discover latest issue number and past published titles from content/issues
  let latestNum = 0;
  const pastTitles = [];
  const issuesDir = path.join(CONTENT_DIR, 'issues');
  try {
    const existingFiles = await fs.readdir(issuesDir);
    for (const f of existingFiles) {
      const match = f.match(/^(\d{3})\.(?:json|mdx)$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > latestNum) latestNum = n;
      }
      if (f.endsWith('.json')) {
        try {
          const raw = await fs.readFile(path.join(issuesDir, f), 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed.title) pastTitles.push(parsed.title);
        } catch {}
      }
    }
  } catch (err) {
    console.warn("Could not inspect content/issues:", err.message);
  }

  // Load index.html or legacy/index.html if available
  let html = null;
  let targetHtmlPath = null;
  for (const cand of [INDEX_PATH, LEGACY_INDEX_PATH]) {
    try {
      html = await fs.readFile(cand, 'utf-8');
      targetHtmlPath = cand;
      console.log(`Read topic catalog from ${path.basename(cand)}`);
      break;
    } catch {}
  }

  if (html) {
    if (latestNum === 0) {
      const issueMatch = html.match(/id:\s*"#(\d+)"/) || html.match(/"#(\d+)":/);
      latestNum = issueMatch ? parseInt(issueMatch[1], 10) : 3;
    }
    const legacyTitles = [...html.matchAll(/title:\s*"([^"]+)"/g)].map(m => m[1]);
    for (const lt of legacyTitles) {
      if (!pastTitles.includes(lt)) pastTitles.push(lt);
    }
  }

  if (latestNum === 0) latestNum = 7;
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

  const prompt = `You are a Principal Hardware / Mechanical Systems Engineer authoring today's dispatch for "The HW Insider".
Your audience consists of elite Product Design Engineers (PD), Mechanical Engineers (ME), and Hardware Architects who demand first-principles physics, real-world DFM tolerances, and deep kinematic/thermal teardowns.

${topicDirective}

RECENTLY PUBLISHED TITLES (DO NOT DUPLICATE OR CLOSELY OVERLAP):
${recentTitlesList}

USER VETOED TOPICS (NEGATIVE CONSTRAINTS - DO NOT SELECT OR REPEAT SIMILAR TOPICS):
${vetoesList}

${getLearnedEditorialDirectives().topicDirectives}

${getLearnedEditorialDirectives().titleDirectives}

${getLearnedEditorialDirectives().formatDirectives}

${getLearnedEditorialDirectives().placementDirectives}

${getLearnedEditorialDirectives().graphicDirectives}

STRICT EDITORIAL REQUIREMENTS:
1. WORD COUNT & READING PACING (ISSUE 001 BENCHMARK — 8 TO 13 MINUTES):
   - Medium Benchmark: Issue 001 (Apple Home Collection Teardown) is the golden medium standard (~2,000 narrative body words in <p> tags, ~3,200–3,700 total words including schematics, tables, and callouts; exactly ~10–11 minutes read duration).
   - Strict Tolerance Range: Articles must strictly range from an 8-minute minimum (for punchier single-mechanism teardowns: ~1,500 narrative words) up to a 13-minute maximum (for comprehensive multi-component assemblies: ~2,400 narrative words).
   - Dynamic Target: Aim for 1,900–2,200 narrative words in the body. Never write brief, high-level summaries, and never create exhausting marathons that exceed 13 minutes.
2. TITLE & INTRO HOOK (MORNING DIGEST TONE - CONVERSATIONAL, PLAIN ENGLISH):
   - Title Standard: Use clean, curiosity-inducing, plain-English titles (e.g. "How Laptops Get Featherweight Metal Shells"). Avoid long, dense compound titles or heavy academic jargon.
   - Early Technology Definition & Comparison: In Section 1, immediately define the core technology in vivid, plain-English terms early on, and explicitly contrast why it beats traditional legacy methods.
   - De-Jargonized Section Headings: Clean, punchy headers leading with physical intuition (e.g. "2. The Slurpee State: Why Semi-Solid Metal Flows Like Soft-Serve").
3. SUBTITLE & EXECUTIVE SUMMARY (HIGH-LEVEL OVERVIEW - LIMIT STATS):
   - A captivating, single-sentence narrative hook highlighting the core mechanical tension or physical trade-off at a high level.
   - STRICTLY FORBIDDEN IN SUBTITLES/SUMMARIES: Do NOT cram raw technical stats, multi-variable equations, tolerance numbers, or dimension lists into the subtitle (e.g. NEVER write "Two-phase latent vaporization (h_fg = 2.26 × 10⁶ J/kg) across a 0.09 mm vacuum core achieves 8,000 W/m·K—utilizing 4.8 kPa...").
   - Instead, explain what is being accomplished and why in clean, engaging English (e.g. "How ultra-thin vapor chambers use vacuum evaporation and sintered copper wicks to rapidly pull heat away from cramped smartphone processors.").
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
7. TANGENT ANNOTATIONS & THE "NO-BARE-JARGON" RULE (THE GRIFFITH & TOOL-STEEL RULE):
   - Wrap 4-7 specialized, non-intuitive technical terms in <span class="tangent-term" data-tangent="key"> with rich, educational popover definitions in the "tangents" dictionary so readers learn something new and fascinating each morning.
   - MANDATORY 100% TWO-WAY LINKING RULE: Every single key defined in the "tangents" dictionary MUST be linked at least once in the article text via <span class="tangent-term" data-tangent="key"> (ZERO orphaned/unlinked definitions). Conversely, every data-tangent attribute used in the HTML must have a corresponding entry in "tangents" (ZERO missing definitions).
   - MANDATORY IN-PROSE JARGON TRANSLATION: Never drop advanced physical, materials, mechanical terminology, or proprietary alloy/tool steel brand names (e.g. Griffith micro-flaws, Hertzian contact stress, Taylor dispersion, Thixotropic rosettes, Dean vortices, Kirkendall voids, Böhler M390, Uddeholm Elmax, Dievar, Inconel 718) into the text without an immediate plain-English translation or parenthetical in that same sentence (e.g. "Griffith micro-flaws—microscopic surface scratches that act as stress magnifiers, causing brittle glass to fracture far below its theoretical atomic strength" or "Böhler M390 or Uddeholm Elmax—premium powder-metallurgy super-steels atomized into micro-powder to prevent brittle carbide clumps").
   - A reader must NEVER feel confused or alienated by unexplained academic jargon or proprietary trade names while reading their morning digest. Every article must be clean, welcoming, and deeply educational.
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
      * STRICT BAN ON FREEHAND SVG COMPARISONS, PROCEDURES & KINETIC SIMULATORS:
         - NEVER output interactive sliders, dynamic JS simulation engines, or moving vector components.
         - NEVER draw multi-step process workflows, kinematic sequences, or fluid pipelines inside raw SVG (NO <text>STEP 1</text>, NO <text>STAGE 1</text> inside SVG).
        - NEVER attempt to draw comparison panels, badge callouts, or multi-step processes using raw freehand SVGs with hardcoded text coordinates. Raw SVG coordinates lack font-metrics awareness and inevitably cause micro-coordinate line overlaps, text clipping, or box overflows.
        - NEVER use diffusion AI art for technical mechanisms or schematics (it produces blurry, uninformative blobs).
      * NATIVE HTML COMPARISON COMPONENT (MANDATORY FOR FIG 02 THESIS COMPARISON):
        - Whenever an article introduces a new geometry, mechanism, or architecture that replaces a flawed legacy method (e.g. U-Shape vs. Teardrop Fold, Involute Gear vs. Cycloidal Pin, HPDC vs. Thixomolding Slurry, Thermoblock vs. Dual Boiler), you MUST use the high-end native responsive component inside <div class="schematic-card">:
          <div class="schematic-header">
            <span class="schematic-title">FIG 02 — COMPARISON TITLE</span>
            <span class="schematic-subtitle">SUBTITLE</span>
          </div>
          <div class="comparison-grid">
            <div class="comparison-card flawed-card">
              <div class="comparison-card-tag">PANEL A // TRADITIONAL METHOD</div>
              <h4 class="comparison-card-title">Traditional Flawed Approach</h4>
              <div class="comparison-visual">
                <svg viewBox="0 0 360 140" fill="none" class="comparison-svg">
                  <!-- Clean vector geometry illustrating flawed curve/chassis (NO <text> inside SVG) -->
                </svg>
              </div>
              <div class="comparison-metric-pill danger-pill">
                <span class="pill-label">PRIMARY LIMIT / METRIC:</span>
                <span class="pill-value">Quantified Value / Critical Threshold</span>
                <span class="pill-sub">Failure Criterion: <strong>Critical Limit</strong></span>
              </div>
              <div class="comparison-consequence">
                <strong>• Physical Bottleneck:</strong> Exact engineering limitation.<br>
                <strong>• Failure Mode:</strong> Physical breakdown mechanism.
              </div>
            </div>
            <div class="comparison-card solution-card">
              <div class="comparison-card-tag">PANEL B // ENGINEERED SOLUTION</div>
              <h4 class="comparison-card-title">Engineered Breakthrough Approach</h4>
              <div class="comparison-visual">
                <svg viewBox="0 0 360 140" fill="none" class="comparison-svg">
                  <!-- Clean vector geometry illustrating breakthrough curve/chassis (NO <text> inside SVG) -->
                </svg>
              </div>
              <div class="comparison-metric-pill success-pill">
                <span class="pill-label">PRIMARY ADVANTAGE / METRIC:</span>
                <span class="pill-value">Quantified Value / Safe Regime</span>
                <span class="pill-sub">Safety Factor: <strong>Operating Window</strong></span>
              </div>
              <div class="comparison-consequence">
                <strong>• Physical Solution:</strong> Exact geometric/mechanical innovation.<br>
                <strong>• Reliability:</strong> Measured endurance or performance gain.
              </div>
            </div>
          </div>
          <div class="comparison-banner">
            <strong>CORE PRINCIPLE:</strong> Core physical takeaway summarized in one crisp sentence.
          </div>
          <div class="schematic-caption">
            <span><strong>FIG 02 — TITLE:</strong> Caption description...</span>
            <span class="source-tag">SCHEMATIC: CAD ARCHIVE</span>
          </div>
      * RHYTHMIC VISUAL DENSITY MANDATE (MAX 2-3 PARAGRAPHS PER VISUAL):
        - A visual element MUST appear at least once every 2 to 3 paragraphs across the ENTIRE dispatch.
        - ZERO visual deserts: Sections 4, 5, and 6 MUST each contain an intervening visual anchor (e.g. FIG 03 / FIG 04 teardown/microstructure schematic, or a process-grid sequence).
        - No block of prose may exceed 3 consecutive paragraphs without an intervening visual component.
      * NATIVE HTML VISUAL FLOWCHART / TIMELINE (MANDATORY FOR ALL SEQUENCES & PIPELINES):
        - For 3 to 5 stage kinematic sequences, signal pipelines, or manufacturing workflows, use the connected visual flowchart component:
          <div class="process-grid">
            <div class="process-step-card">
              <div class="process-step-header">
                <span class="process-step-tag">STAGE 01: NAME</span>
                <span class="process-step-arrow">&rarr;</span>
              </div>
              <div class="process-step-title">Stage Title</div>
              <div class="process-step-visual">
                <svg viewBox="0 0 160 52" fill="none" class="flowchart-mini-svg">
                  <!-- Clean, text-free vector graphics illustrating the physical signal/action (NO <text> inside SVG) -->
                </svg>
              </div>
              <p class="process-step-desc">Clear description of physical transformation at this step.</p>
              <div class="process-step-metric">&Delta;t &approx; 200 ps &bull; Output Telemetry</div>
            </div>
            ...
          </div>
        - ZERO <text> TAGS INSIDE .process-step-visual SVGs! All text must be in HTML tags.
      * STRICT LIMITS FOR SVG (ONLY FOR SINGLE-AXIS CROSS-SECTIONS):
        - SVG is ONLY permitted for single-axis mechanical cutaways (e.g. FIG 04 CAD schematic). It must be a simple linear component with vast breathing room.
        - ZERO TEXT COLLISION, BADGE PROPORTIONALITY & VIEWBOX RULES:
          * Every <text> element inside an <svg> MUST explicitly specify font-family="'JetBrains Mono', monospace" and font-size between 10.5 and 13.
          * BADGE BOX BOUNDS: All text inside badge rects must have at least 15px horizontal and vertical padding.
          * GRAPHIC DECOUPLING: Never place callout badges directly on top of physical mechanism geometry. Use dedicated margin whitespace and dashed leader lines.
          * CONTRAST IMMUNITY: All callout badges must use high-contrast dark pills (<rect fill="#18181B" stroke="#ACCENT" rx="6"/>) with bright accent text (fill="#38BDF8", fill="#34D399", fill="#F87171"). Outside pills, text must use deep accessible tones.
RETURN ONLY VALID JSON WITH THIS EXACT STRUCTURE (no markdown fence, no surrounding commentary, and ensure all LaTeX math backslashes like \\frac, \\approx, \\rho, \\mu, \\Delta are strictly escaped as double backslashes within JSON string values):
{
  "title": "Clean Plain-English Title",
  "subtitle": "High-level single-sentence narrative hook explaining what is discussed conceptually without dense stats or equations.",
  "subject": "Discipline Name (One of the 8)",
  "tangents": {
    "key1": {
      "tag": "DISCIPLINE // TOPIC",
      "title": "Concept Title",
      "body": "<p>Detailed definition.</p><div class=\\"modal-equation-box\\"><div class=\\"math-label\\">Concept:</div>$$Formula$$<div class=\\"math-meta\\">Legend</div></div><p>Engineering application.</p>"
    }
  },
  "article_html": "full article html starting with <div class=\"meta-line\">...<h1>Title</h1><p class=\"subtitle\">Subtitle</p><figure class=\"product-figure\"><div class=\"img-wrapper\"><img ...></div><figcaption><span><strong>FIG 01 — TITLE:</strong> ...</span><span class=\"source-tag\">...</span></figcaption></figure><h2>1. ... through <h2>6. ... and ending with an executive summary dashboard <div class=\"executive-metrics-bar\"><div class=\"metric-cell\"><span class=\"metric-cell-label\">LABEL</span><span class=\"metric-cell-val\">VAL</span><span class=\"metric-cell-sub\">SUB</span></div>... (4 cells total)</div>. Do NOT output reader voting buttons (telemetry-bar is injected automatically)."
}`;

  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-2.5-flash'
  ];

  let rawContent = null;
  let lastError = null;
  let successfulEndpoint = null;

  for (const model of candidateModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Calling Gemini API with ${model}${attempt > 1 ? ` (attempt ${attempt}/${maxAttempts})` : ''}...`);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.3,
              maxOutputTokens: 65536
            }
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`Model ${model} returned error (${response.status}): ${errText.slice(0, 200)}...`);
          lastError = new Error(`Gemini API error (${response.status}): ${errText}`);

          // Retry on 503 (High Demand), 429 (Rate Limit / Quota Spikes), or 5xx transient server errors
          if ((response.status === 503 || response.status === 429 || response.status >= 500) && attempt < maxAttempts) {
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`Temporary API error (${response.status}). Waiting ${delay}ms before retrying ${model}...`);
            await new Promise(res => setTimeout(res, delay));
            continue;
          }
          break;
        }

        const resJson = await response.json();
        const candidate = resJson.candidates?.[0];
        if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
          console.warn(`Model ${model} completed with finishReason: ${candidate.finishReason}`);
          if (candidate.finishReason === 'MAX_TOKENS') {
            lastError = new Error(`Model ${model} output was truncated due to MAX_TOKENS.`);
            continue;
          }
        }
        rawContent = candidate?.content?.parts?.[0]?.text;
        if (rawContent) {
          console.log(`Successfully received content from ${model}.`);
          successfulEndpoint = endpoint;
          break;
        }
      } catch (err) {
        console.warn(`Attempt ${attempt} with ${model} failed: ${err.message}`);
        lastError = err;
        if (attempt < maxAttempts) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(res => setTimeout(res, delay));
        }
      }
    }

    if (rawContent) break;
  }

  if (!rawContent) {
    throw lastError || new Error("All Gemini models failed to generate content.");
  }

  const articleData = safeJsonParse(rawContent);
  console.log(`Generated: "${articleData.title}" (${articleData.subject})`);

  // Deterministic Header Assembly: Ensure canonical meta-line, h1, and subtitle are present
  const subClass = `sub-${(articleData.subject || 'Hardware').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const dynamicReadMins = calculateReadTime(articleData.article_html);
  const canonicalMetaLine = `<div class="meta-line">\n  <span>ISSUE ${nextId}</span><span>•</span><span class="archive-subject-tag ${subClass}">${(articleData.subject || 'HARDWARE').toUpperCase()}</span><span>•</span><span id="read-time-badge">${dynamicReadMins} MIN READ</span>\n</div>`;

  if (/<div class="meta-line">[\s\S]*?<\/div>/i.test(articleData.article_html)) {
    articleData.article_html = articleData.article_html.replace(/<div class="meta-line">[\s\S]*?<\/div>/i, canonicalMetaLine);
  } else {
    articleData.article_html = canonicalMetaLine + '\n\n' + articleData.article_html;
  }

  if (!/<h1\b/i.test(articleData.article_html)) {
    articleData.article_html = articleData.article_html.replace(canonicalMetaLine, `${canonicalMetaLine}\n\n<h1>${articleData.title}</h1>\n<p class="subtitle">\n  ${articleData.subtitle}\n</p>`);
  }

  // Hero image verification: never trust the LLM's guessed <img> URL.
  // Curated reference -> vision-verified web candidate -> otherwise flag for human review.
  try {
    const hero = await selectHeroImage({ title: articleData.title, subject: articleData.subject, apiKey });
    if (hero) {
      articleData.article_html = articleData.article_html.replace(
        /(<figure class="product-figure">[\s\S]*?<img\b[^>]*?\bsrc=")[^"]*(")/i,
        `$1${hero.src}$2`
      );
      console.log(`Hero image: ${hero.src} (${hero.source}${hero.score ? `, vision score ${hero.score}` : ''})`);
    } else {
      console.log(`::warning title=Hero image needs review::No verified hero image for "${articleData.title}". Add references to content/visual-references.json (set hero_ok:true) and re-run.`);
    }
  } catch (heroErr) {
    console.warn(`Hero image verification skipped: ${heroErr.message}`);
  }

  // Deterministic Executive Metrics & Telemetry Assembly
  // 1. Auto-heal if model used .telemetry-bar for metrics
  articleData.article_html = articleData.article_html.replace(/<div class="telemetry-bar">([\s\S]*?)<\/div>/gi, (match, inner) => {
    if (inner.includes('telemetry-cell') || inner.includes('metric-cell') || (!inner.includes('telemetry-actions') && !inner.includes('telemetry-info'))) {
      const fixedInner = inner
        .replace(/\btelemetry-cell\b/g, 'metric-cell')
        .replace(/\btelemetry-label\b/g, 'metric-cell-label')
        .replace(/\btelemetry-val\b/g, 'metric-cell-val')
        .replace(/\btelemetry-sub\b/g, 'metric-cell-sub');
      return `<div class="executive-metrics-bar">\n${fixedInner.trim()}\n</div>`;
    }
    return match;
  });

  articleData.article_html = articleData.article_html.replace(/<div class="executive-metrics-bar">([\s\S]*?)<\/div>/gi, (match, inner) => {
    const fixedInner = inner
      .replace(/\btelemetry-cell\b/g, 'metric-cell')
      .replace(/\btelemetry-label\b/g, 'metric-cell-label')
      .replace(/\btelemetry-val\b/g, 'metric-cell-val')
      .replace(/\btelemetry-sub\b/g, 'metric-cell-sub');
    return `<div class="executive-metrics-bar">\n${fixedInner.trim()}\n</div>`;
  });

  // 2. Ensure telemetry voting bar is ALWAYS present at the end
  if (!articleData.article_html.includes('id="telemetry-up"') || !articleData.article_html.includes('class="telemetry-actions"')) {
    articleData.article_html = articleData.article_html.replace(/<div class="telemetry-bar">\s*<\/div>/gi, '');
    articleData.article_html += `\n<div class="telemetry-bar">
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
</div>\n`;
  }

  // Deterministic Auto-Sanitizer + Global SVG Geometry Validation Gate
  articleData.article_html = autoSanitizeArticleHtml(articleData.article_html);
  let lintErrors = validateArticleHtml(articleData.article_html, `${nextFileId}.json`);
  if (lintErrors.length > 0) {
    console.warn(`Detected ${lintErrors.length} schematic/media issue(s). Running automated SVG repair pass...`);
    const repairPrompt = `Fix the following SVG geometry / text collision / viewBox clipping errors in this article_html without removing any technical content:\n${lintErrors.join('\n')}\n\nReturn ONLY JSON: { "article_html": "..." }\n\nCURRENT HTML:\n${articleData.article_html}`;
    try {
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
      } else {
        console.warn(`Automated SVG repair pass returned status ${repairRes.status}. Continuing with sanitized original.`);
      }
    } catch (repairErr) {
      console.warn(`Automated SVG repair pass failed (${repairErr.message}). Continuing with sanitized original.`);
    }
  }

  // Ensure read-time badge in meta-line is dynamically calibrated to 8-13 min window (Issue 001 benchmark)
  const finalReadMins = calculateReadTime(articleData.article_html);
  articleData.article_html = articleData.article_html.replace(
    /(<span id="read-time-badge">)[\s\S]*?(<\/span>)/i,
    `$1${finalReadMins} MIN READ$2`
  );

  // Reconcile tangents: ensure all definitions in 'tangents' are referenced in article_html
  if (articleData.tangents) {
    const dictKeys = Object.keys(articleData.tangents);
    for (const key of dictKeys) {
      if (!articleData.article_html.includes(`data-tangent="${key}"`)) {
        const tangentObj = articleData.tangents[key];
        const title = tangentObj?.title || key.replace(/[-_]+/g, ' ');
        const cleanTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const keyWords = key.replace(/[-_]+/g, ' ').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const termRegex = new RegExp(`\\b(${cleanTitle}|${keyWords})\\b`, 'i');
        if (termRegex.test(articleData.article_html)) {
          let replaced = false;
          articleData.article_html = articleData.article_html.replace(termRegex, (match) => {
            if (!replaced) {
              replaced = true;
              return `<span class="tangent-term" data-tangent="${key}">${match}</span>`;
            }
            return match;
          });
        } else {
          console.warn(`Pruning unreferenced tangent definition '${key}' from dictionary.`);
          delete articleData.tangents[key];
        }
      }
    }
  }

  // Ensure any data-tangent terms in HTML have an entry in tangents
  const htmlKeys = [...(articleData.article_html || '').matchAll(/data-tangent="([^"]+)"/g)].map(m => m[1]);
  if (!articleData.tangents) articleData.tangents = {};
  for (const hk of htmlKeys) {
    if (!articleData.tangents[hk]) {
      const cleanName = hk.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      articleData.tangents[hk] = {
        tag: `${(articleData.subject || 'HARDWARE').toUpperCase()} // SPECIFICATION`,
        title: cleanName,
        body: `<p>Engineering definition and first-principles operating context for ${cleanName}.</p>`
      };
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

  // 3B. Write Next.js MDX file: content/issues/{num}.mdx
  const issueMdxPath = path.join(CONTENT_DIR, 'issues', `${nextFileId}.mdx`);
  const readTime = calculateReadTime(articleData.article_html || '');
  const mdxContent = `---
issue: "${nextFileId}"
title: "${articleData.title.replace(/"/g, '\\"')}"
subtitle: "${(articleData.subtitle || '').replace(/"/g, '\\"')}"
date: "${isoDate}"
subject: "${articleData.subject || 'Hardware'}"
readTime: "${readTime} min"
---

${(articleData.article_html || '').trim()}
`;
  await fs.writeFile(issueMdxPath, mdxContent, 'utf-8');
  console.log(`Saved Next.js MDX to ${issueMdxPath}`);

  // 4. Write Markdown archive mirror
  const slug = articleData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const mdPath = path.join(CONTENT_DIR, `${isoDate}-${slug}.md`);
  const mdContent = (articleData.article_html || '').trim() + '\n';
  await fs.writeFile(mdPath, mdContent, 'utf-8');
  console.log(`Saved Markdown archive to ${mdPath}`);

  // 5. Update index.html / legacy/index.html TOPICS catalog if available
  if (targetHtmlPath && html) {
    try {
      const shortTitle = articleData.shortTitle || (articleData.title.includes(':') ? articleData.title.split(':')[0].trim() : articleData.title);
      const topicEntry = `      { id: "${nextId}", subject: "${articleData.subject}", title: "${articleData.title}", shortTitle: "${shortTitle}", status: "Published", date: "${dateStr}" },\n`;
      const updatedHtml = html.replace(/(const TOPICS = \[\r?\n)/, `$1${topicEntry}`);
      await fs.writeFile(targetHtmlPath, updatedHtml, 'utf-8');
      console.log(`Registered ${nextId} in ${path.basename(targetHtmlPath)} TOPICS catalog`);
    } catch (err) {
      console.warn(`Could not update ${targetHtmlPath}:`, err.message);
    }
  }

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
