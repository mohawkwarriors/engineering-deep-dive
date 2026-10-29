import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/components/mdx-components";
import { preprocessMathForMdx, cleanAndRenderArticleHtml } from "@/lib/mdx-utils";
import { cleanRawLatex } from "@/lib/title-utils";
import { TangentPopoverHandler } from "@/components/TangentPopoverHandler";
import { ArticleOutline } from "@/components/ArticleOutline";
import Link from "next/link";

export default function HomePage() {
  const issuesDir = path.join(process.cwd(), "content/issues");
  let fileContent = "";
  let issueNumber = "007";
  let tangents: Record<string, any> = {};

  if (fs.existsSync(issuesDir)) {
    const files = fs
      .readdirSync(issuesDir)
      .filter((f) => /^\d{3}\.mdx$/.test(f))
      .sort((a, b) => {
        const numA = parseInt(a.replace(".mdx", ""), 10) || 0;
        const numB = parseInt(b.replace(".mdx", ""), 10) || 0;
        return numB - numA;
      });

    if (files.length > 0) {
      issueNumber = files[0].replace(".mdx", "");
      fileContent = fs.readFileSync(path.join(issuesDir, files[0]), "utf8");

      // Load tangents from companion JSON file
      const jsonPath = path.join(issuesDir, `${issueNumber}.json`);
      if (fs.existsSync(jsonPath)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
          tangents = parsed.tangents || {};
        } catch {}
      }
    }
  }

  const { data, content } = matter(fileContent);

  const isHtml =
    content.trim().startsWith("<div") ||
    (content.includes("class=") && !content.includes("<TechnicalCard") && !content.includes("<ProcessFlow"));

  const safeContent = isHtml
    ? cleanAndRenderArticleHtml(content)
    : preprocessMathForMdx(content);

  return (
    <ArticleOutline>
      <article className="prose max-w-none text-[var(--text)]">
        {/* Title Header: Aligned at the top baseline with the Overview Sidebar */}
        <div className="border-b border-[var(--border)] pb-6 mb-8">
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--accent)] uppercase tracking-widest mb-2.5">
            <span>ISSUE #{data.issue || issueNumber}</span>
            <span>•</span>
            <span>{data.subject}</span>
            <span>•</span>
            <span>{data.readTime}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-medium tracking-tight text-[var(--text)] mb-3 leading-[1.15]">
            {cleanRawLatex(data.title)}
          </h1>
          <p className="text-base sm:text-lg text-[var(--muted)] font-sans leading-relaxed">
            {cleanRawLatex(data.subtitle)}
          </p>
        </div>

        <TangentPopoverHandler tangents={tangents}>
          <div className="text-[var(--text)] leading-relaxed font-sans space-y-6">
            {isHtml ? (
              <div
                className="article-body font-sans"
                dangerouslySetInnerHTML={{ __html: safeContent }}
              />
            ) : (
              <MDXRemote source={safeContent} components={mdxComponents} />
            )}
          </div>
        </TangentPopoverHandler>

        <div className="mt-12 pt-6 border-t border-[var(--border)] flex justify-between font-mono text-xs">
          <Link href="/archive" className="text-[var(--accent)] hover:underline">
            ← Browse Archive
          </Link>
          <span className="text-[var(--muted)]">{data.date}</span>
        </div>
      </article>
    </ArticleOutline>
  );
}
