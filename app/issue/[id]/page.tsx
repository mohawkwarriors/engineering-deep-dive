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
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamicParams = true;

export function generateStaticParams() {
  const issuesDir = path.join(process.cwd(), "content/issues");
  if (!fs.existsSync(issuesDir)) return [];
  const files = fs.readdirSync(issuesDir).filter((f) => /^\d{3}\.mdx$/.test(f));
  return files.map((f) => ({ id: f.replace(".mdx", "") }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const filePath = path.join(process.cwd(), "content/issues", `${params.id}.mdx`);
  if (!fs.existsSync(filePath)) {
    return { title: "Issue Not Found — The HW Insider" };
  }

  const fileContent = fs.readFileSync(filePath, "utf8");
  const { data } = matter(fileContent);

  const title = `Issue #${data.issue || params.id}: ${data.title} — The HW Insider`;
  const description = cleanRawLatex(data.subtitle) || "The HW Insider hardware engineering intelligence dispatch.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function IssuePage({ params }: { params: { id: string } }) {
  const filePath = path.join(process.cwd(), "content/issues", `${params.id}.mdx`);
  if (!fs.existsSync(filePath)) {
    notFound();
  }

  const fileContent = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContent);

  // Load tangents from companion JSON file
  let tangents: Record<string, any> = {};
  const jsonPath = path.join(process.cwd(), "content/issues", `${params.id}.json`);
  if (fs.existsSync(jsonPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      tangents = parsed.tangents || {};
    } catch {}
  }

  const isHtml =
    content.trim().startsWith("<div") ||
    (content.includes("class=") && !content.includes("<TechnicalCard") && !content.includes("<ProcessFlow"));

  const safeContent = isHtml
    ? cleanAndRenderArticleHtml(content)
    : preprocessMathForMdx(content);

  const articleHeader = (
    <div className="border-b border-[var(--border)] pb-6 mb-8">
      <div className="flex items-center gap-2 font-mono text-xs text-[var(--accent)] uppercase tracking-widest mb-2.5">
        <span>ISSUE #{data.issue || params.id}</span>
        <span>•</span>
        <span>{data.subject}</span>
        <span>•</span>
        <span>{data.readTime}</span>
      </div>
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-medium tracking-tight text-[var(--text)] mb-3 leading-[1.15]">
        {data.title}
      </h1>
      <p className="text-base sm:text-lg text-[var(--muted)] font-sans leading-relaxed">
        {cleanRawLatex(data.subtitle)}
      </p>
    </div>
  );

  return (
    <ArticleOutline header={articleHeader}>
      <article className="prose max-w-none text-[var(--text)]">
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
            ← Back to Archive
          </Link>
          <span className="text-[var(--muted)]">{data.date}</span>
        </div>
      </article>
    </ArticleOutline>
  );
}
