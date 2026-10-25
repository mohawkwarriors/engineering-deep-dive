import { NextRequest, NextResponse } from "next/server";
import { readFileContent, commitFile } from "@/lib/github";
import { formatAnswerOverview } from "@/lib/title-utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filename, title, figures, sections, subtitle } = body;

    if (!filename) {
      return NextResponse.json({ error: "Missing filename" }, { status: 400 });
    }

    const cleanFilename = filename.replace(/^(staging|approved)\//, "");
    const stagingPath = `staging/${cleanFilename}`;
    const approvedPath = `approved/${cleanFilename}`;

    // Read existing draft from staging or approved
    let draftRes = await readFileContent(stagingPath);
    let targetPath = stagingPath;
    if (!draftRes?.content) {
      draftRes = await readFileContent(approvedPath);
      targetPath = approvedPath;
    }

    let existingData: Record<string, any> = {};
    if (draftRes?.content) {
      try {
        existingData = JSON.parse(draftRes.content);
      } catch {}
    }

    const finalTitle = title || existingData.title || "Mechanical Hardware Analysis";
    const finalSubtitle = subtitle || formatAnswerOverview(existingData.subtitle || "", finalTitle, existingData.title);

    const updatedDraft = {
      ...existingData,
      title: finalTitle,
      subtitle: finalSubtitle,
      figures: figures || existingData.figures || [],
      sections: sections || existingData.sections || [],
      updatedAt: new Date().toISOString(),
    };

    await commitFile(
      targetPath,
      JSON.stringify(updatedDraft, null, 2),
      `chore(draft): save edits for "${finalTitle}"`
    );

    return NextResponse.json({
      success: true,
      message: `✓ Draft changes saved successfully to ${targetPath}.`,
    });
  } catch (err: any) {
    console.error("Save draft failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
