import { Router } from 'express';
import collector from '../services/collector.js';
import axios from 'axios';

const router = Router();

router.get('/proxy/image', async (req, res) => {
  try {
    const url = req.query.url;
    if (typeof url !== 'string' || !url) {
      return res.status(400).json({ error: 'missing url' });
    }

    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return res.status(400).json({ error: 'invalid url' });
    }

    if (parsed.protocol !== 'https:') {
      return res.status(400).json({ error: 'invalid protocol' });
    }

    const host = parsed.hostname.toLowerCase();
    const allowed =
      host.endsWith('.hdslb.com') ||
      host === 'hdslb.com' ||
      host === 'i.ytimg.com' ||
      host === 'ytimg.com' ||
      host === 'avatars.githubusercontent.com';

    if (!allowed) {
      return res.status(400).json({ error: 'host not allowed' });
    }

    const upstream = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: host.includes('hdslb.com') ? 'https://www.bilibili.com/' : undefined
      }
    });

    const contentType = upstream.headers['content-type'] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(Buffer.from(upstream.data));
  } catch (error) {
    res.status(502).json({ error: 'proxy failed' });
  }
});

router.get('/news', (req, res) => {
  try {
    const { page = 1, limit = 10, source } = req.query;
    const result = collector.getNewsList({
      page: parseInt(page),
      limit: parseInt(limit),
      source
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/news/today', (req, res) => {
  try {
    const items = collector.getTodayNews();
    res.json({ items, total: items.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/news/:id', (req, res) => {
  try {
    const item = collector.getNewsById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/news/collect', async (req, res) => {
  try {
    const count = await collector.collectNews();
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
