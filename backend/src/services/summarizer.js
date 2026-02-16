import axios from 'axios';
import config from '../config/index.js';

async function summarize(title, description) {
  const apiKey = config.minimax.apiKey;
  const baseUrl = config.minimax.baseUrl;
  
  if (!apiKey || apiKey === 'your_api_key_here') {
    console.warn('[Summarizer] 未配置API Key，返回原描述');
    return description || title;
  }
  
  const prompt = `请根据以下视频标题和描述，生成一个200字左右的中文摘要，概括视频的核心内容：

视频标题：${title}
视频描述：${description || '无'}

请直接输出摘要内容，不需要任何前缀：`;

  try {
    const response = await axios.post(
      `${baseUrl}/v1/messages`,
      {
        model: 'MiniMax-M2.5',
        max_tokens: 500,
        system: '你是一个专业的视频内容摘要助手，擅长用简洁的中文概括视频要点。',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ]
      },
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        timeout: 30000
      }
    );
    
    if (response.data && response.data.content && response.data.content.length > 0) {
      for (const block of response.data.content) {
        if (block.type === 'text') {
          return block.text.trim();
        }
      }
    }
    
    return description || title;
  } catch (error) {
    console.error('[Summarizer] API调用失败:', error.message);
    if (error.response) {
      console.error('[Summarizer] 响应数据:', error.response.data);
    }
    return description || title;
  }
}

export default { summarize };
