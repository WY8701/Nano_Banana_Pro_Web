import api from './api';
import { HistoryQueryParams, HistoryListResponse, GenerationTask } from '../types';

// 健康检查接口
export interface HealthCheckResponse {
  status: string;
  message: string;
}

// 获取历史列表 (支持关键词搜索和分页)
// 后端统一使用 /images 接口，通过 keyword 参数过滤
export const getHistory = (params: HistoryQueryParams) =>
  api.get<HistoryListResponse>('/images', { params });

// 搜索历史列表 (复用 getHistory)
export const searchHistory = (params: HistoryQueryParams) =>
  getHistory(params);

// 获取历史详情 (后端使用 /tasks/:id)
export const getHistoryDetail = (id: string) =>
  api.get<GenerationTask>(`/tasks/${id}`);

// 删除历史记录 (后端统一使用 /images/:id)
export const deleteHistory = (id: string) =>
  api.delete<void>(`/images/${id}`);

// 批量删除 (目前后端尚未实现批量删除接口，循环调用单个删除)
export const deleteBatchHistory = async (ids: string[]) => {
  for (const id of ids) {
    await deleteHistory(id);
  }
};

// 删除单张图片 (复用 deleteHistory)
export const deleteImage = (id: string) =>
  deleteHistory(id);

// 批量导出图片 (返回 Blob)
// 注意：成功时返回 ZIP 文件，失败时返回纯文本错误消息（非JSON）
export const exportImages = async (imageIds: string[]): Promise<Blob> => {
  const response = await api.post('/images/export', { imageIds }, { responseType: 'blob' });
  // api 拦截器在 blob 模式下会直接返回 Blob，不会解包
  // 因此这里 response 应该就是 Blob 类型
  return response as Blob;
};

// 健康检查
// 检查服务是否正常运行
export const healthCheck = () =>
  api.get<HealthCheckResponse>('/health');
