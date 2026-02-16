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
    const query = 'AI OR llm OR "machine learning" OR "deep learning" OR gpt OR "image generation" OR "video generation" OR multimodal';
    const url = `${GITHUB_API}/search/repositories?q=${encodeURIComponent(query)}+created:>${getDateSince(since)}&sort=stars&order=desc&per_page=30`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Daily-AI-News/1.0',
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 15000
    });
    
    if (response.data && response.data.items) {
      const items = response.data.items;
      
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
    }
  } catch (error) {
    console.error('[GitHub] 采集失败:', error.message);
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
