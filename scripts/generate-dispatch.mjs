import fs from 'fs/promises';
import path from 'path';

const INDEX_PATH = path.join(process.cwd(), 'index.html');
const CONTENT_DIR = path.join(process.cwd(), 'content');

// 8 Core Disciplines in strict round-robin rotation
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

// Rich Discipline Catalysts to stimulate diverse, cross-industry topics
const DISCIPLINE_CATALYSTS = {
  "Manufacturing": [
    "Precision micro-tooling (2-micron EDM, optical diamond turning, mirror cavity finishes)",
    "Metal Injection Molding (MIM): Catalytic debinding, sintering shrinkage kinetics, and density limits",
    "Semi-solid thixomolding of AZ91D magnesium alloys for lightweight structural skeletons",
    "High-speed 5-axis CNC machining: Tool deflection compensation, chatter harmonics, and fixture datum design",
    "Liquid Silicone Rubber (LSR) optical two-shot overmolding and flashing control",
    "Ultrasonic welding of dissimilar aerospace alloys and energy director geometries",
    "Wafer-level chip-scale packaging (WLCSP) and sub-micron flip-chip underfill rheology"
  ],
  "Mechanisms": [
    "Continuous rotational barrel cams: Track kinematics, return spring preload, and tactile detents",
    "Harmonic drive strain-wave gearing: Flexspline fatigue, wave generator ellipticity, and zero backlash",
    "Cycloidal speed reducers: Lobed pin-wheel geometry, eccentric bearings, and high shock-load capacity",
    "Geneva indexing mechanisms: Kinematic acceleration curves, lock rings, and shock absorption",
    "Monolithic planar flexure stages: Beryllium-copper leaf springs, infinite fatigue, and sub-micron travel",
    "Bistable compliant snap-action mechanisms: Over-center kinematics, tactile snap ratio, and FEA non-linear buckling",
    "Constant-force spring reels and counterbalanced multi-bar linkages"
  ],
  "Materials": [
    "Shape Memory Alloys (Nitinol): Martensitic phase transformation, superelastic hysteresis, and medical stent fatigue",
    "Pyrolytic graphite thermal spreaders: Extreme planar anisotropy (1,800 W/m·K) vs. through-plane insulation",
    "Chemical glass strengthening: Potassium-sodium ion-exchange salt baths, Depth of Layer (DOL), and surface compression",
    "Structural technical ceramics (Y-TZP Zirconia, Alumina): Grain boundary transformation toughening and diamond grinding",
    "Carbon fiber reinforced composites (CFRP): Anisotropic ply layups, thermal expansion matching (zero CTE), and delamination",
    "High-performance engineering polymers (PEEK 450G, Torlon, Ultem 1000): Tribological wear rates, creep under clamp load, and glass transitions",
    "Bulk metallic glasses (amorphous liquid metals): Viscous supercooled forming and razor-thin spring limits"
  ],
  "Design": [
    "Precision tolerance stack-up analysis: Worst-case arithmetic vs. RSS 6-sigma statistical budgeting across multi-part assemblies",
    "Exact-constraint kinematic design: Kelvin and Maxwell mounts, Hertzian contact point constraints, and thermal relief",
    "Dynamic elastomeric sealing glands: O-ring and quad-ring compression set, squeeze percentages, and IP68/IP69K vacuum decay testing",
    "Threaded fastener torque-tension kinematics: The 50-40-10 rule (thread friction, under-head bearing friction, bolt stretch), and prevailing torque nuts",
    "Coefficient of Thermal Expansion (CTE) mismatch: Designing stress-free glass-to-metal and ceramic-to-aluminum joints",
    "Dynamic drop-shock survivability: 500G impact deceleration, progressive elastomeric crash stops, and internal component retention"
  ],
  "Fluids": [
    "Microfluidic capillary pumping: Surface energy wettability, contact angle hysteresis, and passive hydrophobic burst valves",
    "Laminar boundary layer insulation in narrow heat conduits: Reynolds transition limits, thermal sheathing, and static turbulator trips",
    "Cavitation erosion in high-pressure hydraulic pumps: Bubble collapse shockwaves, implosion velocity, and surface pitting",
    "Non-Newtonian fluid shear-thickening damping in rotary shock absorbers",
    "Venturi vacuum generators: Supersonic nozzle geometry, fluid expansion ratios, and pneumatic pickup reliability",
    "High-pressure hydrodynamic rotary lip seals: Pumping wave micro-ridges and frictional heat dissipation",
    "Acoustic jet droplet atomization and piezo-driven fluid micro-dispensing"
  ],
  "Electromechanical": [
    "Linear Voice Coil Motors (VCMs): Lorentz force dynamics, radial magnetic air gaps, and whisper-quiet sub-micron positioning",
    "Piezoelectric ultrasonic motors: Standing-wave elliptical friction drives and non-magnetic holding torque",
    "Linear Resonant Actuators (LRAs): Spring-mass natural frequency tuning, back-EMF braking, and tactile transient crispness",
    "Reflective optical linear encoders: Photolithographic chrome-on-glass scales, 256x quadrature interpolation, and nanometer metrology",
    "High-reliability electrical slip rings: Gold-on-gold wire brush tribology and capacitive gigabit signal isolation",
    "Bistable magnetic latching solenoids: Permanent magnet holding flux, pulse de-latching, and zero idle power"
  ],
  "Thermal": [
    "Two-phase vapor chambers vs. sintered copper heat pipes: Capillary pumping pressure, wick permeability, and dryout heat flux limits",
    "Loop Heat Pipes (LHPs): Evaporator wick pore sizing, reverse flow vapor locks, and gravity-independent aerospace routing",
    "Volumetric thermal mass damping: Transient sensible heat absorption in high-power pulsed electronics",
    "Thermoelectric Peltier coolers (TECs): Thermal choke phenomena, Seebeck back-voltage, and junction thermal resistance",
    "Dielectric immersion liquid cooling: Fluid dielectric breakdown, natural convective buoyancy plumes, and component compatibility",
    "Radiative thermal dissipation in vacuum environments: Emissivity surface treatments and passive cryogenic shielding"
  ],
  "Product Dives": [
    "Flagship consumer hardware teardowns: Camera OIS voice coil suspensions, fold-flat hinge kinematics, and acoustic seal membranes",
    "Minimally invasive surgical robotics: Articulated cable-driven wrist end-effectors and sterilized biocompatible metallurgy",
    "Space satellite deployment mechanisms: Solar array shape-memory hinges, motorized reaction wheels, and star tracker optical mounts",
    "Electric vehicle battery packs: Laser-welded aluminum busbars, liquid cold-plate thermal interface materials (TIM), and structural potting",
    "Professional cinema camera sensor modules: Thermoelectric active Peltier sensor chillers, optical low-pass filter mounts, and magnesium chassis heat spreaders",
    "Precision coordinate measuring metrology: Monolithic granite tables, air bearing guide rails, and laser interferometer tracking"
  ]
};

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable is missing.");
    process.exit(1);
  }

  console.log("Reading index.html...");
  const html = await fs.readFile(INDEX_PATH, 'utf-8');

  // Discover latest issue number (supports 1 to 5+ digits, e.g. #002, #999, #1000)
  const issueMatch = html.match(/"#(\d+)":/);
  const latestNum = issueMatch ? parseInt(issueMatch[1], 10) : 2;
  const nextNum = latestNum + 1;
  const nextId = `#${String(nextNum).padStart(3, '0')}`;

  // Determine publication date
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const isoDate = now.toISOString().split('T')[0];

  // Rotate strictly across the 8 core disciplines
  const subjectIndex = (nextNum - 3 + SUBJECTS.length) % SUBJECTS.length;
  const currentSubject = SUBJECTS[subjectIndex];

  // Extract past titles to guarantee zero topic overlap
  const pastTitles = [...html.matchAll(/title:\s*"([^"]+)"/g)].map(m => m[1]);
  const recentTitlesList = pastTitles.slice(0, 30).map(t => `• ${t}`).join('\n');

  // Select inspirational catalysts for today's subject
  const catalysts = DISCIPLINE_CATALYSTS[currentSubject] || [];
  const catalystSuggestions = catalysts.map(c => `  - ${c}`).join('\n');

  console.log(`Generating Issue ${nextId} for ${dateStr} [${currentSubject}]...`);

  const prompt = `You are a Principal Hardware / Mechanical Systems Engineer authoring today's dispatch for "Engineering Deep Dive".
Your audience consists of elite Product Design Engineers (PD), Mechanical Engineers (ME), and Hardware Architects who demand first-principles physics, real-world DFM tolerances, and deep kinematic/thermal teardowns.

DISCIPLINE FOR TODAY: ${currentSubject}

RECENTLY PUBLISHED TITLES (DO NOT DUPLICATE OR CLOSELY OVERLAP WITH ANY OF THESE):
${recentTitlesList}

TOPIC SELECTION & DIVERSITY MANDATE:
1. Choose a NOVEL, deeply technical, and fascinating engineering topic under "${currentSubject}".
2. Draw inspiration across diverse high-engineering domains (Aerospace & Satellites, Surgical Robotics & Medical Devices, Consumer Electronics & Flagships, EV Powertrains & Inverters, High-Precision Metrology & Optics, Extreme Industrial Tooling, or Everyday Micro-Mechanisms).
3. INSPIRATIONAL DOMAIN CATALYSTS FOR ${currentSubject.toUpperCase()}:
${catalystSuggestions}
4. THE CORE ENGINEERING DILEMMA: Every topic MUST be centered around a real, uncompromising physical or mechanical dilemma where optimizing one engineering parameter threatens another (e.g. stiffness vs. inertia, thermal dissipation vs. dielectric clearance, wear life vs. contact friction, sealing compression vs. insertion drag).

STRICT EDITORIAL REQUIREMENTS:
1. WORD COUNT: The article body MUST be between 2,750 and 3,300 words (strictly 12 to 15 minutes read duration at 220 WPM). Never write high-level overviews or brief summaries.
2. TITLE: Direct, clean, topic-first format (e.g. "Harmonic Drive Gearboxes: Strain Wave Kinematics and Tooth Fatigue" or "Pyrolytic Graphite Heat Spreaders: Thermal Anisotropy in Ultra-Thin Devices").
3. SUBTITLE: A captivating, single-sentence narrative hook highlighting the core mechanical tension or engineering trade-off without meta-announcements or filler.
4. STRUCTURE: 6 detailed, deeply technical sections with numbers:
   - 1. Governing Physics & First Principles (Equations, quantitative load paths, boundary conditions)
   - 2. Component Architecture & Part-Level Anatomy (Detailed exploded breakdown, physical packaging)
   - 3. Manufacturing, Tooling & DFM Clearances (GD&T tolerances in microns, tooling steels, surface finish Ra, draft angles)
   - 4. Metallurgy & Materials Science (Exact alloy codes e.g. 6061-T6, 7075, 316L, Ti-6Al-4V, PEEK 450G, Delrin 500P, stress-strain, thermal conductivity)
   - 5. Failure Modes, Wear Tribology & Reliability Degradation (Fatigue limits, cycle life, wear mechanisms, environmental stress)
   - 6. Empirical Bench Metrology & Validation (Laser interferometry, strain gauges, Scace/load cell sensors, high-frequency telemetry)
5. QUANTITATIVE EQUATIONS: Include explicit mathematical formulas with variable definitions and real calculated values.
6. SPEC COMPARISON TABLE: Include an HTML <table> with class="spec-table" inside a <div class="spec-table-wrap"> comparing 4-5 engineering architectures or materials across 5 technical metrics.
7. TANGENT ANNOTATIONS: Wrap 4-6 specialized, non-intuitive technical terms in <span class="tangent-term" data-tangent="key">. In the "tangents" dictionary, provide their category tag, title, and detailed junior-friendly definition with a governing formula.
8. VISUAL & DIAGRAM ARCHITECTURE (STRICT SET-AND-FORGET STANDARD):
   - ZERO GENERATED RASTER IMAGES: Do NOT attempt to generate AI images or CAD cutaways.
   - VERIFIED PUBLIC TECHNICAL MEDIA ONLY: Only embed figures if referencing authentic, verified OEM press photography or patent drawings with exact technical captions. Never use generic stock photography (e.g. Unsplash). If no verified image is available, omit raster images entirely.
   - MINIMALIST SYSTEM BLOCK DIAGRAMS: When illustrating architectures, use strictly clean, high-level horizontal or vertical block flowcharts with ample whitespace (standard rectangular subsystem nodes, orthogonal non-intersecting directional arrows) or clean typographic specification cards. Never attempt complex multi-curved fluid loops or overlapping annotations.
   - CODE-DRIVEN INTERACTION & METRICS: Emphasize interactive tangent hover popovers, LaTeX formula callouts, and clean HTML spec comparison tables, which are 100% reliable, responsive, and code-controlled.

RETURN ONLY VALID JSON WITH THIS EXACT STRUCTURE (no markdown fence, no other text):
{
  "title": "Topic-First Title",
  "subtitle": "Single-sentence narrative hook.",
  "subject": "${currentSubject}",
  "tangents": {
    "key1": {
      "tag": "DISCIPLINE // TOPIC",
      "title": "Concept Title",
      "body": "<p>Detailed definition.</p><div class=\\"modal-equation-box\\">Formula with variables</div><p>Engineering application.</p>"
    }
  },
  "article_html": "full article html starting with <h2>1. ..."
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
  console.log(`Generated dispatch: "${data.title}" [${data.subject}]`);

  // Calculate dynamic reading time estimate
  const wordCount = (data.article_html.replace(/<[^>]+>/g, ' ').match(/\S+/g) || []).length;
  const readMinutes = Math.max(10, Math.round(wordCount / 220));

  // Build Article HTML Wrapper
  const cleanArticleHtml = `
          <div class="meta-line">
            <span>ISSUE ${nextId}</span><span>•</span><span>${data.subject.toUpperCase()}</span><span>•</span><span id="read-time-badge">${readMinutes} MIN READ</span>
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

  // Syntax-safe escaping of backticks and template expressions before injection into index.html
  const safeArticleHtml = cleanArticleHtml
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\${/g, '\\${');

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
  const newArticleCode = `      "${nextId}": \`\n${safeArticleHtml.trim()}\n      \`,\n`;
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
read_time: "${readMinutes} min read"
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
