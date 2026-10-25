export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Missing topic ID" });
  }

  const token = process.env.GITHUB_TOKEN || process.env.GH_PAT;
  const owner = "mohawkwarriors";
  const repo = "engineering-deep-dive";

  console.log(`Received veto request for topic: ${id}`);

  if (token) {
    try {
      // 1. Fetch current content/vetoes.json
      const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/content/vetoes.json`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "DeepDive-Veto-Bot"
        }
      });

      if (fileRes.ok) {
        const fileData = await fileRes.json();
        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        const vetoes = JSON.parse(content);

        // Add new veto if not already present
        if (!vetoes.some(v => v.id === id)) {
          vetoes.push({ id, timestamp: new Date().toISOString() });
          
          const updatedBase64 = Buffer.from(JSON.stringify(vetoes, null, 2)).toString('base64');
          await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/content/vetoes.json`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3+json",
              "Content-Type": "application/json",
              "User-Agent": "DeepDive-Veto-Bot"
            },
            body: JSON.stringify({
              message: `chore: log veto for topic ${id} via mobile review`,
              content: updatedBase64,
              sha: fileData.sha
            })
          });
        }
      }
    } catch (err) {
      console.warn("Could not commit veto to GitHub:", err.message);
    }
  }

  // Return clean JSON for API or friendly HTML if accessed in browser
  const accept = req.headers.accept || "";
  if (accept.includes("text/html")) {
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Topic Vetoed</title>
        <style>
          body { font-family: -apple-system, sans-serif; background: #FAF9F5; color: #141413; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; }
          .card { background: #FFFFFF; border: 1px solid #E4E2DA; padding: 36px 28px; border-radius: 16px; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
          .icon { font-size: 36px; color: #EF4444; margin-bottom: 12px; }
          h1 { font-size: 20px; margin: 0 0 8px; }
          p { font-size: 14px; color: #66655F; line-height: 1.5; margin: 0 0 20px; }
          a { display: inline-block; background: #141413; color: #FAF9F5; text-decoration: none; padding: 10px 20px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✕</div>
          <h1>Topic ${id} Vetoed</h1>
          <p>This topic has been removed from your lineup and added to the negative prompt filter.</p>
          <a href="/queue">Back to Review Deck</a>
        </div>
      </body>
      </html>
    `);
  }

  return res.status(200).json({ status: "success", vetoed: id });
}
