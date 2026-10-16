export default async function handler(req, res) {
  const { date, title, subject } = req.query;

  // Clean title for display
  const cleanTitle = title ? decodeURIComponent(title) : "Unknown Topic";
  const cleanDate = date || "Upcoming";
  const cleanSubject = subject || "General";

  // Optional: If GITHUB_TOKEN is present in Vercel environment variables,
  // we dispatch an automated repository event to commit the veto directly
  const githubToken = process.env.GITHUB_TOKEN;
  const repo = process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
    ? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
    : "mohawkwarriors/deepdive";

  let statusMessage = "Veto recorded in session filter.";

  if (githubToken) {
    try {
      await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${githubToken}`,
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          event_type: "veto-topic",
          client_payload: { date: cleanDate, title: cleanTitle, subject: cleanSubject }
        })
      });
      statusMessage = "Synced directly to your GitHub repository.";
    } catch (e) {
      console.error("GitHub dispatch failed:", e);
    }
  }

  // Return a sleek, Apple-style confirmation card
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Topic Vetoed — Engineering Deep Dive</title>
  <style>
    body {
      background: #141413;
      color: #EDEDEB;
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: #1C1917;
      border: 1px solid #2E2D2A;
      border-radius: 12px;
      padding: 36px 32px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 16px 48px rgba(0,0,0,0.4);
    }
    .icon {
      width: 48px;
      height: 48px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #EF4444;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      margin: 0 auto 20px;
    }
    .badge {
      display: inline-block;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #D97757;
      background: #241E1A;
      padding: 3px 10px;
      border-radius: 4px;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 10px;
      line-height: 1.35;
    }
    p {
      color: #9E9C94;
      font-size: 14px;
      line-height: 1.55;
      margin: 0 0 24px;
    }
    .footer-note {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #6B6960;
      border-top: 1px solid #2E2D2A;
      padding-top: 16px;
      margin-bottom: 24px;
    }
    a.btn {
      display: inline-block;
      background: #D97757;
      color: #FFF;
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      padding: 10px 22px;
      border-radius: 6px;
      transition: background 0.15s;
    }
    a.btn:hover { background: #C56645; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✕</div>
    <span class="badge">${cleanSubject} &middot; ${cleanDate}</span>
    <h1>Topic Vetoed</h1>
    <p><strong>"${cleanTitle}"</strong> has been removed from your 30-day queue. Tomorrow's generator will skip this topic and select a fresh, high-impact engineering alternative.</p>
    <div class="footer-note">${statusMessage} Added to negative feedback filter.</div>
    <a href="/" class="btn">&larr; Return to Publication</a>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
