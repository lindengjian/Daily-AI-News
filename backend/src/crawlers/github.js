import axios from 'axios';

const GITHUB_API = 'https://api.github.com';

const FILTER_KEYWORDS = ['tutorial', 'course', 'example', 'demo', 'learn'];
const INCLUDE_KEYWORDS = ['AI', 'llm', 'gpt', 'model', 'machine learning', 'deep learning', 'stable diffusion', 'image generation', 'video generation', 'multimodal', 'transformer', 'agent', 'copilot'];

function shouldFilter(title, description) {
  const text = `${title} ${description || ''}`.toLowerCase();
  
  for (const keyword of FILTER_KEYWORDS) {
    if (text.includes(keyword)) {
      return true;
    }
  }
  return false;
}

function isRelevant(title, description) {
  const text = `${title} ${description || ''}`.toLowerCase();
  
  for (const keyword of INCLUDE_KEYWORDS) {
    if (text.includes(keyword)) {
      return true;
    }
  }
  return false;
}

async function getGithubTrending(limit = 5) {
  const projects = [];
  
  try {
    const since = 'daily';
    const createdSince = getDateSince(since);
    const queries = [
      `ai OR llm OR gpt OR multimodal OR agent created:>=${createdSince}`,
      `"machine learning" OR "deep learning" OR "image generation" OR "video generation" OR diffusion created:>=${createdSince}`
    ];

    const items = [];
    const seen = new Set();

    for (const q of queries) {
      const url = `${GITHUB_API}/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=30`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Daily-AI-News/1.0',
          'Accept': 'application/vnd.github.v3+json',
          ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {})
        },
        timeout: 15000
      });

      const list = response.data?.items || [];
      for (const it of list) {
        const key = it?.html_url;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        items.push(it);
      }
    }

    for (const item of items) {
      const title = item.full_name;
      const description = item.description || '';

      if (shouldFilter(title, description)) {
        continue;
      }

      if (!isRelevant(title, description) && projects.length >= limit / 2) {
        continue;
      }

      projects.push({
        title: item.full_name,
        content: item.description || '',
        source: 'github',
        source_url: item.html_url,
        embed_url: null,
        media_type: 'article',
        published_at: item.created_at,
        thumbnail: item.owner?.avatar_url || null,
        stars: item.stargazers_count,
        description: item.description
      });

      if (projects.length >= limit) break;
    }
  } catch (error) {
    const status = error?.response?.status;
    const data = error?.response?.data;
    const msg = data?.message || error?.message;
    const detail = Array.isArray(data?.errors) ? JSON.stringify(data.errors) : '';
    console.error('[GitHub] 采集失败:', status ? `HTTP ${status}` : '', msg, detail);
  }
  
  return projects;
}

function getDateSince(since) {
  const date = new Date();
  if (since === 'daily') {
    date.setDate(date.getDate() - 1);
  } else if (since === 'weekly') {
    date.setDate(date.getDate() - 7);
  } else if (since === 'monthly') {
    date.setMonth(date.getMonth() - 1);
  }
  return date.toISOString().split('T')[0];
}

export default { getGithubTrending };
