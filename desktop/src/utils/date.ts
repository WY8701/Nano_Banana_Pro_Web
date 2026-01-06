export function formatDateTime(dateStr?: string | number | null): string {
  if (!dateStr) return '未知时间';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '无效日期';
    return date.toLocaleString('zh-CN', { 
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
  } catch (e) {
    return '解析失败';
  }
}
