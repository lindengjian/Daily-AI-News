<template>
  <div class="home">
    <div class="container">
      <div class="page-header">
        <h1 class="page-title">最新AI资讯</h1>
        <div class="header-actions">
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
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getNewsList, triggerCollect } from '@/api/index';

const router = useRouter();

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
  loading.value = true;
  try {
    const { data } = await triggerCollect();
    console.log('采集完成:', data);
    await fetchNews();
  } catch (error) {
    console.error('采集失败:', error);
  } finally {
    loading.value = false;
  }
}

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
