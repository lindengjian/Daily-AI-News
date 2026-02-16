import collector from './collector.js';
import fs from 'fs';
import path from 'path';

let job = null;
let meta = { lastCollectedDay: null, lastCompletedAt: null };
const metaPath = path.resolve(process.cwd(), 'data', 'collect-meta.json');

try {
  if (fs.existsSync(metaPath)) {
    const raw = fs.readFileSync(metaPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      meta = { ...meta, ...parsed };
    }
  }
} catch {}

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isCollectedToday() {
  return meta.lastCollectedDay === todayKey();
}

function status() {
  const collectedToday = isCollectedToday();
  if (!job) {
    return {
      running: false,
      collectedToday,
      day: todayKey()
    };
  }
  return {
    ...job,
    collectedToday,
    day: todayKey()
  };
}

function start() {
  const collectedToday = isCollectedToday();
  if (collectedToday) {
    return { ok: false, code: 'COLLECTED_TODAY', status: status() };
  }

  if (job && job.running) {
    return { ok: true, code: 'RUNNING', status: status() };
  }

  const jobId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  job = {
    running: true,
    jobId,
    stage: 'queued',
    message: '排队中',
    percent: 0,
    total: 0,
    done: 0,
    count: 0,
    error: null,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const push = (payload = {}) => {
    job = {
      ...job,
      ...payload,
      updatedAt: new Date().toISOString()
    };
  };

  (async () => {
    try {
      push({ stage: 'running', message: '开始采集', percent: 0 });
      const count = await collector.collectNews({
        onProgress: (p) => push(p)
      });
      push({ running: false, stage: 'done', message: '采集完成', percent: 100, count });
      meta = { ...meta, lastCollectedDay: todayKey(), lastCompletedAt: new Date().toISOString() };
      try {
        fs.mkdirSync(path.dirname(metaPath), { recursive: true });
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
      } catch {}
    } catch (e) {
      push({ running: false, stage: 'error', message: '采集失败', error: e?.message || String(e) });
    }
  })();

  return { ok: true, code: 'STARTED', status: status() };
}

export default {
  start,
  status
};
