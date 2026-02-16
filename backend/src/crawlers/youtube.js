import axios from 'axios';
import { translateToChinese } from '../services/translator.js';

const YOUTUBE_WEB = 'https://www.youtube.com';

const FILTER_KEYWORDS = ['tutorial', 'course', 'lesson', 'learn', 'how to', 'beginner', 'guide', '完整版', '教程', '课程'];
const INCLUDE_KEYWORDS = ['AI', 'model', 'GPT', 'Claude', 'Gemini', 'Sora', 'Midjourney', 'Stable Diffusion', 'OpenAI', 'Anthropic', 'Google', 'release', 'demo', 'new', 'update', ' announcement', 'launch', 'Llama', 'Mistral', 'Qwen', 'DeepSeek', 'Runway', 'Kling', 'Pika', 'Luma', 'video generation', 'image generation', 'LLM'];

function shouldFilter(title) {
  const lowerTitle = title.toLowerCase();
  
  for (const keyword of FILTER_KEYWORDS) {
    if (lowerTitle.includes(keyword.toLowerCase())) {
      return true;
    }
  }
  return false;
}

function isRelevant(title) {
  const lowerTitle = title.toLowerCase();
  
  for (const keyword of INCLUDE_KEYWORDS) {
    if (lowerTitle.includes(keyword.toLowerCase())) {
      return true;
    }
  }
  return false;
}

function parsePublishTimeToIso(publishTimeText) {
  if (!publishTimeText) return null;
  const now = new Date();
  const text = publishTimeText.toLowerCase();

  const rel = text.match(/(\d+)\s*(minute|hour|day)\s*ago/);
  if (rel) {
    const n = parseInt(rel[1], 10);
    const unit = rel[2];
    const d = new Date(now);
    if (unit === 'minute') d.setMinutes(d.getMinutes() - n);
    if (unit === 'hour') d.setHours(d.getHours() - n);
    if (unit === 'day') d.setDate(d.getDate() - n);
    return d.toISOString();
  }

  if (text.includes('yesterday')) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d.toISOString();
  }

  const normalized = publishTimeText
    .replace(/^streamed\s+live\s+on\s+/i, '')
    .replace(/^streamed\s+/i, '')
    .replace(/^premiered\s+/i, '')
    .trim();
  const ts = Date.parse(normalized);
  if (!Number.isNaN(ts)) return new Date(ts).toISOString();

  return null;
}

function isWithinLastDays(iso, days) {
  if (!iso) return false;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return false;
  const now = Date.now();
  const diff = now - ts;
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

async function getYoutubeVideos(keyword = 'AI model release announcement', limit = 5, options = {}) {
  const videos = [];
  const days = typeof options.days === 'number' ? options.days : 2;
  
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}&sp=CAI%253D`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 15000
    });
    
    const html = response.data;
    
    const videoIdRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
    
    let match;
    const videoIds = [];
    
    while ((match = videoIdRegex.exec(html)) !== null && videoIds.length < 30) {
      if (!videoIds.includes(match[1])) {
        videoIds.push(match[1]);
      }
    }
    
    const titleRegex = /"title":{"runs":\[(.*?)\]/g;
    const thumbnailRegex = /"thumbnail":{"thumbnails":\[{"url":"([^"]+)"/g;
    const publishTimeRegex = /"publishTimeText":{"simpleText":"([^"]+)"/g;
    
    const titles = [];
    let titleMatch;
    while ((titleMatch = titleRegex.exec(html)) !== null) {
      const runsMatch = titleMatch[1].match(/"text":"([^"]+)"/g);
      if (runsMatch) {
        const title = runsMatch.map(m => m.match(/"text":"([^"]+)"/)[1]).join('');
        titles.push(title);
      }
    }
    
    const thumbnails = [];
    let thumbMatch;
    while ((thumbMatch = thumbnailRegex.exec(html)) !== null) {
      const t = thumbMatch[1].replace(/\\u0026/g, '&');
      thumbnails.push(decodeURIComponent(t));
    }
    
    const publishTimes = [];
    let timeMatch;
    while ((timeMatch = publishTimeRegex.exec(html)) !== null) {
      publishTimes.push(timeMatch[1]);
    }
    
    for (let i = 0; i < videoIds.length; i++) {
      const videoId = videoIds[i];
      let title = titles[i] || '';
      
      if (!title) continue;
      
      const publishTimeText = publishTimes[i] || '';
      const publishedAtIso = parsePublishTimeToIso(publishTimeText);
      if (!isWithinLastDays(publishedAtIso, days)) {
        continue;
      }

      if (shouldFilter(title)) {
        continue;
      }
      
      if (!isRelevant(title) && videos.length >= limit / 2) {
        continue;
      }
      
      const thumbnail = thumbnails[i] || '';
      
      const translatedTitle = await translateToChinese(title);
      
      videos.push({
        title: translatedTitle || title,
        originalTitle: title,
        content: '',
        source: 'youtube',
        source_url: `${YOUTUBE_WEB}/watch?v=${videoId}`,
        embed_url: `https://www.youtube.com/embed/${videoId}`,
        media_type: 'video',
        published_at: publishedAtIso,
        thumbnail: thumbnail
      });
      
      if (videos.length >= limit) break;
    }
    
  } catch (error) {
    console.error('[YouTube] 采集失败:', error.message);
  }
  
  return videos;
}

export default { getYoutubeVideos };
