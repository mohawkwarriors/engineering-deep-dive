import fs from 'fs';
import path from 'path';

const issuesDir = path.resolve('content/issues');
const files = fs.readdirSync(issuesDir);

for (const file of files) {
  if (file.endsWith('.json')) {
    const id = file.replace('.json', '');
    const mdxPath = path.join(issuesDir, `${id}.mdx`);

    if (!fs.existsSync(mdxPath)) {
      try {
        const raw = fs.readFileSync(path.join(issuesDir, file), 'utf8');
        const data = JSON.parse(raw);

        const issueNum = (data.id || id).replace('#', '');
        const title = data.title || `Issue #${issueNum}`;
        const subtitle = data.subtitle || '';
        const subject = data.subject || 'Mechanisms';
        const date = data.date || '2026-10-19';
        const readTime = data.readTime || '10 min';
        const html = data.article_html || data.body_mdx || '';

        const mdxContent = `---
issue: "${issueNum}"
title: "${title.replace(/"/g, '\\"')}"
subtitle: "${subtitle.replace(/"/g, '\\"')}"
date: "${date}"
subject: "${subject}"
readTime: "${readTime}"
---

${html}
`;

        fs.writeFileSync(mdxPath, mdxContent, 'utf8');
        console.log(`Created ${mdxPath}`);
      } catch (err) {
        console.error(`Failed to convert ${file}:`, err);
      }
    }
  }
}
