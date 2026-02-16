import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import bilibiliCrawler from '../src/crawlers/bilibili.js';
import youtubeCrawler from '../src/crawlers/youtube.js';
import githubCrawler from '../src/crawlers/github.js';
import summarizer from '../src/services/summarizer.js';
import { translateToChinese, isChinese } from '../src/services/translator.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(backendDir, '..');

dotenv.config({ path: path.join(backendDir, '.env') });

const dataDir = path.join(repoRoot, 'frontend', 'public', 'data');
const thumbsDir = path.join(repoRoot, 'frontend', 'public', 'thumbs');
const outputPath = path.join(dataDir, 'news.json');

function sha1(input) {
  return crypto.createHash('sha1').update(input).digest('hex');
}

async function ensureDirs() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(thumbsDir, { recursive: true });
}

async function downloadThumb(url, key) {
  if (!url) return null;
  const clean = url.split('@')[0];

  try {
    const resp = await axios.get(clean, {
      responseType: 'arraybuffer',
      timeout: 20000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: clean.includes('hdslb.com') ? 'https://www.bilibili.com/' : undefined
      }
    });

    const ct = String(resp.headers['content-type'] || '').toLowerCase();
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
    const filename = `${key}.${ext}`;
    const filePath = path.join(thumbsDir, filename);
    await fs.writeFile(filePath, Buffer.from(resp.data));
    return `/thumbs/${filename}`;
  } catch {
    return null;
  }
}

function toIsoOrNow(v) {
  const ts = Date.parse(v);
  if (!Number.isNaN(ts)) return new Date(ts).toISOString();
  return new Date().toISOString();
}

async function normalizeItem(item) {
  const id = sha1(item.source_url);

  let title = item.title || '';
  let content = item.content || '';

  if (title && !isChinese(title)) {
    const t = await translateToChinese(title);
    if (t) title = t;
  }
  if (content && !isChinese(content)) {
    const t = await translateToChinese(content);
    if (t) content = t;
  }

  let summary = item.summary || '';
  if (item.media_type === 'video') {
    summary = await summarizer.summarize(title, content);
  } else if (!summary) {
    summary = content;
  }

  const localThumb = await downloadThumb(item.thumbnail, id);

  return {
    id,
    title,
    content,
    summary,
    source: item.source,
    source_url: item.source_url,
    embed_url: item.embed_url || null,
    media_type: item.media_type || 'article',
    published_at: toIsoOrNow(item.published_at),
    collected_at: new Date().toISOString(),
    thumbnail: localThumb || null
  };
}

async function collectRaw() {
  const results = [];

  const bilibili = process.env.CRAWL_BILIBILI !== 'false';
  const youtube = process.env.CRAWL_YOUTUBE !== 'false';
  const github = process.env.CRAWL_GITHUB !== 'false';

  if (bilibili) {
    const items = await bilibiliCrawler.getBilibiliVideos('AI模型发布', 6);
    results.push(...items);
  }

  if (youtube) {
    const items = await youtubeCrawler.getYoutubeVideos('AI model release announcement', 6, { days: 2 });
    results.push(...items);
  }

  if (github) {
    const items = await githubCrawler.getGithubTrending(4);
    results.push(...items);
  }

  return results;
}

async function main() {
  await ensureDirs();

  const raw = await collectRaw();
  const dedup = new Map();
  for (const it of raw) {
    if (it && it.source_url && !dedup.has(it.source_url)) dedup.set(it.source_url, it);
  }

  const picked = Array.from(dedup.values()).slice(0, 10);
  const normalized = [];
  for (const it of picked) {
    normalized.push(await normalizeItem(it));
  }

  const payload = {
    generated_at: new Date().toISOString(),
    items: normalized
  };

  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
