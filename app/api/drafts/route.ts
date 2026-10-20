import { NextResponse } from "next/server";
import { listStagingDrafts, readFileContent } from "@/lib/github";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const draftFiles = await listStagingDrafts();
    const drafts = [];

    for (const file of draftFiles) {
      const res = await readFileContent(file.path);
      if (res && res.content) {
        try {
          const parsed = JSON.parse(res.content);
          drafts.push({
            filename: file.name,
            filePath: file.path,
            ...parsed,
          });
        } catch (e) {
          console.error(`Error parsing draft ${file.name}:`, e);
        }
      }
    }

    return NextResponse.json({ drafts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
