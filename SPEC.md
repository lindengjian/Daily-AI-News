# 每日AI资讯门户网站 - 技术规格说明

## 1. 项目概述

- **项目名称**: Daily AI News (每日AI资讯)
- **项目类型**: 全栈Web应用（后端API + 前端展示）
- **核心功能**: 每日自动收集10条AI相关新闻/视频，以Markdown格式存储，支持视频内嵌播放和AI内容概括
- **目标用户**: AI从业者、爱好者、学生

---

## 2. 技术栈

### 后端
- **运行时**: Node.js (v18+)
- **框架**: Express.js
- **数据库**: SQLite (better-sqlite3)
- **爬虫**: cheerio, axios, puppeteer (如需要)
- **定时任务**: node-cron
- **视频概括**: MiniMax API (MoE2.5)

### 前端
- **框架**: Vue 3 (Composition API)
- **构建工具**: Vite
- **UI组件**: 自定义组件
- **HTTP客户端**: axios

### 数据存储
- SQLite: 结构化数据存储（新闻条目元数据）
- JSON文件: 配置存储

---

## 3. 数据模型

### 新闻/视频条目 (news)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| title | TEXT | 标题 |
| content | TEXT | 内容/描述 (Markdown格式) |
| summary | TEXT | AI生成的视频摘要 |
| source | TEXT | 来源 (bilibili/youtube/github等) |
| source_url | TEXT | 原始链接 |
| embed_url | TEXT | 内嵌播放链接 |
| media_type | TEXT | 类型: article/video |
| published_at | DATETIME | 发布时间 |
| collected_at | DATETIME | 采集时间 |
| thumbnail | TEXT | 封面图URL |

---

## 4. 功能模块

### 4.1 数据采集模块

#### 采集来源
1. **Bilibili**: 搜索"AI"相关视频，选取热门
2. **YouTube**: 搜索"AI news/tutorial"相关视频
3. **GitHub**: 获取GitHub Trending AI项目

#### 采集策略
- 每日定时执行（可配置时间，默认早上9点）
- 每次采集10条，按热度/最新排序
- 去重处理（基于URL）

### 4.2 视频概括模块

- 使用MiniMax MoE2.5 API生成视频内容摘要
- 输入: 视频标题 + 描述
- 输出: 200字左右的中文摘要
- 失败处理: 降级为原描述

### 4.3 API接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/news | GET | 获取新闻列表（支持分页、筛选） |
| /api/news/:id | GET | 获取单条新闻详情 |
| /api/news/collect | POST | 手动触发采集（管理接口） |
| /api/news/today | GET | 获取今日最新资讯 |
| /api/config | GET/POST | 配置管理 |

### 4.4 前端页面

1. **首页**: 展示最新资讯列表（卡片形式）
2. **详情页**: 新闻/视频详情，支持视频内嵌播放
3. **关于页**: 项目说明

---

## 5. 项目结构

```
Daily-AI-News/
├── backend/                 # 后端项目
│   ├── src/
│   │   ├── config/         # 配置文件
│   │   ├── crawlers/       # 爬虫模块
│   │   │   ├── bilibili.js
│   │   │   ├── youtube.js
│   │   │   └── github.js
│   │   ├── services/      # 业务服务
│   │   │   ├── collector.js
│   │   │   └── summarizer.js
│   │   ├── routes/        # 路由
│   │   ├── db/            # 数据库
│   │   └── index.js       # 入口
│   ├── package.json
│   └── .env.example
│
├── frontend/               # 前端项目
│   ├── src/
│   │   ├── components/    # 组件
│   │   ├── views/         # 页面
│   │   ├── api/           # API调用
│   │   ├── App.vue
│   │   └── main.js
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## 6. 环境变量

### 后端 (.env)
```
PORT=3000
DB_PATH=./data/news.db
MINIMAX_API_KEY=your_api_key_here
MINIMAX_BASE_URL=https://api.minimax.chat
CRAWL_BILIBILI=true
CRAWL_YOUTUBE=true
CRAWL_GITHUB=true
COLLECT_CRON=0 9 * * *
```

---

## 7. 验收标准

- [ ] 后端能成功启动并连接SQLite数据库
- [ ] 手动触发能成功采集10条新闻
- [ ] MiniMax API能正常生成视频摘要
- [ ] 定时任务能按设定时间自动执行
- [ ] 前端能展示新闻列表
- [ ] 视频能内嵌播放
- [ ] 整体页面加载无报错

---

## 8. 后续部署

- 后期可部署到Vercel/Netlify (前端) + Render/Railway (后端)
- GitHub Actions实现CI/CD
