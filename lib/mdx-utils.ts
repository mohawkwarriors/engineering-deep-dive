import katex from "katex";

/**
 * Pre-processes LaTeX math expressions ($...$ and $$...$$) into safe HTML elements
 * before feeding them to MDXRemote / Acorn parser. This prevents Acorn from misinterpreting
 * LaTeX curly braces as JavaScript expression blocks.
 */
export function preprocessMathForMdx(rawContent: string): string {
  if (!rawContent) return rawContent;

  let out = rawContent.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    try {
      const html = katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false });
      return `\n\n<div className="katex-display my-4 text-center overflow-x-auto" dangerouslySetInnerHTML={{ __html: ${JSON.stringify(html)} }} />\n\n`;
    } catch {
      return `\`${tex}\``;
    }
  });

  out = out.replace(/\$([^\$\n]+?)\$/g, (_, tex) => {
    try {
      const html = katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
      return `<span className="katex-inline px-0.5" dangerouslySetInnerHTML={{ __html: ${JSON.stringify(html)} }} />`;
    } catch {
      return `\`${tex}\``;
    }
  });

  return out;
}
