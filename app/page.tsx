import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/components/mdx-components";
import { preprocessMathForMdx } from "@/lib/mdx-utils";
import Link from "next/link";

export default function HomePage() {
  const issuesDir = path.join(process.cwd(), "content/issues");
  let fileContent = "";
  let issueNumber = "007";

  if (fs.existsSync(issuesDir)) {
    const files = fs
      .readdirSync(issuesDir)
      .filter((f) => f.endsWith(".mdx"))
      .sort((a, b) => {
        const numA = parseInt(a.replace(".mdx", ""), 10) || 0;
        const numB = parseInt(b.replace(".mdx", ""), 10) || 0;
        return numB - numA;
      });

    if (files.length > 0) {
      fileContent = fs.readFileSync(path.join(issuesDir, files[0]), "utf8");
      issueNumber = files[0].replace(".mdx", "");
    }
  }

  const { data, content } = matter(fileContent);

  const isHtml =
    content.trim().startsWith("<div") ||
    (content.includes("class=") && !content.includes("<TechnicalCard") && !content.includes("<ProcessFlow"));

  const safeContent = isHtml ? content : preprocessMathForMdx(content);

  return (
    <article className="prose prose-invert max-w-none">
      <div className="border-b border-neutral-800 pb-6 mb-8">
        <div className="flex items-center gap-2 font-mono text-xs text-amber-500 uppercase tracking-widest mb-2">
          <span>ISSUE #{data.issue || issueNumber}</span>
          <span>•</span>
          <span>{data.subject}</span>
          <span>•</span>
          <span>{data.readTime}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100 font-sans mb-3">
          {data.title}
        </h1>
        <p className="text-sm sm:text-base text-neutral-400 font-mono leading-relaxed">
          {data.subtitle}
        </p>
      </div>

      <div className="text-neutral-300 leading-relaxed font-sans space-y-6">
        {isHtml ? (
          <div
            className="article-body font-sans"
            dangerouslySetInnerHTML={{ __html: safeContent }}
          />
        ) : (
          <MDXRemote source={safeContent} components={mdxComponents} />
        )}
      </div>

      <div className="mt-12 pt-6 border-t border-neutral-800 flex justify-between font-mono text-xs">
        <Link href="/archive" className="text-amber-400 hover:text-amber-300">
          ← Browse Archive
        </Link>
        <span className="text-neutral-500">{data.date}</span>
      </div>
    </article>
  );
}
