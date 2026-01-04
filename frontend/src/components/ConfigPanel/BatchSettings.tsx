import React from 'react';
import { Settings2 } from 'lucide-react';
import { useConfigStore } from '../../store/configStore';
import { Select } from '../common/Select';
import { Input } from '../common/Input';

export function BatchSettings() {
  const { count, setCount, imageSize, setImageSize, aspectRatio, setAspectRatio } = useConfigStore();

  return (
    <div className="space-y-3">
        <div className="flex items-center gap-2 text-gray-900 font-medium">
            <Settings2 className="w-4 h-4" />
            <span>生成设置</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
                <label className="text-xs text-gray-500">数量 (1-10)</label>
                <Input
                    type="number"
                    min={1}
                    max={10}
                    value={count}
                    onChange={(e) => {
                        const value = Number(e.target.value);
                        // 限制在 1-10 范围内
                        const clampedValue = Math.max(1, Math.min(10, value || 1));
                        setCount(clampedValue);
                    }}
                    className="h-9 text-sm"
                />
            </div>
            <div className="space-y-1">
                <label className="text-xs text-gray-500">分辨率</label>
                <Select value={imageSize} onChange={(e) => setImageSize(e.target.value)} className="h-9 text-sm">
                    <option value="1K">1K (1024px)</option>
                    <option value="2K">2K (2048px)</option>
                    <option value="4K">4K (3840px)</option>
                </Select>
            </div>
        </div>

        <div className="space-y-1">
            <label className="text-xs text-gray-500">宽高比</label>
             <Select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="h-9 text-sm">
                <option value="1:1">1:1 (正方形)</option>
                <option value="2:3">2:3 (竖向 2:3)</option>
                <option value="3:2">3:2 (横向 3:2)</option>
                <option value="3:4">3:4 (竖向 3:4)</option>
                <option value="4:3">4:3 (标准 4:3)</option>
                <option value="4:5">4:5 (竖向 4:5)</option>
                <option value="5:4">5:4 (横向 5:4)</option>
                <option value="9:16">9:16 (手机宽屏)</option>
                <option value="16:9">16:9 (电脑宽屏)</option>
                <option value="21:9">21:9 (超宽屏)</option>
            </Select>
        </div>
    </div>
  );
}