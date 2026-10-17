import fs from 'fs/promises';
import path from 'path';

const INDEX_PATH = path.join(process.cwd(), 'index.html');
const CONTENT_DIR = path.join(process.cwd(), 'content');
const QUEUE_PATH = path.join(CONTENT_DIR, 'upcoming-queue.json');
const VETOES_PATH = path.join(CONTENT_DIR, 'vetoes.json');
const EMAIL_OUTPUT_PATH = path.join(CONTENT_DIR, 'upcoming-review-email.html');

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

async function generateQueue() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable is missing.");
    process.exit(1);
  }

  console.log("Reading index.html...");
  const html = await fs.readFile(INDEX_PATH, 'utf-8');

  // Discover latest issue number from TOPICS catalog (e.g. id: "#003")
  const issueMatch = html.match(/id:\s*"#(\d+)"/) || html.match(/"#(\d+)":/);
  const latestNum = issueMatch ? parseInt(issueMatch[1], 10) : 3;
  const startNum = latestNum + 1;

  // Extract past published titles
  const pastTitles = [...html.matchAll(/title:\s*"([^"]+)"/g)].map(m => m[1]);
  const recentTitlesList = pastTitles.slice(0, 40).map(t => `• ${t}`).join('\n');

  // Load learned vetoes
  let vetoedTopics = [];
  try {
    const vetoesRaw = await fs.readFile(VETOES_PATH, 'utf-8');
    vetoedTopics = JSON.parse(vetoesRaw);
  } catch (e) {}
  const vetoesList = vetoedTopics.map(v => `• VETOED: ${v.topic || v.title} (${v.discipline || v.subject || 'Hardware'}) - ${v.summary || v.reason || 'Off-target'}`).join('\n');

  console.log(`Generating 30 upcoming topics starting from Issue #${startNum}...`);

  const prompt = `You are the Lead Editorial Hardware Architect for "Engineering Deep Dive".
Your audience consists of senior Product Design Engineers (PD) and Hardware Architects who demand first-principles physics, real-world DFM tolerances, and mechanical/thermal depth.

GENERATE 30 HIGH-IMPACT, DIVERSE UPCOMING TOPICS FOR THE NEXT 30 DAYS:

DISCIPLINE SELECTION MANDATE (NO RIGID CAROUSEL):
- Draw freely across the 8 Core Disciplines: ${JSON.stringify(SUBJECTS)}.
- DO NOT follow a predictable round-robin carousel! Group or cluster disciplines organically when it makes engineering sense (e.g., 2 Product Dives when competing hardware flagships launch, or consecutive Manufacturing teardowns for related tooling processes).
- Ensure broad variety across high-engineering domains:
  * Aerospace & Satellites (deployable solar arrays, reaction wheels, star tracker thermal mounts)
  * Surgical Robotics & Medical Devices (articulated laparoscopic wrist cables, biocompatible titanium)
  * Flagship Consumer Hardware (camera OIS voice coils, water-resistant acoustic vents, precision hinges)
  * EV Powertrains & Inverters (laser-welded busbars, cold plates, structural battery potting)
  * Extreme DFM & Tooling (2-micron EDM, MIM sintering kinetics, AZ91D magnesium thixomolding)
  * Everyday Micro-Mechanisms (pen clicker barrel cams, lighter valves, watch escapements)

RECENTLY PUBLISHED TITLES (DO NOT DUPLICATE OR OVERLAP):
${recentTitlesList}

${vetoesList ? `USER VETOES (LEARNED NEGATIVE FEEDBACK - NEVER GENERATE SIMILAR TOPICS):\n${vetoesList}\n` : ''}

REQUIREMENTS FOR EACH OF THE 30 TOPICS:
1. Topic-First Title: Clean, direct (e.g. "Harmonic Drive Gearboxes: Strain Wave Kinematics and Tooth Fatigue").
2. Single-Sentence Hook: Highlighting the core physical trade-off or mechanical dilemma.
3. Core Dilemma: Concise description of the conflicting physical parameters (e.g. stiffness vs. inertia, wear vs. contact stress).

RETURN ONLY A VALID JSON ARRAY OF 30 OBJECTS (no markdown fences, no extra text):
[
  {
    "day_offset": 1,
    "subject": "Discipline Name",
    "title": "Topic-First Title",
    "subtitle": "Single-sentence narrative hook.",
    "dilemma": "Conflicting engineering parameters."
  },
  ...
]`;

  const candidateModels = [
    'gemini-3-flash-preview',
    'gemini-3.1-pro-preview',
    'gemini-2.5-flash'
  ];

  let textOutput = null;
  let lastErr = null;

  for (const model of candidateModels) {
    try {
      console.log(`Calling Gemini API for queue curation with ${model}...`);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        textOutput = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textOutput) {
          console.log(`Queue successfully generated with ${model}.`);
          break;
        }
      } else {
        lastErr = new Error(`Gemini API failed with status ${response.status}: ${await response.text()}`);
      }
    } catch (e) {
      lastErr = e;
    }
  }

  if (!textOutput) throw lastErr || new Error("Empty response from Gemini API.");

  const rawQueue = safeJsonParse(textOutput);

  // Format into calendar queue
  const now = new Date();
  const queue = rawQueue.map((item, idx) => {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + idx + 1);
    const isoDate = targetDate.toISOString().split('T')[0];
    const dateFormatted = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const issueNum = startNum + idx;
    const issueId = `#${String(issueNum).padStart(3, '0')}`;

    return {
      issue_id: issueId,
      issue_num: issueNum,
      date: isoDate,
      date_formatted: dateFormatted,
      subject: item.subject,
      title: item.title,
      subtitle: item.subtitle,
      dilemma: item.dilemma,
      status: "approved"
    };
  });

  // Save upcoming-queue.json
  await fs.mkdir(CONTENT_DIR, { recursive: true });
  await fs.writeFile(QUEUE_PATH, JSON.stringify(queue, null, 2), 'utf-8');
  console.log(`Successfully generated and saved ${queue.length} upcoming topics to ${QUEUE_PATH}!`);

  // Generate the One-Click Review Email HTML
  const emailHtml = buildReviewEmail(queue);
  await fs.writeFile(EMAIL_OUTPUT_PATH, emailHtml, 'utf-8');
  console.log(`Saved review email preview to ${EMAIL_OUTPUT_PATH}`);

  return { queue, emailHtml };
}

function buildReviewEmail(queue) {
  const rows = queue.map((item, idx) => {
    const encodedTitle = encodeURIComponent(item.title);
    const vetoUrl = `https://deepdive.saahiressa.com/api/veto?date=${item.date}&title=${encodedTitle}&subject=${encodeURIComponent(item.subject)}`;

    const subjectColors = {
      "Product Dives": "#D97757",
      "Manufacturing": "#2563EB",
      "Design": "#7C3AED",
      "Materials": "#059669",
      "Mechanisms": "#D97706",
      "Thermal": "#E11D48",
      "Fluids": "#0891B2",
      "Electromechanical": "#4F46E5"
    };
    const badgeColor = subjectColors[item.subject] || "#D97757";

    return `
      <tr style="border-bottom: 1px solid #2E2D2A;">
        <td style="padding: 14px 10px; font-family: monospace; font-size: 11px; color: #9E9C94; white-space: nowrap;">
          ${item.issue_id}<br><span style="font-size:10px; color:#6B6960;">${item.date_formatted}</span>
        </td>
        <td style="padding: 14px 10px;">
          <span style="display: inline-block; font-family: monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: ${badgeColor}; background: #232220; padding: 2px 7px; border-radius: 3px; border: 1px solid ${badgeColor}33;">
            ${item.subject}
          </span>
          <div style="font-weight: 600; font-size: 14px; color: #EDEDEB; margin-top: 6px; line-height: 1.35;">
            ${item.title}
          </div>
          <div style="font-size: 12.5px; color: #9E9C94; margin-top: 4px; line-height: 1.4;">
            ${item.subtitle}
          </div>
        </td>
        <td style="padding: 14px 10px; text-align: right; vertical-align: middle; white-space: nowrap;">
          <a href="${vetoUrl}" target="_blank" style="display: inline-block; background: #2A151C; border: 1px solid #E11D4866; color: #FDA4AF; text-decoration: none; font-family: monospace; font-size: 11px; padding: 6px 12px; border-radius: 4px; font-weight: 600;">
            ✕ Veto Topic
          </a>
        </td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Engineering Deep Dive — 30-Day Queue Review</title>
</head>
<body style="background-color: #141413; color: #EDEDEB; font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; margin: 0; padding: 32px 16px;">
  <div style="max-width: 740px; margin: 0 auto; background: #1C1917; border: 1px solid #2E2D2A; border-radius: 10px; overflow: hidden; box-shadow: 0 12px 36px rgba(0,0,0,0.4);">
    <div style="padding: 28px 24px 20px; border-bottom: 1px solid #2E2D2A; background: #232220;">
      <div style="font-family: monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #D97757; font-weight: 600;">
        MONTHLY CURATION QUEUE
      </div>
      <h1 style="font-size: 22px; font-weight: 600; margin: 6px 0 10px; color: #EDEDEB;">
        Upcoming 30-Day Topics for Review
      </h1>
      <p style="font-size: 13.5px; color: #9E9C94; line-height: 1.5; margin: 0;">
        Here is the candidate lineup for the next 30 daily dispatches. If any topic feels off-target, click <strong>[ ✕ Veto Topic ]</strong> to remove it and train the negative prompt filter. If you take no action, all approved topics will author and deploy automatically.
      </p>
    </div>

    <table style="width: 100%; border-collapse: collapse; text-align: left;">
      <thead>
        <tr style="border-bottom: 1px solid #2E2D2A; background: #181715;">
          <th style="padding: 10px; font-family: monospace; font-size: 10px; text-transform: uppercase; color: #6B6960;">Issue</th>
          <th style="padding: 10px; font-family: monospace; font-size: 10px; text-transform: uppercase; color: #6B6960;">Discipline & Proposed Teardown</th>
          <th style="padding: 10px; font-family: monospace; font-size: 10px; text-transform: uppercase; color: #6B6960; text-align: right;">Action</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div style="padding: 20px 24px; background: #181715; border-top: 1px solid #2E2D2A; font-family: monospace; font-size: 11px; color: #6B6960; display: flex; justify-content: space-between;">
      <span>⌀ Engineering Deep Dive Automated Pipeline</span>
      <span>deepdive.saahiressa.com</span>
    </div>
  </div>
</body>
</html>`;
}

// Allow direct execution
if (process.argv[1] && process.argv[1].endsWith('generate-monthly-queue.mjs')) {
  generateQueue().catch(err => {
    console.error("Fatal Error generating monthly queue:", err);
    process.exit(1);
  });
}

export { generateQueue };
