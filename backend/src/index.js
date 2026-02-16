import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import config from './config/index.js';
import routes from './routes/index.js';
import collector from './services/collector.js';
import db from './db/index.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

async function startServer() {
  try {
    await db.initDb();
    console.log('[DB] 数据库初始化完成');
    
    if (config.cron.collect) {
      cron.schedule(config.cron.collect, async () => {
        console.log(`[Cron] 定时任务触发: ${new Date().toISOString()}`);
        try {
          await collector.collectNews();
        } catch (error) {
          console.error('[Cron] 采集失败:', error);
        }
      });
      console.log(`[Cron] 已设置定时任务: ${config.cron.collect}`);
    }
    
    const PORT = config.port;
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`API: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
}

startServer();

export default app;
