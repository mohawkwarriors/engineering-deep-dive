# Project Editorial & Architectural Guidelines: The HW Insider

## 1. Overview Navigation Rail & Section Heading Rules

### Compact Section Headings (Zero Cutoff Rule)
- **Constraint**: Section headings (`h2` / `##` and `.section-header-wrap`) must be compact, punchy, and concise.
- **Length Limit**: Strictly 3 to 7 words (under 45 characters).
- **Format**: `<Number>. <Short Descriptive Title>` (e.g. `1. The Big Picture`, `2. JDM Manufacturing`, `3. Engineering Teardowns`, `4. Market Positioning`).
- **Rationale**: The desktop layout features a fixed 240px Overview navigation rail. Verbose run-on headings (e.g. `Product-by-Product Engineering Teardowns and Mechanical Dissections of Every Single Announced Device`) wrap awkwardly or truncate with ellipsis.
- **Subsections (`h3` / `###`)**:
  - Keep product or subtopic headings concise and cleanly titled without price tags or trailing marketing fluff.
  - Subsections automatically nest under their parent section in the Overview rail.

## 2. Layout & Typography Standards
- **Two-Column Editorial Grid**: The layout uses a bespoke `max-w-[1080px]` container with a `240px 1fr` grid (`lg:grid lg:grid-cols-[240px_1fr]`).
- **Sticky Alignment**: The Overview rail is fixed at `sticky top-20` on desktop, aligned at the top horizontal baseline with the article's title header.
- **Subsections Visual Guide**: Subsections within the Overview navigation use an indented solid guide line (`border-l-2 border-[var(--border)] ml-3 pl-2.5`).
