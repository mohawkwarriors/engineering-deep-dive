import { NextRequest, NextResponse } from "next/server";
import { readFileContent, commitFile, deleteFile } from "@/lib/github";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filename, title, figures } = body;

    if (!filename) {
      return NextResponse.json({ error: "Missing filename" }, { status: 400 });
    }

    const stagingPath = filename.startsWith("staging/") ? filename : `staging/${filename}`;
    const draftRes = await readFileContent(stagingPath);

    if (!draftRes || !draftRes.content) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const draft = JSON.parse(draftRes.content);
    const finalTitle = title || draft.title;

    // Determine next issue number
    let maxId = 6;
    const issuesDir = path.join(process.cwd(), "content/issues");
    if (fs.existsSync(issuesDir)) {
      const existing = fs.readdirSync(issuesDir);
      for (const f of existing) {
        const num = parseInt(f.replace(/\.(json|mdx)$/, ""), 10);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }
    }
    const nextId = String(maxId + 1).padStart(3, "0");
    const today = new Date().toISOString().split("T")[0];

    // Replace figure placeholders in body_mdx with selected images
    let finalizedMdx = draft.body_mdx || "";

    const finalFigures = figures || draft.figures || [];
    for (let i = 0; i < finalFigures.length; i++) {
      const fig = finalFigures[i];
      const selectedIndex = typeof fig.selectedIndex === "number" ? fig.selectedIndex : 0;
      const selectedImg = fig.images?.[selectedIndex] || fig.images?.[0] || { url: "", title: "", source: "" };
      const placeholder = fig.placeholder || `{{ FIGURE_${i} }}`;

      const figureSnippet = `
<figure className="product-figure my-8 rounded-lg border border-neutral-800 bg-neutral-900/60 overflow-hidden">
  <div className="img-wrapper relative w-full h-72 sm:h-96 bg-neutral-950">
    <img src="${selectedImg.url}" alt="${fig.caption || selectedImg.title || finalTitle}" className="w-full h-full object-cover" />
  </div>
  <figcaption className="p-3 text-xs font-mono text-neutral-400 border-t border-neutral-800 flex justify-between items-center gap-2">
    <span>${fig.caption || selectedImg.title || ""}</span>
    <span className="text-[10px] text-amber-500 uppercase tracking-wider">${fig.source || selectedImg.source || "TEARDOWN ARCHIVE"}</span>
  </figcaption>
</figure>
`;

      finalizedMdx = finalizedMdx.split(placeholder).join(figureSnippet);
    }

    // Compose frontmatter MDX
    const mdxContent = `---
issue: "${nextId}"
title: "${finalTitle.replace(/"/g, '\\"')}"
subtitle: "${(draft.subtitle || "").replace(/"/g, '\\"')}"
date: "${today}"
subject: "${draft.subject || draft.category || "Mechanisms"}"
readTime: "${draft.readTime || "10 min"}"
---

${finalizedMdx}
`;

    // Compose JSON issue representation for backwards compatibility
    const jsonContent = JSON.stringify(
      {
        id: `#${nextId}`,
        title: finalTitle,
        subtitle: draft.subtitle,
        subject: draft.subject || draft.category,
        date: today,
        tangents: draft.tangents || {},
        figures: finalFigures,
        body_mdx: finalizedMdx,
      },
      null,
      2
    );

    // Commit new issue files
    const mdxPath = `content/issues/${nextId}.mdx`;
    const jsonPath = `content/issues/${nextId}.json`;

    await commitFile(mdxPath, mdxContent, `feat(issue): approve and publish issue #${nextId}`);
    await commitFile(jsonPath, jsonContent, `feat(issue): add metadata for issue #${nextId}`);

    // Remove approved draft from staging
    await deleteFile(stagingPath, `chore(staging): remove approved draft ${filename}`);

    return NextResponse.json({
      success: true,
      issueId: nextId,
      message: `Approved Issue #${nextId} published successfully.`,
    });
  } catch (err: any) {
    console.error("Approve draft failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
