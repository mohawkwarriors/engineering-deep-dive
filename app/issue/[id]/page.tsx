import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/components/mdx-components";
import Link from "next/link";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  const issuesDir = path.join(process.cwd(), "content/issues");
  if (!fs.existsSync(issuesDir)) return [];
  const files = fs.readdirSync(issuesDir).filter((f) => f.endsWith(".mdx"));
  return files.map((f) => ({ id: f.replace(".mdx", "") }));
}

export default function IssuePage({ params }: { params: { id: string } }) {
  const filePath = path.join(process.cwd(), "content/issues", `${params.id}.mdx`);
  if (!fs.existsSync(filePath)) {
    notFound();
  }

  const fileContent = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContent);

  return (
    <article className="prose prose-invert max-w-none">
      <div className="border-b border-neutral-800 pb-6 mb-8">
        <div className="flex items-center gap-2 font-mono text-xs text-amber-500 uppercase tracking-widest mb-2">
          <span>ISSUE #{data.issue || params.id}</span>
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
        <MDXRemote source={content} components={mdxComponents} />
      </div>

      <div className="mt-12 pt-6 border-t border-neutral-800 flex justify-between font-mono text-xs">
        <Link href="/archive" className="text-amber-400 hover:text-amber-300">
          ← Back to Archive
        </Link>
        <span className="text-neutral-500">{data.date}</span>
      </div>
    </article>
  );
}
