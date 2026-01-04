import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ConfigState {
  // 当前选中的 Provider
  provider: string;
  
  // 暂时保留，用于向后兼容或默认显示
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  
  prompt: string;
  count: number;
  imageSize: string;
  aspectRatio: string;
  refFiles: File[];

  setProvider: (provider: string) => void;
  setApiBaseUrl: (url: string) => void;
  setApiKey: (key: string) => void;
  setModel: (model: string) => void;
  setPrompt: (prompt: string) => void;
  setCount: (count: number) => void;
  setImageSize: (size: string) => void;
  setAspectRatio: (ratio: string) => void;
  addRefFiles: (files: File[]) => void;
  removeRefFile: (index: number) => void;
  clearRefFiles: () => void;

  reset: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      provider: 'gemini',
      apiBaseUrl: 'https://generativelanguage.googleapis.com',
      apiKey: '',
      model: 'gemini-3-pro-image-preview',
      prompt: '',
      count: 1,
      imageSize: '2K',
      aspectRatio: '1:1',
      refFiles: [],

      setProvider: (provider) => set({ provider }),
      setApiBaseUrl: (apiBaseUrl) => set({ apiBaseUrl }),
      setApiKey: (apiKey) => set({ apiKey }),
      setModel: (model) => set({ model }),
      setPrompt: (prompt) => set({ prompt }),
      setCount: (count) => set({ count }),
      setImageSize: (imageSize) => set({ imageSize }),
      setAspectRatio: (aspectRatio) => set({ aspectRatio }),

      addRefFiles: (files) => set((state) => ({
          // 限制最多 10 张
          refFiles: [...state.refFiles, ...files].slice(0, 10)
      })),

      removeRefFile: (index) => set((state) => ({
          refFiles: state.refFiles.filter((_, i) => i !== index)
      })),

      clearRefFiles: () => set({ refFiles: [] }),

      reset: () => set({
        apiBaseUrl: 'https://generativelanguage.googleapis.com',
        model: 'gemini-3-pro-image-preview',
        prompt: '',
        count: 1,
        imageSize: '2K',
        aspectRatio: '1:1',
        refFiles: [],
      })
    }),
    {
      name: 'app-config-storage',
      storage: createJSONStorage(() => localStorage),
      // 关键：不要将 File 对象序列化到 localStorage（File 对象无法序列化）
      partialize: (state) => {
          const { refFiles, ...rest } = state;
          return rest;
      }
    }
  )
);
