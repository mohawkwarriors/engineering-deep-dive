import fs from "fs";
import path from "path";

const REPO = process.env.GITHUB_REPOSITORY || "mohawkwarriors/engineering-deep-dive";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

interface GitHubFileResponse {
  sha: string;
  content: string;
  encoding: string;
}

/**
 * Normalizes a path relative to the repository root.
 * Safely strips absolute paths like /var/task/ or C:/.../engineering-deep-dive/
 */
function normalizeRepoRelativePath(filePath: string): string {
  let p = filePath.replace(/\\/g, "/");
  const cwdNormalized = process.cwd().replace(/\\/g, "/");

  if (p.startsWith(cwdNormalized)) {
    p = p.slice(cwdNormalized.length);
  }

  // Remove leading slashes and any folder prefix before the repository root
  p = p.replace(/^\/+/, "").replace(/^.*engineering-deep-dive\//, "");
  return p;
}

/**
 * Reads a file from local filesystem (both local dev and Vercel serverless /var/task)
 * with a graceful fallback to GitHub REST API if not found on disk.
 */
export async function readFileContent(filePath: string): Promise<{ content: string; sha?: string } | null> {
  // 1. Check local filesystem first
  let resolvedPath = filePath;
  if (!path.isAbsolute(resolvedPath)) {
    resolvedPath = path.join(process.cwd(), filePath);
  }

  try {
    if (fs.existsSync(resolvedPath)) {
      return { content: fs.readFileSync(resolvedPath, "utf8") };
    }
  } catch (err) {
    console.warn(`Local disk read error for ${resolvedPath}:`, err);
  }

  // 2. If not on disk, check GitHub API if GITHUB_TOKEN is available
  if (!GITHUB_TOKEN) {
    return null;
  }

  const relPath = normalizeRepoRelativePath(filePath);
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${relPath}`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "The-HW-Insider-Editor",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as GitHubFileResponse;
    if (!data.content) return null;
    const content = Buffer.from(data.content, "base64").toString("utf8");
    return { content, sha: data.sha };
  } catch (err) {
    console.error(`Error reading ${relPath} from GitHub API:`, err);
    return null;
  }
}

/**
 * Writes or updates a file on GitHub or local filesystem
 */
export async function commitFile(filePath: string, content: string, message: string): Promise<boolean> {
  const relPath = normalizeRepoRelativePath(filePath);

  // Always attempt local write if possible
  try {
    let resolvedPath = filePath;
    if (!path.isAbsolute(resolvedPath)) {
      resolvedPath = path.join(process.cwd(), filePath);
    }
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(resolvedPath, content, "utf8");
  } catch {
    // Might fail on Vercel read-only filesystem, which is expected
  }

  if (!GITHUB_TOKEN) {
    return true;
  }

  // Commit via GitHub API
  try {
    let existingSha: string | undefined;
    const existing = await readFileContent(filePath);
    if (existing?.sha) {
      existingSha = existing.sha;
    }

    const body: Record<string, any> = {
      message,
      content: Buffer.from(content).toString("base64"),
      branch: "main",
    };
    if (existingSha) {
      body.sha = existingSha;
    }

    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${relPath}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "The-HW-Insider-Editor",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`GitHub API commit failed for ${relPath}:`, errText);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Error committing file ${relPath} to GitHub API:`, err);
    return false;
  }
}

/**
 * Deletes a file on GitHub or local filesystem
 */
export async function deleteFile(filePath: string, message: string): Promise<boolean> {
  const relPath = normalizeRepoRelativePath(filePath);

  // Local filesystem
  try {
    let resolvedPath = filePath;
    if (!path.isAbsolute(resolvedPath)) {
      resolvedPath = path.join(process.cwd(), filePath);
    }
    if (fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
    }
  } catch {
    // Expected on Vercel
  }

  if (!GITHUB_TOKEN) {
    return true;
  }

  try {
    const existing = await readFileContent(filePath);
    if (!existing?.sha) {
      return true; // Already gone
    }

    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${relPath}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "The-HW-Insider-Editor",
      },
      body: JSON.stringify({
        message,
        sha: existing.sha,
        branch: "main",
      }),
    });

    return res.ok;
  } catch (err) {
    console.error(`Error deleting file ${relPath} from GitHub API:`, err);
    return false;
  }
}

/**
 * Lists all draft files in staging directory from filesystem or GitHub API
 */
export async function listStagingDrafts(): Promise<{ name: string; path: string }[]> {
  // Check local filesystem first
  const localStaging = path.join(process.cwd(), "staging");
  try {
    if (fs.existsSync(localStaging)) {
      const files = fs.readdirSync(localStaging).filter((f) => f.endsWith(".json"));
      if (files.length > 0) {
        return files.map((name) => ({
          name,
          path: `staging/${name}`,
        }));
      }
    }
  } catch (err) {
    console.warn("Could not read local staging directory:", err);
  }

  if (!GITHUB_TOKEN) return [];

  // Fallback to GitHub Contents API for /staging
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/staging?ref=main`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "The-HW-Insider-Editor",
      },
      cache: "no-store",
    });

    if (!res.ok) return [];

    const items = (await res.json()) as any[];
    if (!Array.isArray(items)) return [];
    return items
      .filter((item) => item.type === "file" && item.name.endsWith(".json"))
      .map((item) => ({
        name: item.name,
        path: item.path,
      }));
  } catch (err) {
    console.error("Error listing staging drafts from GitHub API:", err);
    return [];
  }
}
