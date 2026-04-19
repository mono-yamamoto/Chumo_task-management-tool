import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useTaskDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTaskId = searchParams.get('task');

  const openDrawer = useCallback(
    (taskId: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('task', taskId);
        return next;
      });
    },
    [setSearchParams]
  );

  const closeDrawer = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('task');
      return next;
    });
  }, [setSearchParams]);

  return {
    selectedTaskId,
    openDrawer,
    closeDrawer,
  } as const;
}
