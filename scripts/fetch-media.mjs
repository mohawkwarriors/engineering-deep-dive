import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';

const CONTENT_DIR = path.join(process.cwd(), 'content');

async function run() {
  console.log("Media fetcher cron initialized.");
}

run();
