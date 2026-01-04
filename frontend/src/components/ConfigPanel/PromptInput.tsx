import React from 'react';
import { MessageSquare } from 'lucide-react';
import { useConfigStore } from '../../store/configStore';

export function PromptInput() {
  const { prompt, setPrompt } = useConfigStore();

  return (
    <div className="flex flex-col gap-2 h-full">
      <label className="text-sm font-medium text-gray-700 flex items-center gap-2 flex-shrink-0">
        <MessageSquare className="w-4 h-4" />
        提示词 (Prompt)
      </label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="描述你想要生成的图片..."
        className="flex-1 w-full rounded-2xl border-none bg-slate-100 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all duration-200 resize-none min-h-[80px]"
      />
    </div>
  );
}
