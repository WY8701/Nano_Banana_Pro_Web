import api from './api';
import { BatchGenerateRequest, GenerationTask } from '../types';
import { mapBackendTaskToFrontend } from '../utils/mapping';

// 批量生成图片 (JSON 版)
// 后端接口为 /tasks/generate
export const generateBatch = async (params: BatchGenerateRequest) => {
  const res = await api.post<any>('/tasks/generate', params);
  return mapBackendTaskToFrontend(res);
};

// 批量图生图 (FormData 版)
// 后端接口为 /tasks/generate-with-images
export const generateBatchWithImages = async (formData: FormData) => {
  const res = await api.post<any>('/tasks/generate-with-images', formData);
  return mapBackendTaskToFrontend(res);
};

// 查询任务状态 (后端接口为 /tasks/:task_id)
export const getTaskStatus = async (taskId: string) => {
  const res = await api.get<any>(`/tasks/${taskId}`);
  return mapBackendTaskToFrontend(res);
};