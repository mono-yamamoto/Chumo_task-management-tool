import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useTaskDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const taskIdFromUrl = searchParams.get('task');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(taskIdFromUrl);

  // URL変更時に同期
  useEffect(() => {
    setSelectedTaskId(taskIdFromUrl);
  }, [taskIdFromUrl]);

  const openDrawer = useCallback(
    (taskId: string) => {
      setSelectedTaskId(taskId);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('task', taskId);
        return next;
      });
    },
    [setSearchParams]
  );

  const closeDrawer = useCallback(() => {
    setSelectedTaskId(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('task');
      return next;
    });
  }, [setSearchParams]);

  return {
    selectedTaskId,
    isOpen: selectedTaskId != null,
    openDrawer,
    closeDrawer,
  } as const;
}
