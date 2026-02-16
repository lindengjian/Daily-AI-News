<template>
  <div class="detail">
    <div class="container">
      <button @click="goBack" class="back-btn">
        ← 返回列表
      </button>
      
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>
      
      <div v-else-if="news" class="detail-content">
        <div class="detail-header">
          <div class="meta">
            <span class="source-tag" :class="news.source">{{ news.source }}</span>
            <span class="time">{{ formatDate(news.published_at) }}</span>
          </div>
          <h1 class="title">{{ news.title }}</h1>
        </div>
        
        <div v-if="news.media_type === 'video' && news.embed_url" class="video-container">
          <iframe 
            :src="news.embed_url"
            frameborder="0" 
            allowfullscreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          ></iframe>
        </div>
        
        <div v-if="news.thumbnail && news.media_type === 'article'" class="article-cover">
          <img :src="news.thumbnail" :alt="news.title" />
        </div>
        
        <div v-if="news.summary" class="section summary-section">
          <h3 class="section-title">📝 内容摘要</h3>
          <div class="summary-content">{{ news.summary }}</div>
        </div>
        
        <div v-if="news.content" class="section content-section">
          <h3 class="section-title">📄 原始描述</h3>
          <div class="content">{{ news.content }}</div>
        </div>
        
        <div class="actions">
          <a :href="news.source_url" target="_blank" class="btn btn-primary">
            查看原文 →
          </a>
        </div>
      </div>
      
      <div v-else class="not-found">
        <p>资讯不存在</p>
        <button @click="goBack" class="btn btn-outline">返回首页</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getNewsById } from '@/api/index';

const route = useRoute();
const router = useRouter();

const news = ref(null);
const loading = ref(true);

async function fetchNews() {
  loading.value = true;
  try {
    const { data } = await getNewsById(route.params.id);
    news.value = data;
  } catch (error) {
    console.error('获取详情失败:', error);
  } finally {
    loading.value = false;
  }
}

function goBack() {
  router.push('/');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

onMounted(() => {
  fetchNews();
});
</script>

<style scoped>
.detail {
  padding: 20px 0 40px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  margin-bottom: 20px;
  border: none;
  background: #f5f7fa;
  border-radius: 8px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: #eee;
  color: #333;
}

.detail-content {
  background: #fff;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.detail-header {
  margin-bottom: 24px;
}

.meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.source-tag {
  padding: 4px 12px;
  border-radius: 12px;
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
  font-size: 14px;
  color: #999;
}

.title {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  line-height: 1.4;
}

.video-container {
  position: relative;
  width: 100%;
  padding-top: 56.25%;
  margin: 24px 0;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
}

.video-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.article-cover {
  margin: 24px 0;
  border-radius: 12px;
  overflow: hidden;
}

.article-cover img {
  width: 100%;
  max-height: 400px;
  object-fit: cover;
}

.section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.summary-section {
  background: #f8f9ff;
  padding: 20px;
  border-radius: 12px;
  border-left: 4px solid #667eea;
}

.summary-content {
  font-size: 15px;
  line-height: 1.8;
  color: #444;
}

.content-section {
  padding-top: 24px;
  border-top: 1px solid #eee;
}

.content {
  font-size: 15px;
  line-height: 1.8;
  color: #666;
}

.actions {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #eee;
}

.btn {
  display: inline-block;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-outline {
  background: #fff;
  color: #667eea;
  border: 1px solid #667eea;
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

.not-found {
  text-align: center;
  padding: 60px 0;
}

.not-found p {
  margin-bottom: 16px;
  color: #999;
}
</style>
