import { NextResponse } from "next/server";
import { listStagingDrafts, listApprovedDrafts, readFileContent } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stagingFiles = await listStagingDrafts();
    const approvedFiles = await listApprovedDrafts();

    const drafts = [];
    for (const file of stagingFiles) {
      const res = await readFileContent(file.path);
      if (res && res.content) {
        try {
          const parsed = JSON.parse(res.content);
          drafts.push({
            filename: file.name,
            filePath: file.path,
            status: "needs_review",
            ...parsed,
          });
        } catch (e) {
          console.error(`Error parsing staging draft ${file.name}:`, e);
        }
      }
    }

    const approvedDrafts = [];
    for (const file of approvedFiles) {
      const res = await readFileContent(file.path);
      if (res && res.content) {
        try {
          const parsed = JSON.parse(res.content);
          approvedDrafts.push({
            filename: file.name,
            filePath: file.path,
            status: "approved_buffer",
            ...parsed,
          });
        } catch (e) {
          console.error(`Error parsing approved draft ${file.name}:`, e);
        }
      }
    }

    const approvedCount = approvedFiles.length;
    const runwayDays = approvedCount; // 1 article published per day
    const runwayAlert = approvedCount <= 3;

    return NextResponse.json({
      drafts,
      approvedDrafts,
      approvedCount,
      stagingCount: drafts.length,
      runwayDays,
      runwayAlert,
      minimumFloor: 40,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
