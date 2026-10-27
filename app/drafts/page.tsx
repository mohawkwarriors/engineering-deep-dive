import { listStagingDrafts, listApprovedDrafts, readFileContent } from "@/lib/github";
import DraftViewer from "@/components/DraftViewer";

export const dynamic = "force-dynamic";

export default async function DraftsPage({
  searchParams,
}: {
  searchParams?: { key?: string; token?: string };
}) {
  const drafts: any[] = [];
  const initiallyUnlocked =
    searchParams?.key === "deepdive2026" || searchParams?.token === "deepdive2026";

  let approvedCount = 0;

  try {
    const [approvedFiles, draftFiles] = await Promise.all([
      listApprovedDrafts(),
      listStagingDrafts(),
    ]);
    approvedCount = approvedFiles.length;

    const draftItems = await Promise.all(
      draftFiles.map(async (file) => {
        const res = await readFileContent(file.path);
        if (res && res.content) {
          try {
            const parsed = JSON.parse(res.content);
            return {
              filename: file.name,
              filePath: file.path,
              ...parsed,
            };
          } catch (e) {
            console.error(`Error parsing draft ${file.name}:`, e);
            return null;
          }
        }
        return null;
      })
    );

    for (const item of draftItems) {
      if (item) drafts.push(item);
    }

    const approvedItems = await Promise.all(
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

    const approvedDrafts = approvedItems.filter(Boolean) as any[];
    approvedDrafts.sort((a, b) => (a.queueOrder || 999) - (b.queueOrder || 999));

    return (
      <div className="w-full mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <DraftViewer
          initialDrafts={drafts}
          initialApprovedDrafts={approvedDrafts}
          initiallyUnlocked={initiallyUnlocked}
          initialApprovedCount={approvedCount}
        />
      </div>
    );
  } catch (err) {
    console.error("Error loading drafts:", err);
  }

  return (
    <div className="w-full mx-auto px-2 sm:px-4 py-4 sm:py-6">
      <DraftViewer
        initialDrafts={drafts}
        initialApprovedDrafts={[]}
        initiallyUnlocked={initiallyUnlocked}
        initialApprovedCount={approvedCount}
      />
    </div>
  );
}
