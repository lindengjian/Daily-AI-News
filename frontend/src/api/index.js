import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000
});

export function getNewsList(params) {
  return api.get('/news', { params });
}

export function getNewsById(id) {
  return api.get(`/news/${id}`);
}

export function getTodayNews() {
  return api.get('/news/today');
}

export function triggerCollect() {
  return api.post('/news/collect');
}

export default api;
