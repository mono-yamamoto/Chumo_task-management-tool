export function buildTaskDetailUrl(taskId: string): string {
  const browserOrigin =
    typeof window !== 'undefined' && typeof window.location !== 'undefined'
      ? window.location.origin
      : '';
  const envOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN || '';
  const base = (browserOrigin || envOrigin).replace(/\/$/, '');

  if (!base) {
    return '';
  }

  return `${base}/tasks/${taskId}`;
}
