import dotenv from 'dotenv';
dotenv.config();

export default {
  port: process.env.PORT || 3000,
  dbPath: process.env.DB_PATH || './data/news.db',
  minimax: {
    apiKey: process.env.MINIMAX_API_KEY || '',
    baseUrl: process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat'
  },
  crawlers: {
    bilibili: process.env.CRAWL_BILIBILI !== 'false',
    youtube: process.env.CRAWL_YOUTUBE !== 'false',
    github: process.env.CRAWL_GITHUB !== 'false'
  },
  cron: {
    collect: process.env.COLLECT_CRON || '0 9 * * *'
  }
};
