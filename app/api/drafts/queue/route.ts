import { NextRequest, NextResponse } from "next/server";
import { readFileContent, commitFile, deleteFile, listApprovedDrafts } from "@/lib/github";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function getLocalApprovedDir(): string {
  const localApproved = path.join(process.cwd(), "approved");
  if (!fs.existsSync(localApproved)) {
    fs.mkdirSync(localApproved, { recursive: true });
  }
  return localApproved;
}

function getLocalStagingDir(): string {
  const localStaging = path.join(process.cwd(), "staging");
  if (!fs.existsSync(localStaging)) {
    fs.mkdirSync(localStaging, { recursive: true });
  }
  return localStaging;
}

/**
 * GET: Returns all drafts currently queued in the approved buffer, sorted in publishing order.
 */
export async function GET() {
  try {
    const approvedFiles = await listApprovedDrafts();

    const drafts = await Promise.all(
      approvedFiles.map(async (file) => {
        const res = await readFileContent(file.path);
        if (res && res.content) {
          try {
            const parsed = JSON.parse(res.content);
            const prefixMatch = file.name.match(/^(\d{3})-/);
            const orderFromPrefix = prefixMatch ? parseInt(prefixMatch[1], 10) : 999;
            return {
              filename: file.name,
              filePath: file.path,
              queueOrder: parsed.queueOrder || orderFromPrefix,
              ...parsed,
            };
          } catch (e) {
            console.error(`Error parsing approved draft ${file.name}:`, e);
            return null;
          }
        }
        return null;
      })
    );

    const validDrafts = drafts.filter(Boolean);
    validDrafts.sort((a, b) => {
      const orderA = typeof a.queueOrder === "number" ? a.queueOrder : 999;
      const orderB = typeof b.queueOrder === "number" ? b.queueOrder : 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.filename.localeCompare(b.filename);
    });

    return NextResponse.json({
      success: true,
      queue: validDrafts,
      count: validDrafts.length,
    });
  } catch (err: any) {
    console.error("Queue GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST: Reorders the approved buffer queue.
 * Receives an array of filenames in the new desired publishing order.
 * Renames files with 3-digit prefixes (001-..., 002-...) so publish-daily.mjs pulls in exact order.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderedFilenames } = body;

    if (!Array.isArray(orderedFilenames) || orderedFilenames.length === 0) {
      return NextResponse.json({ error: "Missing orderedFilenames array" }, { status: 400 });
    }

    const approvedDir = getLocalApprovedDir();

    // Step 1: Read all files in memory with their updated queueOrder
    const stagedUpdates: Array<{
      oldFilename: string;
      newFilename: string;
      data: any;
    }> = [];

    for (let i = 0; i < orderedFilenames.length; i++) {
      const oldFilename = orderedFilenames[i];
      const res = await readFileContent(`approved/${oldFilename}`);
      if (!res || !res.content) continue;

      const parsed = JSON.parse(res.content);
      const queueOrder = i + 1;
      const baseSlug = oldFilename.replace(/^\d{3}-/, "").replace(/\.json$/, "");
      const newFilename = `${String(queueOrder).padStart(3, "0")}-${baseSlug}.json`;

      parsed.queueOrder = queueOrder;

      stagedUpdates.push({
        oldFilename,
        newFilename,
        data: parsed,
      });
    }

    // Step 2: Write temporary files to prevent collision on rename
    for (const item of stagedUpdates) {
      const tempPath = path.join(approvedDir, `__temp__${item.newFilename}`);
      fs.writeFileSync(tempPath, JSON.stringify(item.data, null, 2), "utf8");
    }

    // Step 3: Remove old files that don't match their new name
    for (const item of stagedUpdates) {
      const oldPath = path.join(approvedDir, item.oldFilename);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch {}
      }
    }

    // Step 4: Finalize new names
    for (const item of stagedUpdates) {
      const tempPath = path.join(approvedDir, `__temp__${item.newFilename}`);
      const finalPath = path.join(approvedDir, item.newFilename);
      if (fs.existsSync(tempPath)) {
        fs.renameSync(tempPath, finalPath);
      }
    }

    // Return the updated queue
    const updatedApproved = await listApprovedDrafts();
    return NextResponse.json({
      success: true,
      message: `✓ Buffer queue rearranged (${stagedUpdates.length} issues in line).`,
      count: updatedApproved.length,
      queue: stagedUpdates.map((s) => ({
        filename: s.newFilename,
        queueOrder: s.data.queueOrder,
        title: s.data.title,
        subject: s.data.subject,
        readTime: s.data.readTime,
      })),
    });
  } catch (err: any) {
    console.error("Queue POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE: Move a draft from approved/ buffer back to staging/
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename");

    if (!filename) {
      return NextResponse.json({ error: "Missing filename parameter" }, { status: 400 });
    }

    const cleanFilename = filename.replace(/^approved\//, "");
    const approvedPath = `approved/${cleanFilename}`;
    const draftRes = await readFileContent(approvedPath);

    if (!draftRes || !draftRes.content) {
      return NextResponse.json({ error: "Draft not found in approved buffer" }, { status: 404 });
    }

    const draft = JSON.parse(draftRes.content);
    delete draft.queueOrder;
    delete draft.approvedAt;

    // Base slug in staging without order prefix
    const baseSlug = cleanFilename.replace(/^\d{3}-/, "");
    const stagingPath = `staging/${baseSlug}`;

    // Write to staging
    await commitFile(stagingPath, JSON.stringify(draft, null, 2), `chore(buffer): return "${draft.title}" to staging`);

    // Remove from approved
    await deleteFile(approvedPath, `chore(buffer): removed ${cleanFilename} from buffer`);

    // Re-index remaining files in approved/
    const approvedFiles = await listApprovedDrafts();
    const remaining = approvedFiles.filter((f) => f.name !== cleanFilename);
    const approvedDir = getLocalApprovedDir();

    for (let i = 0; i < remaining.length; i++) {
      const f = remaining[i];
      const res = await readFileContent(f.path);
      if (res && res.content) {
        try {
          const parsed = JSON.parse(res.content);
          const newOrder = i + 1;
          const base = f.name.replace(/^\d{3}-/, "");
          const newName = `${String(newOrder).padStart(3, "0")}-${base}`;
          parsed.queueOrder = newOrder;

          const oldFullPath = path.join(approvedDir, f.name);
          const newFullPath = path.join(approvedDir, newName);

          fs.writeFileSync(oldFullPath, JSON.stringify(parsed, null, 2), "utf8");
          if (oldFullPath !== newFullPath) {
            fs.renameSync(oldFullPath, newFullPath);
          }
        } catch {}
      }
    }

    return NextResponse.json({
      success: true,
      message: `✓ Draft returned to Staging queue.`,
      returnedFilename: baseSlug,
    });
  } catch (err: any) {
    console.error("Queue DELETE error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
