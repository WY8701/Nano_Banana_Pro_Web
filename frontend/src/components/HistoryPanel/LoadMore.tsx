import React from 'react';
import { Button } from '../common/Button';
import { useHistoryStore } from '../../store/historyStore';
import { Loader2 } from 'lucide-react';

export function LoadMore() {
  const { loading, hasMore, loadMore } = useHistoryStore();

  if (!hasMore) {
      return (
          <div className="text-center py-4 text-xs text-gray-400">
              没有更多了
          </div>
      );
  }

  return (
    <div className="flex justify-center py-4">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={loadMore}
        disabled={loading}
        className="text-gray-500"
      >
        {loading ? (
            <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                加载中...
            </>
        ) : (
            '加载更多'
        )}
      </Button>
    </div>
  );
}
