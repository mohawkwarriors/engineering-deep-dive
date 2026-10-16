# Engineering Deep Dive - Pipeline & MDX Components

A zero-maintenance, automated publication architecture for mechanical hardware engineering deep-dives.

## Visual & Diagram Architectural Standard
- **Zero AI-Generated Raster Images:** Diffusion generators (Midjourney, DALL-E) are strictly prohibited from generating diagrams, CAD cutaways, or charts to prevent typography overflow and graphic clipping.
- **Native MDX Components:**
  - `<ProcessFlow>` & `<ProcessStep>`: Auto-expanding, responsive vertical manufacturing and thermodynamics process sequences.
  - `<TechnicalCard>`: Parameter grids with built-in engineering bottleneck callouts.
  - `<TechnicalTangent>`: Hoverable popover definitions with LaTeX equation rendering.
- **CI Media Linter:** `scripts/lint-media.mjs` automatically verifies that no unapproved raster graphics enter production.

## Directory Structure
```
├── .github/workflows/
│   └── daily-pipeline.yml       # Automated 7:00 AM PDT cron runner
├── components/
│   ├── ProcessFlow.tsx          # Dynamic process step component
│   ├── TechnicalCard.tsx        # Bounded specification card
│   ├── TechnicalTangent.tsx     # Hover tangent definition component
│   └── mdx-components.tsx       # Component registry for MDX provider
├── content/
│   └── issues/
│       └── sample-issue-002-revised.mdx
└── scripts/
    ├── generate-issue.mjs       # Issue generation config & system prompt
    └── lint-media.mjs           # CI linter preventing raster AI images
```
