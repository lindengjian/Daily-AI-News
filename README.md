# Daily AI News

一个聚合「最新 AI 资讯」的网站：从 Bilibili / YouTube / GitHub 等来源采集与筛选近期内容，支持自动翻译为中文，并可使用 MiniMax M2.5 生成摘要。本项目同时支持本地全栈运行（可网页手动采集、显示采集进度）与 GitHub Pages 静态部署（由 GitHub Actions 定时采集并发布）。

## 功能特性

- 最新资讯：按时间筛选近期内容（如 YouTube 默认仅保留近 2 天）
- 内容过滤：偏向模型/工具/发布/更新，过滤短剧/课程等无关内容
- 中文化：对英文内容进行自动翻译（当前实现使用公开翻译服务，可按需替换）
- 摘要生成：通过 MiniMax Anthropic 兼容接口调用 MiniMax M2.5 生成摘要
- 预览图支持：
  - 本地开发：后端提供图片代理接口，规避部分站点防盗链
  - GitHub Pages：采集时下载缩略图到静态目录，前端直接引用本地资源
- 采集体验（仅本地全栈）：手动采集弹窗显示进度；当天已采集则提示隔天再试

## 技术栈

- 前端：Vue 3 + Vite + Vue Router
- 后端：Node.js（Express）+ sql.js（SQLite in WASM）+ node-cron
- 部署：GitHub Actions（采集/构建）+ GitHub Pages（静态站点）

## 目录结构

```
.
├─ backend/                 # 后端服务（本地运行/采集逻辑）
│  ├─ src/
│  └─ scripts/collect-static.js  # Actions 静态采集脚本（写入 frontend/public）
├─ frontend/                # 前端站点
│  ├─ public/data/news.json  # 静态数据（Pages 模式读取）
│  └─ public/thumbs/         # 缩略图静态资源（Pages 模式读取）
└─ .github/workflows/        # GitHub Actions 工作流（采集/部署）
```

## 本地部署（开发/自托管）

### 1) 环境要求

- Node.js 20+（建议与 Actions 保持一致）

### 2) 配置后端环境变量

在 `backend/` 下创建 `.env`：

```bash
cp backend/.env.example backend/.env
```

然后编辑 `backend/.env`，至少填写：

- `MINIMAX_API_KEY`
- `MINIMAX_BASE_URL`（默认 `https://api.minimaxi.com/anthropic`）

可选：

- `GITHUB_TOKEN`：提高 GitHub API 配额与稳定性（本地可在 shell 环境导出）

### 3) 启动后端

```bash
cd backend
npm ci
npm run dev
```

默认地址：

- Health：`http://localhost:3000/health`
- API：`http://localhost:3000/api`

常用接口：

- `GET /api/news`：分页列表
- `GET /api/news/:id`：详情
- `POST /api/news/collect`：触发采集（当日已采集则返回 409）
- `GET /api/news/collect/status`：采集进度
- `GET /api/proxy/image?url=...`：图片代理（用于本地开发预览图）

### 4) 启动前端

```bash
cd frontend
npm ci
npm run dev
```

打开 Vite 提示的本地地址（通常是 `http://localhost:5173/`）。

### 5) 验证采集

- 在网页点击「手动采集」应出现进度弹窗
- 若当天已采集过，会提示「今天已经采集过了，请明天再试」

## GitHub Pages 部署（GitHub Actions 定时采集 + 静态站展示）

该模式下站点为纯静态页面：

- 数据读取：前端从 `frontend/public/data/news.json` 读取
- 缩略图读取：前端从 `frontend/public/thumbs/` 读取
- 网页端不支持“手动采集/进度查询”（会提示需要去 Actions 运行工作流）

### 1) 准备仓库

将项目推送到 GitHub（默认分支为 `main`）。

### 2) 配置 Secrets

进入 GitHub 仓库：

`Settings -> Secrets and variables -> Actions -> New repository secret`

添加：

- `MINIMAX_API_KEY`
- `MINIMAX_BASE_URL`（推荐：`https://api.minimaxi.com/anthropic`）

### 3) 启用 Pages（使用 GitHub Actions 作为 Source）

进入：

`Settings -> Pages`

将 `Source` 选择为 **GitHub Actions**。

### 4) 运行采集工作流

进入：

`Actions -> Collect Daily AI News -> Run workflow`

该工作流会运行 `backend/scripts/collect-static.js`，并将结果写入：

- `frontend/public/data/news.json`
- `frontend/public/thumbs/*`

然后自动提交回仓库（`chore: update daily news`）。

### 5) 自动部署

当 `main` 分支有提交时，会触发 `Deploy GitHub Pages` 工作流构建并发布。

部署后访问：

`https://<你的用户名>.github.io/<仓库名>/`

## 常见问题排查

### 页面显示「暂无资讯」

- 先确认 `Actions -> Collect Daily AI News` 最近一次是否成功
- 检查仓库中的 `frontend/public/data/news.json` 是否为非空
- 若采集工作流失败：进入该工作流的日志查看具体来源报错（B站/YouTube/GitHub 可能因风控或配额导致失败）

### 静态站点为什么不能点按钮采集？

GitHub Pages 仅提供静态资源托管，无法运行后端采集服务；采集需要通过 GitHub Actions 在云端执行，产出静态的 `news.json` 与缩略图后再由页面展示。

