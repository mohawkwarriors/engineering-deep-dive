import { listStagingDrafts, readFileContent } from "@/lib/github";
import DraftViewer from "@/components/DraftViewer";

export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const drafts: any[] = [];

  try {
    const draftFiles = await listStagingDrafts();
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
  } catch (err) {
    console.error("Error loading drafts:", err);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
      <DraftViewer initialDrafts={drafts} />
    </div>
  );
}
