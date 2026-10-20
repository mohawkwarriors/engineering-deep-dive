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

    const stagingPath = filename.startsWith("staging/") ? filename : `staging/${filename}`;

    // Read draft if title/subject wasn't passed directly
    let draftTitle = title;
    let draftSubject = subject || "Hardware";
    if (!draftTitle) {
      const draftRes = await readFileContent(stagingPath);
      if (draftRes?.content) {
        try {
          const parsed = JSON.parse(draftRes.content);
          draftTitle = parsed.title;
          draftSubject = parsed.subject || parsed.category || draftSubject;
        } catch {}
      }
    }
    draftTitle = draftTitle || filename;

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

    // Add new veto entry
    vetoes.push({
      topic: draftTitle,
      subject: draftSubject,
      reason: reason || "Flagged during editorial review",
      critique: critique || "",
      date: new Date().toISOString(),
    });

    // Commit updated vetoes.json
    await commitFile(
      vetoesPath,
      JSON.stringify(vetoes, null, 2),
      `chore(curation): veto draft topic "${draftTitle}" (${reason})`
    );

    // Delete rejected draft from staging
    await deleteFile(stagingPath, `chore(staging): remove vetoed draft ${filename}`);

    return NextResponse.json({
      success: true,
      message: `Draft "${draftTitle}" vetoed and added to negative constraints.`,
    });
  } catch (err: any) {
    console.error("Veto draft failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
