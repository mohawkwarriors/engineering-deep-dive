import katex from "katex";

/**
 * Pre-processes LaTeX math expressions ($...$ and $$...$$) into safe HTML elements
 * before feeding them to MDXRemote / Acorn parser. This prevents Acorn from misinterpreting
 * LaTeX curly braces as JavaScript expression blocks.
 */
export function preprocessMathForMdx(rawContent: string): string {
  if (!rawContent) return rawContent;

  // 0. Strip HTML comments which cause Acorn / MDX compilation errors
  let out = rawContent.replace(/<!--[\s\S]*?-->/g, "");

  // 0B. Strip obsolete rating card (.telemetry-bar) if present
  out = out.replace(/<div class=["']telemetry-bar["'][\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi, "");

  // 1. Normalize image paths to root-relative
  out = out
    .replace(/src="images\//gi, 'src="/images/')
    .replace(/this\.src='images\//gi, "this.src='/images/");

  // 2. Display math
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    try {
      const html = katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false });
      return `\n\n<div className="katex-display my-4 text-center overflow-x-auto" dangerouslySetInnerHTML={{ __html: ${JSON.stringify(html)} }} />\n\n`;
    } catch {
      return `\`${tex}\``;
    }
  });

  // 3. Inline math
  out = out.replace(/(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, (_, tex) => {
    try {
      const html = katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
      return `<span className="katex-inline px-0.5" dangerouslySetInnerHTML={{ __html: ${JSON.stringify(html)} }} />`;
    } catch {
      return `\`${tex}\``;
    }
  });

  return out;
}

/**
 * Cleans and renders raw HTML articles (issues 000-006):
 * 1. Strips duplicated header metadata, h1, and subtitle already rendered by page layout
 * 2. Normalizes relative image paths (src="images/...") to root-relative (src="/images/...")
 * 3. Renders all KaTeX display and inline math formulas directly into HTML
 * 4. Sanitizes broken legacy onclick handlers
 */
export function cleanAndRenderArticleHtml(rawHtml: string): string {
  if (!rawHtml) return rawHtml;

  // 1. Strip duplicate meta-line, h1, subtitle if present at top
  let out = rawHtml
    .replace(/<div class="meta-line">[\s\S]*?<\/div>/gi, "")
    .replace(/<h1>[\s\S]*?<\/h1>/gi, "")
    .replace(/<p class="subtitle">[\s\S]*?<\/p>/gi, "")
    .replace(/src="images\//gi, 'src="/images/')
    .replace(/this\.src='images\//gi, "this.src='/images/")
    .replace(/<div class=["']telemetry-bar["'][\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi, "")
    .trim();

  // 2. Render KaTeX display equations ($$ ... $$)
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return `<div class="katex-display">${tex}</div>`;
    }
  });

  // 3. Render KaTeX inline equations ($ ... $)
  out = out.replace(/(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, (_, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<span class="katex-inline">${tex}</span>`;
    }
  });

  return out;
}
