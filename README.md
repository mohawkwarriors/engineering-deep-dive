# The HW Insider

A fully automated daily intelligence pipeline delivering high-depth mechanical engineering deep dives with interactive MDX components and live teardown photography.

## Architecture & Visual Standards
- **Zero Raster AI Graphics:** No diffusion image generation. Figure 5 and all schematics are rendered natively in React/Tailwind/KaTeX.
- **`<TechnicalCard>`:** Parameter matrix container with dynamic container sizing and bottleneck highlights.
- **`<ProcessFlow>` & `<ProcessStep>`:** Responsive vertical step cards for manufacturing and thermodynamic sequences.
- **`<TechnicalTangent>`:** Interactive hover/pinned popover cards for physics and engineering principles.
- **CI Linter (`scripts/lint-media.mjs`):** Automatically fails any PR or build attempting to load raster AI graphics.

## Quick Start
```bash
npm install
npm run lint:media
npm run dev
```
