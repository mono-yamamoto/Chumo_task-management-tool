import { useState, useCallback } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { Task } from '@/types';
import { useUpdateTask } from '@/hooks/useTasks';
import { queryKeys } from '@/lib/queryKeys';
import { hasTaskChanges } from '@/utils/taskUtils';
import { useToast } from '@/hooks/useToast';

/**
 * タスク詳細Drawer管理のカスタムフック
 */
export function useTaskDrawer(params: {
  queryClient: QueryClient;
  selectedTask: Task | null;
  taskFormDataValue: Partial<Task> | null;
  resetSelection: () => void;
}) {
  const { queryClient, selectedTask, taskFormDataValue, resetSelection } = params;
  const [isSavingOnClose, setIsSavingOnClose] = useState(false);
  const { success, error: showError } = useToast();
  const updateTask = useUpdateTask();

  const handleDrawerClose = useCallback(async () => {
    // 競合状態の防止: 既に保存中の場合は何もしない
    if (isSavingOnClose) return;

    if (!taskFormDataValue || !selectedTask) {
      resetSelection();
      return;
    }

    const projectType = selectedTask?.projectType;
    if (!projectType) {
      resetSelection();
      return;
    }

    // 変更があるかチェック
    const changeDetected = hasTaskChanges(taskFormDataValue, selectedTask);

    // 変更がある場合のみ保存
    if (changeDetected) {
      setIsSavingOnClose(true);
      try {
        await updateTask.mutateAsync({
          projectType,
          taskId: selectedTask.id,
          updates: taskFormDataValue,
        });

        // 保存成功時にキャッシュを無効化してリアルタイム反映
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks('all') });
        queryClient.invalidateQueries({ queryKey: queryKeys.task(selectedTask.id) });

        success('タスクを保存しました');
        resetSelection();
      } catch (error) {
        console.error('保存に失敗しました:', error);
        const errorMessage =
          error instanceof Error ? error.message : '保存に失敗しました。もう一度お試しください。';
        showError(errorMessage);
        // エラー時はDrawerを開いたまま
      } finally {
        setIsSavingOnClose(false);
      }
    } else {
      resetSelection();
    }
  }, [isSavingOnClose, taskFormDataValue, selectedTask, resetSelection, queryClient, success, showError, updateTask]);

  return {
    isSavingOnClose,
    handleDrawerClose,
  };
}
