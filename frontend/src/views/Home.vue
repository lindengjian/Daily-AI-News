<template>
  <div class="home">
    <div class="container">
      <div class="page-header">
        <h1 class="page-title">最新AI资讯</h1>
        <div v-if="!isProd" class="header-actions">
          <button @click="handleCollect" class="btn btn-primary" :disabled="loading">
            {{ loading ? '收集中...' : '手动采集' }}
          </button>
        </div>
      </div>
      
      <div class="filter-bar">
        <button 
          v-for="source in sources" 
          :key="source.value"
          :class="['filter-btn', { active: currentSource === source.value }]"
          @click="currentSource = source.value"
        >
          {{ source.label }}
        </button>
      </div>
      
      <div v-if="loading && !newsList.length" class="loading">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>
      
      <div v-else-if="!newsList.length" class="empty">
        <p>暂无资讯</p>
        <button @click="handleCollect" class="btn btn-outline">点击采集</button>
      </div>
      
      <div v-else class="news-grid">
        <div 
          v-for="item in newsList" 
          :key="item.id" 
          class="news-card"
          @click="goToDetail(item.id)"
        >
          <div class="card-thumbnail">
            <img 
              v-if="hasThumbnail(item)" 
              :src="getThumbnailSrc(item)" 
              :alt="item.title"
              loading="lazy"
              @error="handleThumbError(item.id)"
            />
            <div v-else class="thumbnail-placeholder">
              <span>{{ getSourceIcon(item.source) }}</span>
            </div>
            <span class="media-badge" :class="item.media_type">
              {{ item.media_type === 'video' ? '🎬 视频' : '📄 文章' }}
            </span>
          </div>
          <div class="card-content">
            <div class="card-meta">
              <span class="source-tag" :class="item.source">{{ item.source }}</span>
              <span class="time">{{ formatTime(item.collected_at) }}</span>
            </div>
            <h3 class="card-title">{{ item.title }}</h3>
            <p class="card-summary">{{ item.summary || item.content || '暂无摘要' }}</p>
          </div>
        </div>
      </div>
      
      <div v-if="totalPages > 1" class="pagination">
        <button 
          class="page-btn" 
          :disabled="page <= 1"
          @click="page--; fetchNews()"
        >
          上一页
        </button>
        <span class="page-info">{{ page }} / {{ totalPages }}</span>
        <button 
          class="page-btn" 
          :disabled="page >= totalPages"
          @click="page++; fetchNews()"
        >
          下一页
        </button>
      </div>
    </div>

    <div v-if="collectModalOpen" class="collect-overlay" @click.self="closeCollectModal">
      <div class="collect-modal">
        <div class="collect-head">
          <div class="collect-title">采集进度</div>
          <button class="collect-close" @click="closeCollectModal">×</button>
        </div>

        <div class="collect-body">
          <div class="collect-status">
            <div class="collect-message">{{ collectMessage }}</div>
            <div class="collect-meta">
              <span v-if="collectDay">日期：{{ collectDay }}</span>
              <span v-if="collectTotal">进度：{{ collectDone }}/{{ collectTotal }}</span>
            </div>
          </div>

          <div class="collect-bar">
            <div class="collect-bar-track">
              <div class="collect-bar-fill" :style="{ width: `${collectPercent}%` }"></div>
            </div>
            <div class="collect-bar-percent">{{ collectPercent }}%</div>
          </div>

          <div class="collect-log">
            <div v-for="(line, idx) in collectLog" :key="idx" class="collect-log-line">{{ line }}</div>
          </div>
        </div>

        <div class="collect-foot">
          <button class="btn btn-outline" @click="closeCollectModal">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { getNewsList, triggerCollect, getCollectStatus } from '@/api/index';

const router = useRouter();
const isProd = import.meta.env.PROD;

const newsList = ref([]);
const loading = ref(false);
const page = ref(1);
const limit = ref(12);
const total = ref(0);
const currentSource = ref(null);

const sources = [
  { value: null, label: '全部' },
  { value: 'bilibili', label: 'Bilibili' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'github', label: 'GitHub' }
];

const totalPages = ref(0);
const thumbErrorMap = ref({});

const collectModalOpen = ref(false);
const collectStatus = ref(null);
const collectLog = ref([]);
let collectTimer = null;

async function fetchNews() {
  loading.value = true;
  try {
    const params = {
      page: page.value,
      limit: limit.value
    };
    if (currentSource.value) {
      params.source = currentSource.value;
    }
    const { data } = await getNewsList(params);
    newsList.value = data.items;
    total.value = data.total;
    totalPages.value = data.totalPages;
  } catch (error) {
    console.error('获取资讯失败:', error);
  } finally {
    loading.value = false;
  }
}

async function handleCollect() {
  collectModalOpen.value = true;
  collectLog.value = [];
  collectStatus.value = { stage: 'checking', message: '检查采集状态', percent: 0, running: true };

  loading.value = true;
  try {
    const { data } = await triggerCollect();
    if (data?.status) {
      collectStatus.value = data.status;
      pushCollectLog(data.status.message || '开始采集');
      startCollectPolling();
    } else {
      pushCollectLog('开始采集');
      startCollectPolling();
    }
  } catch (error) {
    if (error?.response?.status === 409 && error?.response?.data?.code === 'COLLECTED_TODAY') {
      collectStatus.value = error.response.data.status || { running: false, percent: 100, stage: 'blocked', message: '今天已经采集过了，请明天再试' };
      pushCollectLog('今天已经采集过了，请明天再试');
    } else {
      collectStatus.value = { running: false, percent: 100, stage: 'error', message: '采集失败' };
      pushCollectLog('采集失败');
      console.error('采集失败:', error);
    }
  } finally {
    loading.value = false;
  }
}

function startCollectPolling() {
  if (collectTimer) clearInterval(collectTimer);
  collectTimer = setInterval(async () => {
    try {
      const { data } = await getCollectStatus();
      const s = data?.status;
      if (!s) return;
      const prev = collectStatus.value;
      collectStatus.value = s;
      if (s.message && (!prev || prev.message !== s.message)) {
        pushCollectLog(s.message);
      }
      if (s.running === false) {
        clearInterval(collectTimer);
        collectTimer = null;
        if (s.stage === 'done') {
          pushCollectLog(`采集完成，新增 ${s.count || 0} 条`);
          await fetchNews();
        }
      }
    } catch (e) {
      clearInterval(collectTimer);
      collectTimer = null;
      pushCollectLog('获取进度失败');
    }
  }, 1000);
}

function pushCollectLog(line) {
  const ts = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  const next = [...collectLog.value, `[${ts}] ${line}`];
  collectLog.value = next.slice(-30);
}

function closeCollectModal() {
  collectModalOpen.value = false;
  if (collectTimer) {
    clearInterval(collectTimer);
    collectTimer = null;
  }
}

const collectPercent = computed(() => {
  const p = Number(collectStatus.value?.percent ?? 0);
  if (Number.isNaN(p)) return 0;
  return Math.max(0, Math.min(100, Math.round(p)));
});

const collectMessage = computed(() => {
  return collectStatus.value?.message || '等待中';
});

const collectTotal = computed(() => Number(collectStatus.value?.total || 0));
const collectDone = computed(() => Number(collectStatus.value?.done || 0));
const collectDay = computed(() => collectStatus.value?.day || '');

function goToDetail(id) {
  router.push(`/detail/${id}`);
}

function getSourceIcon(source) {
  const icons = {
    bilibili: '📺',
    youtube: '▶️',
    github: '🐙'
  };
  return icons[source] || '📰';
}

function getThumbnailSrc(item) {
  if (!item?.thumbnail) return '';
  if (item.source === 'bilibili') {
    if (typeof item.thumbnail === 'string' && item.thumbnail.startsWith('/thumbs/')) {
      return item.thumbnail;
    }
    return `/api/proxy/image?url=${encodeURIComponent(item.thumbnail)}`;
  }
  return item.thumbnail;
}

function handleThumbError(id) {
  thumbErrorMap.value = { ...thumbErrorMap.value, [id]: true };
}

function hasThumbnail(item) {
  return Boolean(item?.thumbnail) && !thumbErrorMap.value[item.id];
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const date = new Date(timeStr);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
  
  return date.toLocaleDateString('zh-CN');
}

watch(currentSource, () => {
  page.value = 1;
  fetchNews();
});

onMounted(() => {
  fetchNews();
});
</script>

<style scoped>
.home {
  padding: 20px 0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #333;
}

.collect-overlay {
  position: fixed;
  inset: 0;
  background: radial-gradient(1200px 600px at 50% 20%, rgba(102, 126, 234, 0.18), rgba(0, 0, 0, 0.55));
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 50;
}

.collect-modal {
  width: min(560px, 100%);
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.65);
  border-radius: 16px;
  box-shadow: 0 22px 70px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.collect-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.12));
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.collect-title {
  font-size: 16px;
  font-weight: 700;
  color: #222;
  letter-spacing: 0.2px;
}

.collect-close {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  color: #333;
}

.collect-body {
  padding: 16px;
}

.collect-status {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
}

.collect-message {
  font-size: 14px;
  font-weight: 600;
  color: #222;
}

.collect-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #666;
}

.collect-bar {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
}

.collect-bar-track {
  height: 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.collect-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #667eea, #764ba2);
  box-shadow: 0 10px 18px rgba(102, 126, 234, 0.25);
  transition: width 0.35s ease;
}

.collect-bar-percent {
  font-size: 12px;
  font-weight: 700;
  color: #444;
  min-width: 42px;
  text-align: right;
}

.collect-log {
  height: 180px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.65);
  padding: 10px 12px;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
  color: #2a2a2a;
}

.collect-log-line {
  padding: 2px 0;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.06);
}

.collect-foot {
  padding: 12px 16px 16px;
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-outline {
  background: #fff;
  color: #667eea;
  border: 1px solid #667eea;
}

.filter-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
}

.filter-btn {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  border: 1px solid #eee;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

.filter-btn.active {
  background: #667eea;
  color: #fff;
  border-color: #667eea;
}

.news-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.news-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.news-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.card-thumbnail {
  position: relative;
  height: 180px;
  overflow: hidden;
}

.card-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-size: 48px;
}

.media-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
}

.card-content {
  padding: 16px;
}

.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.source-tag {
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.source-tag.bilibili {
  background: #00a1d620;
  color: #00a1d6;
}

.source-tag.youtube {
  background: #ff000020;
  color: #ff0000;
}

.source-tag.github {
  background: #33333320;
  color: #333;
}

.time {
  font-size: 12px;
  color: #999;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-summary {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.loading {
  text-align: center;
  padding: 60px 0;
  color: #999;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 16px;
  border: 3px solid #eee;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty {
  text-align: center;
  padding: 60px 0;
  color: #999;
}

.empty p {
  margin-bottom: 16px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 40px;
}

.page-btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid #ddd;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  border-color: #667eea;
  color: #667eea;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #666;
}
</style>
