import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000
});

let staticCache = null;
let staticCacheAt = 0;

async function loadStaticNews() {
  const now = Date.now();
  if (staticCache && now - staticCacheAt < 30000) return staticCache;

  const resp = await fetch('/data/news.json', { cache: 'no-store' });
  if (!resp.ok) {
    throw new Error(`load static news failed: ${resp.status}`);
  }
  const data = await resp.json();
  staticCache = data;
  staticCacheAt = now;
  return data;
}

function paginate(items, page, limit) {
  const p = Number.isFinite(page) ? page : 1;
  const l = Number.isFinite(limit) ? limit : 10;
  const offset = (p - 1) * l;
  return items.slice(offset, offset + l);
}

export async function getNewsList(params) {
  if (!import.meta.env.PROD) return api.get('/news', { params });

  const { page = 1, limit = 10, source } = params || {};
  const data = await loadStaticNews();
  const all = Array.isArray(data.items) ? data.items : [];
  const filtered = source ? all.filter(it => it.source === source) : all;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const items = paginate(filtered, page, limit);
  return { data: { items, total, page, limit, totalPages } };
}

export async function getNewsById(id) {
  if (!import.meta.env.PROD) return api.get(`/news/${id}`);

  const data = await loadStaticNews();
  const all = Array.isArray(data.items) ? data.items : [];
  const item = all.find(it => String(it.id) === String(id));
  if (!item) {
    const err = new Error('Not found');
    err.response = { status: 404 };
    throw err;
  }
  return { data: item };
}

export async function getTodayNews() {
  if (!import.meta.env.PROD) return api.get('/news/today');

  const data = await loadStaticNews();
  const all = Array.isArray(data.items) ? data.items : [];
  return { data: { items: all, total: all.length } };
}

export function triggerCollect() {
  if (import.meta.env.PROD) {
    const err = new Error('Not supported in production');
    err.response = { status: 400 };
    return Promise.reject(err);
  }
  return api.post('/news/collect');
}

export default api;
