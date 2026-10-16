import fs from "fs";
import path from "path";
import matter from "gray-matter";
import Link from "next/link";

export default function ArchivePage() {
  const issuesDir = path.join(process.cwd(), "content/issues");
  const files = fs.existsSync(issuesDir)
    ? fs.readdirSync(issuesDir).filter((f) => f.endsWith(".mdx")).sort().reverse()
    : [];

  const issues = files.map((filename) => {
    const raw = fs.readFileSync(path.join(issuesDir, filename), "utf8");
    const { data } = matter(raw);
    return {
      slug: filename.replace(".mdx", ""),
      ...data,
    };
  });

  return (
    <div>
      <div className="border-b border-neutral-800 pb-4 mb-6">
        <h1 className="text-xl font-bold font-mono tracking-tight text-neutral-100">ARCHIVE</h1>
        <p className="text-xs font-mono text-neutral-400">All published mechanical engineering deep-dive dispatches</p>
      </div>

      <div className="divide-y divide-neutral-800/80">
        {issues.map((item: any) => (
          <div key={item.slug} className="py-4 font-mono group">
            <div className="flex items-center gap-2 text-xs text-amber-500/90 mb-1">
              <span>ISSUE #{item.issue || item.slug}</span>
              <span>•</span>
              <span className="text-neutral-400">{item.subject}</span>
              <span>•</span>
              <span className="text-neutral-500">{item.date}</span>
            </div>
            <Link href={`/issue/${item.slug}`} className="text-base font-semibold text-neutral-200 group-hover:text-amber-400 transition-colors">
              {item.title}
            </Link>
            <p className="text-xs text-neutral-400 font-sans mt-1 line-clamp-2">
              {item.subtitle}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
