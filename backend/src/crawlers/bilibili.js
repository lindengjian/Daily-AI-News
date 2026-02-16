import axios from 'axios';

const BILIBILI_API = 'https://api.bilibili.com';
const BILIBILI_WEB = 'https://www.bilibili.com';

const FILTER_KEYWORDS = ['短剧', '教程', '课程', '教学', '学习', '入门', '新手', '系列课', '培训', '从零开始', '小白', '全集', '完整版', '第1集', '第2集', '第3集'];
const INCLUDE_KEYWORDS = ['模型', '发布', '更新', 'AI', 'Sora', 'GPT', 'Claude', 'Gemini', 'Midjourney', 'Stable Diffusion', 'Runway', 'Kling', 'Seedance', 'Luma', '开源', '新功能', 'API', 'Copilot', 'o1', 'DeepSeek', 'Qwen', 'Llama', '视频生成', '图像生成'];

function shouldFilter(title) {
  const lowerTitle = title.toLowerCase();
  
  for (const keyword of FILTER_KEYWORDS) {
    if (lowerTitle.includes(keyword)) {
      return true;
    }
  }
  
  if (title.match(/^\[?[第]\d+[集集]/)) {
    return true;
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

async function getBilibiliVideos(keyword = 'AI模型', limit = 8) {
  const videos = [];
  
  try {
    const searchUrl = `${BILIBILI_API}/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(keyword)}&pn=1&ps=30&web_location=1430650`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': BILIBILI_WEB,
        'Origin': BILIBILI_WEB,
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      },
      timeout: 10000
    });
    
    if (response.data && response.data.data && response.data.data.result) {
      const items = response.data.data.result;
      
      for (const item of items) {
        const title = item.title.replace(/<[^>]*>/g, '');
        
        if (shouldFilter(title)) {
          continue;
        }
        
        if (!isRelevant(title) && videos.length >= limit / 2) {
          continue;
        }
        
        const bvid = item.bvid;
        let thumbnail = null;
        
        if (item.pic) {
          thumbnail = item.pic.startsWith('http') ? item.pic : `https:${item.pic}`;
          thumbnail = thumbnail.split('@')[0];
        }
        
        videos.push({
          title: title,
          content: item.description?.replace(/<[^>]*>/g, '') || '',
          source: 'bilibili',
          source_url: `${BILIBILI_WEB}/video/${bvid}`,
          embed_url: `//player.bilibili.com/player.html?bvid=${bvid}&page=1`,
          media_type: 'video',
          published_at: new Date(item.pubdate * 1000).toISOString(),
          thumbnail: thumbnail,
          author: item.author,
          duration: item.duration
        });
        
        if (videos.length >= limit) break;
      }
    }
  } catch (error) {
    console.error('[Bilibili] 采集失败:', error.message);
    if (error.response) {
      console.error('[Bilibili] 状态码:', error.response.status);
    }
  }

  return videos;
}

export default { getBilibiliVideos };
