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
 * Reads a file from GitHub REST API or local filesystem
 */
export async function readFileContent(filePath: string): Promise<{ content: string; sha?: string } | null> {
  // If running locally without Vercel or no token, use filesystem
  if (!process.env.VERCEL && (!GITHUB_TOKEN || fs.existsSync(filePath))) {
    if (fs.existsSync(filePath)) {
      return { content: fs.readFileSync(filePath, "utf8") };
    }
  }

  if (!GITHUB_TOKEN) {
    if (fs.existsSync(filePath)) {
      return { content: fs.readFileSync(filePath, "utf8") };
    }
    return null;
  }

  // Use GitHub API
  const normalizedPath = filePath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^.*engineering-deep-dive\//, "");
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${normalizedPath}`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "The-HW-Insider-Editor",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`GitHub API read failed: ${res.statusText}`);
    }

    const data = (await res.json()) as GitHubFileResponse;
    const content = Buffer.from(data.content, "base64").toString("utf8");
    return { content, sha: data.sha };
  } catch (err) {
    console.error(`Error reading ${normalizedPath} from GitHub API:`, err);
    if (fs.existsSync(filePath)) {
      return { content: fs.readFileSync(filePath, "utf8") };
    }
    return null;
  }
}

/**
 * Writes or updates a file on GitHub or local filesystem
 */
export async function commitFile(filePath: string, content: string, message: string): Promise<boolean> {
  const normalizedPath = filePath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^.*engineering-deep-dive\//, "");

  // Always write locally if local filesystem is writable
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
  } catch {
    // Might fail on Vercel read-only filesystem, which is expected
  }

  if (!GITHUB_TOKEN) {
    return true;
  }

  // Commit via GitHub API
  try {
    // Get existing sha if file exists
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

    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${normalizedPath}`, {
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
      console.error(`GitHub API commit failed for ${normalizedPath}:`, errText);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Error committing file ${normalizedPath} to GitHub API:`, err);
    return false;
  }
}

/**
 * Deletes a file on GitHub or local filesystem
 */
export async function deleteFile(filePath: string, message: string): Promise<boolean> {
  const normalizedPath = filePath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^.*engineering-deep-dive\//, "");

  // Local filesystem
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
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

    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${normalizedPath}`, {
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
    console.error(`Error deleting file ${normalizedPath} from GitHub API:`, err);
    return false;
  }
}

/**
 * Lists all draft files in staging directory from GitHub or filesystem
 */
export async function listStagingDrafts(): Promise<{ name: string; path: string }[]> {
  // If local staging folder has files, read them
  const localStaging = path.join(process.cwd(), "staging");
  if (fs.existsSync(localStaging)) {
    const files = fs.readdirSync(localStaging).filter((f) => f.endsWith(".json"));
    if (files.length > 0) {
      return files.map((name) => ({
        name,
        path: path.join(localStaging, name),
      }));
    }
  }

  if (!GITHUB_TOKEN) return [];

  // Query GitHub Contents API for /staging
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
