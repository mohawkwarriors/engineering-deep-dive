import { NextRequest, NextResponse } from "next/server";
import { readFileContent, commitFile, deleteFile } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filename, reason, critique, title, subject } = body;

    if (!filename) {
      return NextResponse.json({ error: "Missing filename" }, { status: 400 });
    }

    const cleanFilename = filename.replace(/^(staging|approved)\//, "");
    const stagingPath = `staging/${cleanFilename}`;
    const approvedPath = `approved/${cleanFilename}`;

    // Read draft if title/subject wasn't passed directly
    let draftTitle = title;
    let draftSubject = subject || "Hardware";
    let isStaging = true;

    let draftRes = await readFileContent(stagingPath);
    if (!draftRes?.content) {
      draftRes = await readFileContent(approvedPath);
      isStaging = false;
    }

    if (draftRes?.content) {
      try {
        const parsed = JSON.parse(draftRes.content);
        draftTitle = parsed.title || draftTitle;
        draftSubject = parsed.subject || parsed.category || draftSubject;
      } catch {}
    }
    draftTitle = draftTitle || cleanFilename;

    // Load existing vetoes.json
    const vetoesPath = "content/vetoes.json";
    let vetoes: any[] = [];
    const vetoesRes = await readFileContent(vetoesPath);
    if (vetoesRes?.content) {
      try {
        vetoes = JSON.parse(vetoesRes.content);
        if (!Array.isArray(vetoes)) vetoes = [];
      } catch {}
    }

    // Add new veto entry with standardized tag
    vetoes.push({
      topic: draftTitle,
      subject: draftSubject,
      reason: reason || "[Too Broad]",
      critique: critique || "",
      date: new Date().toISOString(),
    });

    // Commit updated vetoes.json
    await commitFile(
      vetoesPath,
      JSON.stringify(vetoes, null, 2),
      `chore(curation): veto draft topic "${draftTitle}" (${reason})`
    );

    // Delete rejected draft from staging or approved
    if (isStaging) {
      await deleteFile(stagingPath, `chore(staging): remove vetoed draft ${cleanFilename}`);
    } else {
      await deleteFile(approvedPath, `chore(approved): remove vetoed draft ${cleanFilename}`);
    }

    return NextResponse.json({
      success: true,
      message: `Draft "${draftTitle}" vetoed with tag ${reason} and added to negative constraints.`,
    });
  } catch (err: any) {
    console.error("Veto draft failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
