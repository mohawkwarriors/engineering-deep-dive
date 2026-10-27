import { NextRequest, NextResponse } from "next/server";
import { readFileContent, commitFile, deleteFile, listApprovedDrafts } from "@/lib/github";
import { formatAnswerOverview } from "@/lib/title-utils";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filename, title, subtitle, figures, sections, target = "publish" } = body;

    if (!filename) {
      return NextResponse.json({ error: "Missing filename" }, { status: 400 });
    }

    const cleanFilename = filename.replace(/^(staging|approved)\//, "");
    const stagingPath = `staging/${cleanFilename}`;
    const approvedPath = `approved/${cleanFilename}`;

    // Try reading from staging, or approved
    let draftRes = await readFileContent(stagingPath);
    let sourceFolder = "staging";
    if (!draftRes || !draftRes.content) {
      draftRes = await readFileContent(approvedPath);
      sourceFolder = "approved";
    }

    if (!draftRes || !draftRes.content) {
      return NextResponse.json({ error: "Draft not found in staging or approved" }, { status: 404 });
    }

    const draft = JSON.parse(draftRes.content);
    const finalTitle = title || draft.title;
    const finalSubtitle = subtitle || formatAnswerOverview(draft.subtitle || "", finalTitle, draft.title);
    const finalFigures = figures || draft.figures || [];

    // Assemble finalized MDX from modular sections if provided
    let finalizedMdx = "";
    if (sections && Array.isArray(sections)) {
      const activeSections = sections.filter((s: any) => !s.hidden);
      finalizedMdx = activeSections.map((s: any, idx: number) => {
        const cleanHeading = (s.heading || `Section ${idx + 1}`).replace(/^(?:Section\s+\d+[:.]?\s*|\d+[\.:]\s*)/i, "").trim();
        const headingLine = `## ${idx + 1}. ${cleanHeading}`;
        const contentStr = (s.content || "").trim();
        if (contentStr.startsWith("## ")) {
          return contentStr;
        }
        return `${headingLine}\n\n${contentStr}`;
      }).join("\n\n---\n\n");
    } else {
      finalizedMdx = draft.body_mdx || "";
    }

    // Replace figure placeholders in finalized MDX with selected figures (handling CAD vector schematics)
    for (let i = 0; i < finalFigures.length; i++) {
      const fig = finalFigures[i];
      const selectedIndex = typeof fig.selectedIndex === "number" ? fig.selectedIndex : 0;
      const selectedImg = fig.images?.[selectedIndex] || fig.images?.[0] || { url: "", title: "", source: "" };
      const placeholder = fig.placeholder || `{{ FIGURE_${i} }}`;

      let figureSnippet = "";
      if (fig.activeTab === "cad" && fig.cadSvg) {
        figureSnippet = `
<figure className="product-figure my-8 rounded-lg border border-neutral-800 bg-neutral-900/60 overflow-hidden">
  <div className="img-wrapper relative w-full bg-[#191918] p-2 sm:p-4 flex items-center justify-center">
    ${fig.cadSvg}
  </div>
  <figcaption className="p-3 text-xs font-mono text-neutral-400 border-t border-neutral-800 flex justify-between items-center gap-2">
    <span>${fig.caption || selectedImg.title || finalTitle}</span>
    <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">100% CLEAN HOUSE-STYLE CAD SCHEMATIC</span>
  </figcaption>
</figure>
`;
      } else {
        figureSnippet = `
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
      }

      finalizedMdx = finalizedMdx.split(placeholder).join(figureSnippet);
    }

    // Quality & Truncation Guardrail: ensure article has at least 5 sections and is complete
    const sectionCount = (finalizedMdx.match(/^##\s+|(?<=<h2\b)/gm) || []).length;
    if (sectionCount < 5) {
      return NextResponse.json(
        {
          error: `Cannot approve draft: Article has only ${sectionCount} sections (minimum 5 required). The article appears to be truncated.`,
        },
        { status: 400 }
      );
    }

    // TARGET 1: Buffer ("Ready to Go" - 10-15 buffer queue)
    if (target === "buffer") {
      const allApproved = await listApprovedDrafts();
      const nextIndex = allApproved.length + 1;
      const baseSlug = cleanFilename.replace(/^\d{3}-/, "").replace(/\.json$/, "");
      const newFilename = `${String(nextIndex).padStart(3, "0")}-${baseSlug}.json`;
      const targetApprovedPath = `approved/${newFilename}`;

      const updatedDraft = {
        ...draft,
        title: finalTitle,
        subtitle: finalSubtitle,
        figures: finalFigures,
        sections: sections || draft.sections,
        body_mdx: finalizedMdx,
        queueOrder: nextIndex,
        approvedAt: new Date().toISOString(),
      };

      await commitFile(
        targetApprovedPath,
        JSON.stringify(updatedDraft, null, 2),
        `feat(buffer): approve draft #${nextIndex} "${finalTitle}" to approved buffer`
      );

      // If it was in staging, remove from staging
      if (sourceFolder === "staging") {
        await deleteFile(stagingPath, `chore(staging): move approved draft to buffer ${cleanFilename}`);
      }

      const updatedApproved = await listApprovedDrafts();
      return NextResponse.json({
        success: true,
        target: "buffer",
        queueOrder: nextIndex,
        approvedFilename: newFilename,
        approvedCount: updatedApproved.length,
        message: `✓ Draft added to Approved Buffer as #${nextIndex} in line.`,
      });
    }

    // TARGET 2: Publish Immediately to content/issues/
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

    // Compose frontmatter MDX
    const mdxContent = `---
issue: "${nextId}"
title: "${finalTitle.replace(/"/g, '\\"')}"
subtitle: "${finalSubtitle.replace(/"/g, '\\"')}"
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
        subtitle: finalSubtitle,
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

    // Remove approved draft from staging or approved
    if (sourceFolder === "staging") {
      await deleteFile(stagingPath, `chore(staging): remove published draft ${cleanFilename}`);
    } else {
      await deleteFile(approvedPath, `chore(approved): remove published draft ${cleanFilename}`);
    }

    return NextResponse.json({
      success: true,
      target: "publish",
      issueId: nextId,
      message: `Approved Issue #${nextId} published successfully.`,
    });
  } catch (err: any) {
    console.error("Approve draft failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
