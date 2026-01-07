import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpCircle, Github } from 'lucide-react';
import { useUpdaterStore } from '../../store/updaterStore';
import { cn } from './Button';

export function VersionBadge() {
  const [version, setVersion] = useState<string>('');
  const status = useUpdaterStore((s) => s.status);
  const update = useUpdaterStore((s) => s.update);
  const openUpdater = useUpdaterStore((s) => s.open);
  const checkForUpdates = useUpdaterStore((s) => s.checkForUpdates);

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
          const { getVersion } = await import('@tauri-apps/api/app');
          const v = await getVersion();
          if (!canceled) setVersion(v);
          return;
        }
      } catch {}

      if (!canceled) setVersion(import.meta.env.DEV ? 'dev' : '');
    };

    load();
    return () => {
      canceled = true;
    };
  }, []);

  const hasUpdate = status === 'available' && Boolean(update);

  const title = useMemo(() => {
    if (hasUpdate) return `发现新版本 v${update?.version || ''}，点击查看/安装`;
    return '点击检查更新';
  }, [hasUpdate, update?.version]);

  const handleClick = async () => {
    if (hasUpdate) {
      openUpdater();
      return;
    }
    await checkForUpdates({ silent: false, openIfAvailable: true });
  };

  const repoUrl = import.meta.env.VITE_GITHUB_REPO_URL || '';

  const handleOpenRepo = async () => {
    if (!repoUrl) return;
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        const { openUrl } = await import('@tauri-apps/plugin-opener');
        await openUrl(repoUrl);
        return;
      }
      window.open(repoUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Open repo failed:', err);
    }
  };

  return (
    <div
      className={cn(
        'fixed right-4 bottom-24 md:bottom-4 z-[55] inline-flex items-center gap-2'
      )}
      style={{ WebkitAppRegion: 'no-drag' } as any}
    >
      <button
        type="button"
        onClick={handleOpenRepo}
        title={repoUrl || '未配置 GitHub 仓库地址'}
        className={cn(
          'inline-flex items-center justify-center p-2 rounded-xl',
          'bg-white/70 backdrop-blur-md border border-slate-200/60 shadow-sm',
          'text-slate-500 hover:text-slate-700 hover:bg-white transition-colors'
        )}
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <Github className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={handleClick}
        title={title}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl',
          'bg-white/70 backdrop-blur-md border border-slate-200/60 shadow-sm',
          'text-xs text-slate-500 hover:text-slate-700 hover:bg-white transition-colors'
        )}
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {hasUpdate && <ArrowUpCircle className="w-4 h-4 text-blue-600" />}
        <span className="font-mono font-bold">v{version || '—'}</span>
      </button>
    </div>
  );
}
