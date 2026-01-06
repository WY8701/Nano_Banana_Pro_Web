import axios, { AxiosInstance } from 'axios';
import { ApiResponse } from '../types';

// 根据 API 文档，后端地址默认为 http://localhost:8080
let BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// 创建 axios 实例
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
}) as AxiosInstance;

// 如果在 Tauri 环境中，监听后端实际分配的端口
if (window.__TAURI_INTERNALS__) {
  import('@tauri-apps/api/event').then(({ listen }) => {
    listen<{ port: number }>('backend-port', (event) => {
      console.log('Received new backend port:', event.payload.port);
      const newBaseUrl = `http://127.0.0.1:${event.payload.port}/api/v1`;
      BASE_URL = newBaseUrl;
      api.defaults.baseURL = newBaseUrl;
      
      // 同时也给所有的 axios 拦截器更新基础地址（如果有缓存的话）
      console.log('API base URL updated to:', newBaseUrl);
    });
  });
}

// 请求拦截器：确保在没有获取到动态端口前，如果是在 Tauri 环境下，先等待或者记录日志
api.interceptors.request.use((config) => {
  // 打印当前请求的完整 URL 方便调试
  console.log(`Making request to: ${config.baseURL}${config.url}`);
  return config;
});

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 特殊响应（如 responseType: 'blob'）不走统一 ApiResponse 解包
    const data = response.data as unknown;
    if (data instanceof Blob) return data;

    // 统一 JSON 响应格式解包：{ code, message, data }
    if (data && typeof data === 'object' && 'code' in data) {
      const res = data as ApiResponse<any>;
      // 支持 0 或 200 作为成功码
      if (typeof res.code === 'number' && res.code !== 0 && res.code !== 200) {
        return Promise.reject(new Error(res.message || 'Error'));
      }
      return res.data;
    }

    // 非统一结构（或后端直出数据），原样返回
    return data;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// 构造图片完整 URL 的工具函数
export const getImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  // 从 BASE_URL 中提取基础地址（去掉 /api/v1）
  const baseHost = BASE_URL.replace('/api/v1', '');
  // 确保路径以 / 开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${baseHost}${normalizedPath}`;
};

// 获取图片下载 URL
export const getImageDownloadUrl = (id: string) => {
    return `${BASE_URL}/images/${id}/download`;
};

export default api;
