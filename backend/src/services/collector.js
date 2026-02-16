import bilibiliCrawler from '../crawlers/bilibili.js';
import youtubeCrawler from '../crawlers/youtube.js';
import githubCrawler from '../crawlers/github.js';
import db from '../db/index.js';
import summarizer from '../services/summarizer.js';
import config from '../config/index.js';

async function collectNews(options = {}) {
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
  const report = (payload) => {
    if (onProgress) onProgress(payload);
  };

  console.log('[Collector] 开始采集新闻...');
  const allItems = [];
  const targetCount = 10;
  report({ stage: 'start', message: '开始采集', percent: 0 });
  
  if (config.crawlers.bilibili) {
    console.log('[Collector] 采集 Bilibili (AI模型/新技术)...');
    report({ stage: 'bilibili', message: '采集中：Bilibili', percent: 10 });
    const bilibiliVideos = await bilibiliCrawler.getBilibiliVideos('AI模型发布', 8);
    allItems.push(...bilibiliVideos);
  }
  
  if (config.crawlers.youtube) {
    console.log('[Collector] 采集 YouTube (AI新技术)...');
    report({ stage: 'youtube', message: '采集中：YouTube', percent: 30 });
    const youtubeVideos = await youtubeCrawler.getYoutubeVideos('AI model release announcement', 5, { days: 2 });
    allItems.push(...youtubeVideos);
  }
  
  if (config.crawlers.github) {
    console.log('[Collector] 采集 GitHub (AI开源项目)...');
    report({ stage: 'github', message: '采集中：GitHub', percent: 40 });
    const githubProjects = await githubCrawler.getGithubTrending(3);
    allItems.push(...githubProjects);
  }
  
  report({ stage: 'dedupe', message: '去重与筛选', percent: 55 });
  const existingItems = db.all('SELECT source_url FROM news');
  const existingUrls = new Set(existingItems.map(row => row.source_url));
  
  const newItems = allItems
    .filter(item => !existingUrls.has(item.source_url))
    .slice(0, targetCount);
  
  console.log(`[Collector] 获取到 ${newItems.length} 条新内容`);
  report({ stage: 'picked', message: `获得 ${newItems.length} 条新内容`, percent: 60, total: newItems.length, done: 0 });
  
  let done = 0;
  for (const item of newItems) {
    let summary = '';
    
    if (item.media_type === 'video' && config.minimax.apiKey) {
      try {
        console.log(`[Collector] 生成摘要: ${item.title}`);
        report({ stage: 'summarize', message: `生成摘要：${item.title}`, percent: 60 + Math.floor((done / Math.max(newItems.length, 1)) * 30), total: newItems.length, done });
        summary = await summarizer.summarize(item.title, item.content || '');
        item.summary = summary;
      } catch (error) {
        console.error(`[Collector] 摘要生成失败: ${error.message}`);
        item.summary = item.content || '';
      }
    } else {
      item.summary = item.content || '';
    }
    
    try {
      db.run(`
        INSERT INTO news (title, content, summary, source, source_url, embed_url, media_type, published_at, thumbnail)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        item.title,
        item.content || '',
        item.summary || '',
        item.source,
        item.source_url,
        item.embed_url || null,
        item.media_type,
        item.published_at,
        item.thumbnail || null
      ]);
      console.log(`[Collector] 已保存: ${item.title}`);
    } catch (error) {
      console.error(`[Collector] 保存失败: ${error.message}`);
    }

    done += 1;
    report({ stage: 'save', message: `已保存 ${done}/${newItems.length}`, percent: 60 + Math.floor((done / Math.max(newItems.length, 1)) * 35), total: newItems.length, done });
  }
  
  console.log(`[Collector] 采集完成！新增 ${newItems.length} 条`);
  report({ stage: 'done', message: '采集完成', percent: 100, total: newItems.length, done: newItems.length, count: newItems.length });
  return newItems.length;
}

function getNewsList(options = {}) {
  const { page = 1, limit = 10, source = null } = options;
  const offset = (page - 1) * limit;
  
  let whereClause = '';
  const params = [];
  
  if (source) {
    whereClause = 'WHERE source = ?';
    params.push(source);
  }
  
  const countResult = db.get(`SELECT COUNT(*) as total FROM news ${whereClause}`, params);
  const total = countResult?.total || 0;
  
  const queryParams = [...params, limit, offset];
  const items = db.all(`SELECT * FROM news ${whereClause} ORDER BY collected_at DESC LIMIT ? OFFSET ?`, queryParams)
    .map(normalizeNewsItem);
  
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

function getNewsById(id) {
  const item = db.get('SELECT * FROM news WHERE id = ?', [id]);
  return normalizeNewsItem(item);
}

function getTodayNews() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return db.all(`
    SELECT * FROM news 
    WHERE collected_at >= ?
    ORDER BY collected_at DESC
  `, [today.toISOString()]).map(normalizeNewsItem);
}

function normalizeNewsItem(item) {
  if (!item) return item;
  if (item.source === 'bilibili' && typeof item.thumbnail === 'string' && item.thumbnail.includes('@')) {
    return { ...item, thumbnail: item.thumbnail.split('@')[0] };
  }
  return item;
}

export default {
  collectNews,
  getNewsList,
  getNewsById,
  getTodayNews
};
