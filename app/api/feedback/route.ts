import { NextRequest, NextResponse } from "next/server";
import { readFileContent, commitFile } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { issueId, direction = "up", topic, subject } = body;

    const memoryPath = "content/curation-memory.json";
    let memory: any = {
      upvotedTopics: [],
      downvotedTopics: [],
      lastUpdated: new Date().toISOString(),
    };

    const res = await readFileContent(memoryPath);
    if (res?.content) {
      try {
        memory = JSON.parse(res.content);
        if (!Array.isArray(memory.upvotedTopics)) memory.upvotedTopics = [];
        if (!Array.isArray(memory.downvotedTopics)) memory.downvotedTopics = [];
      } catch {}
    }

    const entry = {
      issueId,
      topic: topic || `Issue #${issueId}`,
      subject: subject || "Mechanisms",
      timestamp: new Date().toISOString(),
    };

    if (direction === "up") {
      memory.upvotedTopics.push(entry);
    } else {
      memory.downvotedTopics.push(entry);
    }
    memory.lastUpdated = new Date().toISOString();

    await commitFile(
      memoryPath,
      JSON.stringify(memory, null, 2),
      `chore(curation): record ${direction}vote telemetry for ${entry.topic}`
    );

    return NextResponse.json({
      success: true,
      message: `Telemetry recorded: ${direction}vote on Issue #${issueId}`,
    });
  } catch (err: any) {
    console.error("Feedback telemetry error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
