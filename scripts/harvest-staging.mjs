import fs from 'fs';
import path from 'path';
import { searchDuckDuckGoImages, searchPremiumHardwareMedia, loadEnvFile } from './fetch-media.mjs';

loadEnvFile();

const STAGING_DIR = path.resolve('staging');
const VETOES_PATH = path.resolve('content/vetoes.json');
const MEMORY_PATH = path.resolve('content/curation-memory.json');
const TARGET_CAPACITY = 40;

const MODELS = ['gemini-3.8-flash', 'gemini-2.5-flash'];

const SUBJECTS = [
  'Manufacturing',
  'Mechanisms',
  'Materials',
  'Design',
  'Fluids',
  'Electromechanical',
  'Thermal',
  'Product Dives'
];

async function callGemini(prompt, apiKey) {
  for (const model of MODELS) {
    try {
      console.log(`[Harvester] Querying Gemini model: ${model}...`);
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7
          }
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[Harvester] Model ${model} failed (HTTP ${res.status}): ${errText.slice(0, 150)}`);
        continue;
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        return JSON.parse(rawText);
      }
    } catch (err) {
      console.warn(`[Harvester] Exception with ${model}:`, err.message);
    }
  }
  return null;
}

async function fetchCandidateImages(query, limit = 12) {
  let images = [];
  try {
    const ddg = await searchDuckDuckGoImages(query, limit * 2);
    images = ddg.map(img => ({
      url: img.url,
      title: img.title || query,
      source: 'Web Search / Teardown'
    }));
  } catch (e) {
    console.warn(`[Harvester] Image search error for "${query}":`, e.message);
  }

  // Deduplicate and slice to limit
  const seen = new Set();
  const deduped = [];
  for (const img of images) {
    if (!seen.has(img.url) && !img.url.includes('wikimedia.org')) {
      seen.add(img.url);
      deduped.push(img);
    }
    if (deduped.length >= limit) break;
  }

  // Fallback to high quality engineering unsplash images if fewer than limit
  const fallbackUnsplash = [
    'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=2000',
    'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&q=80&w=2000',
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=2000',
    'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&q=80&w=2000',
    'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&q=80&w=2000'
  ];

  let fallbackIdx = 0;
  while (deduped.length < limit) {
    deduped.push({
      url: fallbackUnsplash[fallbackIdx % fallbackUnsplash.length],
      title: `${query} Reference #${deduped.length + 1}`,
      source: 'Unsplash Engineering'
    });
    fallbackIdx++;
  }

  return deduped.slice(0, limit);
}

export async function harvestStaging() {
  if (!fs.existsSync(STAGING_DIR)) {
    fs.mkdirSync(STAGING_DIR, { recursive: true });
  }

  const existingFiles = fs.readdirSync(STAGING_DIR).filter(f => f.endsWith('.json'));
  const currentCount = existingFiles.length;
  console.log(`[Harvester] Current staging capacity: ${currentCount} / ${TARGET_CAPACITY} drafts.`);

  if (currentCount >= TARGET_CAPACITY) {
    console.log(`[Harvester] Queue is full (${currentCount} >= ${TARGET_CAPACITY}). Exiting cleanly.`);
    return;
  }

  const needed = Math.min(TARGET_CAPACITY - currentCount, 5); // Harvest in batches of up to 5
  console.log(`[Harvester] Harvesting ${needed} new draft(s)...`);

  // Load vetoes
  let vetoes = [];
  if (fs.existsSync(VETOES_PATH)) {
    try {
      vetoes = JSON.parse(fs.readFileSync(VETOES_PATH, 'utf8'));
    } catch {}
  }
  const vetoSummary = vetoes.map(v => `- "${v.topic || v.title}": ${v.reason}`).slice(-15).join('\n');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Harvester] No GEMINI_API_KEY detected. Seeding sample categorized drafts for local verification.');
    await seedLocalDrafts();
    return;
  }

  for (let i = 0; i < needed; i++) {
    const subject = SUBJECTS[(currentCount + i) % SUBJECTS.length];
    console.log(`\n[Harvester] [${i + 1}/${needed}] Generating candidate draft for subject: "${subject}"...`);

    const prompt = `You are the lead engineering curator for "Engineering Deep Dive", an elite mechanical hardware analysis newsletter.
Generate 1 comprehensive, production-ready draft for the category: "${subject}".

NEGATIVE CONSTRAINTS (VETOED TOPICS - NEVER REPEAT OR EMULATE):
${vetoSummary || 'None recorded yet.'}

EDITORIAL GUIDELINES:
- Focus on real physical mechanisms, micro-architectures, DFM trade-offs, kinematics, fluid/thermal physics, or metallurgy.
- Include concrete engineering numbers (tolerances in microns, pressures in Bar, torque in N·m, thermal conductivity in W/mK).
- Write structured technical content with equations and clear physical principles.

Return ONLY a valid JSON object matching this schema:
{
  "slug": "kebab-case-concise-slug",
  "title": "Clean, Topic-First Plain English Title",
  "subtitle": "Single-sentence narrative hook detailing the core physical trade-off.",
  "subject": "${subject}",
  "category": "${subject}",
  "readTime": "9 min",
  "summary": "2-sentence executive summary.",
  "tags": ["Tag1", "Tag2", "Tag3"],
  "figures": [
    {
      "id": "FIGURE_0",
      "placeholder": "{{ FIGURE_0 }}",
      "search_query": "specific search terms for real hardware teardown photograph",
      "caption": "FIG 01 — TITLE: Explanatory caption highlighting specific hardware components.",
      "source": "TEARDOWN ARCHIVE"
    },
    {
      "id": "FIGURE_1",
      "placeholder": "{{ FIGURE_1 }}",
      "search_query": "specific search terms for internal cross-section or SEM micrograph",
      "caption": "FIG 02 — ARCHITECTURE: Cross-sectional teardown analysis.",
      "source": "METROLOGY LAB"
    }
  ],
  "body_mdx": "## 1. Governing Mechanics\\n\\nDetailed analysis...\\n\\n{{ FIGURE_0 }}\\n\\n## 2. Component Architecture & Micro-Structures\\n\\nTechnical breakdown...\\n\\n{{ FIGURE_1 }}\\n\\n## 3. Manufacturing Tolerances & DFM\\n\\nTolerances and failure modes..."
}`;

    const draftData = await callGemini(prompt, apiKey);
    if (!draftData || !draftData.title) {
      console.warn(`[Harvester] Failed to generate draft for ${subject}. Skipping.`);
      continue;
    }

    console.log(`[Harvester] Sourcing 12 candidate images per figure for "${draftData.title}"...`);
    const enrichedFigures = [];
    for (const fig of (draftData.figures || [])) {
      const candidates = await fetchCandidateImages(fig.search_query || draftData.title, 12);
      enrichedFigures.push({
        ...fig,
        selectedIndex: 0,
        images: candidates
      });
    }

    draftData.figures = enrichedFigures;
    draftData.date = new Date().toISOString().split('T')[0];

    const slug = draftData.slug || draftData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    const filename = `${String(currentCount + i + 1).padStart(3, '0')}-${slug}.json`;
    const destPath = path.join(STAGING_DIR, filename);

    fs.writeFileSync(destPath, JSON.stringify(draftData, null, 2), 'utf8');
    console.log(`[Harvester] ✓ Saved draft to staging/${filename}`);
  }

  console.log(`\n[Harvester] Harvesting run complete! Staging capacity now: ${fs.readdirSync(STAGING_DIR).filter(f => f.endsWith('.json')).length} / ${TARGET_CAPACITY}`);
}

async function seedLocalDrafts() {
  const seedTopics = [
    {
      slug: 'silicon-micro-nozzles-piezo-inkjet',
      title: 'Silicon Micro-Nozzles: Bosch-Process DRIE in Industrial Piezo Printheads',
      subtitle: 'How deep reactive-ion etching overcomes fluid cavitation and acoustic crosstalk at 50 kHz droplet firing rates.',
      subject: 'Fluids',
      category: 'Fluids',
      readTime: '9 min',
      summary: 'Deep dive into piezoelectric MEMS inkjet printheads, silicon micromachining via Bosch DRIE, and meniscus pinning.',
      tags: ['MEMS', 'Fluids', 'Silicon Micromachining', 'Piezo'],
      figures: [
        {
          id: 'FIGURE_0',
          placeholder: '{{ FIGURE_0 }}',
          search_query: 'piezoelectric inkjet printhead silicon nozzle teardown cross section',
          caption: 'FIG 01 — THE SILICON NOZZLE ARRAY: High-aspect ratio DRIE etched micro-nozzles showing sub-micron sidewall scallops.',
          source: 'MEMS MICROLITHOGRAPHY ARCHIVE'
        },
        {
          id: 'FIGURE_1',
          placeholder: '{{ FIGURE_1 }}',
          search_query: 'piezoelectric actuator lead zirconate titanate PZT membrane printhead',
          caption: 'FIG 02 — PZT ACTUATOR STACK: Thin-film PZT transducer bonded to silicon acoustic cavity.',
          source: 'ACOUSTICS METROLOGY'
        }
      ],
      body_mdx: `## 1. The Acoustic Waveguide Bottleneck

In high-speed drop-on-demand (DoD) piezoelectric printheads, fluid ejection is governed by acoustic wave propagation rather than mechanical displacement. When a piezoelectric transducer (PZT) pulses, it launches an acoustic pressure wave through a microscopic fluid channel.

{{ FIGURE_0 }}

### Governing Acoustic Impedance
The pressure wave travels at the acoustic velocity of the ink ($c \\approx 1200 - 1500 \\text{ m/s}$), reflecting off channel boundaries:

$$\\Delta P = \\rho \\cdot c \\cdot \\Delta v$$

If the nozzle geometry deviates by even $\\pm 0.3 \\mu\\text{m}$, acoustic reflections cause phase cancellation, leading to droplet misdirection and meniscus rupture.

## 2. Micro-Machining via Bosch Deep Reactive-Ion Etching (DRIE)

To achieve perpendicular sidewall angles ($89.8^\\circ \\pm 0.1^\\circ$) through $100 \\mu\\text{m}$ thick silicon wafers, manufacturers rely on the cyclic Bosch DRIE process.

{{ FIGURE_1 }}

<ProcessFlow>
  <ProcessStep step="01" title="SF6 Plasma Etch Cycle" parameters="1.2s pulse • 800W RF">
    Isotropic chemical etch driven by fluorine radicals cuts into the exposed silicon substrate.
  </ProcessStep>
  <ProcessStep step="02" title="C4F8 Passivation Cycle" parameters="0.8s pulse • Teflon-like film">
    Polymer layer deposits over the floor and sidewalls to inhibit lateral undercut.
  </ProcessStep>
  <ProcessStep step="03" title="Directional Ion Sputtering" parameters="200V bias • Sub-50nm scallops">
    Energetic argon ions strip the polymer strictly from the horizontal floor, allowing vertical progression without wall degradation.
  </ProcessStep>
</ProcessFlow>

## 3. Meniscus Dynamics & Refill Hydrodynamics

After droplet pinch-off, capillary forces draw liquid from the reservoir to replenish the nozzle cavity before the next pulse. The maximum operating frequency is fundamentally bounded by the Helmholtz resonance of the fluid chamber.`
    },
    {
      slug: 'strain-wave-gearing-flexspline-fatigue',
      title: 'Strain Wave Gearing: Surviving 10^7 Cycles in Precision Robot Joints',
      subtitle: 'Metallurgical design and thin-wall elastomechanical stress concentration in elliptical flexspline cups.',
      subject: 'Mechanisms',
      category: 'Mechanisms',
      readTime: '11 min',
      summary: 'Analysis of harmonic drive / strain wave gearboxes, flexspline fatigue life, tooth kinematic meshing, and bearing raceway friction.',
      tags: ['Mechanisms', 'Robotics', 'Gears', 'Fatigue Life'],
      figures: [
        {
          id: 'FIGURE_0',
          placeholder: '{{ FIGURE_0 }}',
          search_query: 'harmonic drive strain wave gearbox flexspline teardown cross section',
          caption: 'FIG 01 — THE FLEXSPLINE CUP: Thin-walled alloy cup showing precision external gear teeth and elliptical wave generator bore.',
          source: 'ROBOTICS KINEMATICS LAB'
        },
        {
          id: 'FIGURE_1',
          placeholder: '{{ FIGURE_1 }}',
          search_query: 'elliptical wave generator flexible ball bearing cross section harmonic drive',
          caption: 'FIG 02 — WAVE GENERATOR ASSEMBLY: Flexible thin-race ball bearing deflected into an elliptical contour.',
          source: 'BEARING METROLOGY ARCHIVE'
        }
      ],
      body_mdx: `## 1. Kinematic Mechanics of Elastic Deflection

Strain wave gearing achieves zero-backlash torque multiplication up to 160:1 in a single coaxial stage through continuous elastic deformation.

{{ FIGURE_0 }}

An elliptical cam (the wave generator) inserted into a thin-walled flexible cup (the flexspline) deflects the cup so its external teeth mesh with the internal teeth of a rigid ring (the circular spline) at two opposing diametrical lobes.

<TechnicalCard
  title="Harmonic Flexspline Stress Profile"
  subtitle="Cyclic Bending Stress at Major Elliptical Axis"
  bottleneck="Bending fatigue at flexspline tooth root sets strict 10^7 cycle life limit."
>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
    <div className="rounded bg-neutral-950 p-2.5 border border-neutral-800">
      <div className="text-amber-500 font-semibold uppercase text-[10px]">Material Alloy</div>
      <div className="text-neutral-200 mt-1">SNCM439 / 40CrNiMoA Alloy Steel</div>
      <div className="text-neutral-400 text-[11px] mt-0.5">Tensile: 1,100 MPa • Yield: 950 MPa</div>
    </div>
    <div className="rounded bg-neutral-950 p-2.5 border border-neutral-800">
      <div className="text-amber-500 font-semibold uppercase text-[10px]">Tooth Meshing Pitch</div>
      <div className="text-neutral-200 mt-1">Module m = 0.3mm (200 teeth)</div>
      <div className="text-neutral-400 text-[11px] mt-0.5">2-tooth difference yields 100:1 reduction</div>
    </div>
  </div>
</TechnicalCard>

{{ FIGURE_1 }}

## 2. Flexspline Diaphragm Fatigue Mechanics

Because the cup rotates relative to the elliptical wave generator, every point along the cup wall undergoes two complete tension-compression strain cycles per revolution.

The peak cyclic bending stress is given by:

$$\\sigma_b = \\frac{E \\cdot t}{2 \\cdot R^2} \\cdot w_0$$

Where $t$ is wall thickness ($0.35 \\text{ mm}$), $R$ is nominal radius, and $w_0$ is radial deflection. Controlling surface roughness to $R_a < 0.2 \\mu\\text{m}$ along the cup root radius is essential to eliminate micro-crack nucleation sites.`
    },
    {
      slug: 'ultra-thin-vapor-chamber-wick-architecture',
      title: 'Ultra-Thin Vapor Chambers: Capillary Limits in 0.35 mm Smartphone Spreaders',
      subtitle: 'How sintered copper micro-meshes and laser-welded pillar arrays prevent cavitation collapse under 80W die loads.',
      subject: 'Thermal',
      category: 'Thermal',
      readTime: '10 min',
      summary: 'Comprehensive analysis of two-phase flat vapor chambers, capillary pumping limits, sintered micro-wick pore permeability, and vacuum sealing.',
      tags: ['Thermal', 'Vapor Chamber', 'Two-Phase Cooling', 'Smartphones'],
      figures: [
        {
          id: 'FIGURE_0',
          placeholder: '{{ FIGURE_0 }}',
          search_query: 'smartphone vapor chamber teardown cross section sintered copper wick',
          caption: 'FIG 01 — PLANAR VAPOR CHAMBER TEARDOWN: Cleaved 0.35 mm copper envelope displaying internal micro-machined support pillars.',
          source: 'HARDWARE TEARDOWN ARCHIVE'
        },
        {
          id: 'FIGURE_1',
          placeholder: '{{ FIGURE_1 }}',
          search_query: 'sintered copper powder wick SEM micrograph thermal vapor chamber',
          caption: 'FIG 02 — SINTERED MICRO-POWDER WICK: Scanning electron micrograph showing interconnected capillary pore channels.',
          source: 'METROLOGY LAB'
        }
      ],
      body_mdx: `## 1. Two-Phase Latent Heat Spreading

Unlike solid copper slabs where heat conduction is limited by Fourier's law ($k \\approx 390 \\text{ W/mK}$), vapor chambers exploit the latent heat of vaporization of de-ionized water ($h_{fg} \\approx 2.45 \\times 10^6 \\text{ J/kg}$).

{{ FIGURE_0 }}

Fluid evaporates at the die hotspot, expanding at high velocity toward cooler perimeter condensation zones where it releases latent heat before being wicked back through capillary action.

## 2. Capillary Pumping & The Dry-Out Limit

For continuous operation without localized die thermal runaway, the capillary pressure generated by the sintered copper wick must exceed the cumulative viscous pressure drop of both liquid and vapor flows:

$$\\Delta P_{\\text{capillary, max}} \\ge \\Delta P_{\\text{liquid}} + \\Delta P_{\\text{vapor}} + \\Delta P_{\\text{gravity}}$$

{{ FIGURE_1 }}

Where maximum capillary pressure is governed by the Young-Laplace equation:

$$\\Delta P_{c} = \\frac{2 \\cdot \\sigma \\cdot \\cos(\\theta)}{r_{\\text{pore}}}$$

As chamber thickness scales down from 0.8 mm to 0.35 mm, vapor cavity hydraulic diameter drops cubically, causing vapor flow resistance to dominate and requiring micro-machined support column spacing under 1.2 mm.`
    }
  ];

  console.log('[Harvester] Sourcing 12 candidate images for seed topics...');
  for (let i = 0; i < seedTopics.length; i++) {
    const topic = seedTopics[i];
    const enrichedFigures = [];
    for (const fig of topic.figures) {
      const candidates = await fetchCandidateImages(fig.search_query, 12);
      enrichedFigures.push({
        ...fig,
        selectedIndex: 0,
        images: candidates
      });
    }

    topic.figures = enrichedFigures;
    topic.date = new Date().toISOString().split('T')[0];

    const filename = `${String(i + 1).padStart(3, '0')}-${topic.slug}.json`;
    const destPath = path.join(STAGING_DIR, filename);
    fs.writeFileSync(destPath, JSON.stringify(topic, null, 2), 'utf8');
    console.log(`[Harvester] ✓ Seeded staging/${filename} with 12 candidate images per figure.`);
  }
}

// Direct execution
if (process.argv[1] && process.argv[1].endsWith('harvest-staging.mjs')) {
  harvestStaging()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[Harvester] Fatal error:', err);
      process.exit(1);
    });
}
