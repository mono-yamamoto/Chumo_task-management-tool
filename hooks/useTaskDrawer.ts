import { useState, useCallback } from 'react';
import { QueryClient, QueryKey } from '@tanstack/react-query';
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
  /** 追加で無効化するクエリキー（例: ダッシュボード用） */
  extraInvalidateQueryKeys?: QueryKey[];
}) {
  const { queryClient, selectedTask, taskFormDataValue, resetSelection, extraInvalidateQueryKeys } =
    params;
  const [isSaving, setIsSaving] = useState(false);
  const { success, error: showError } = useToast();
  const updateTask = useUpdateTask();

  /**
   * 現在の変更を保存する
   * @returns 保存成功時はtrue、失敗時はfalse
   */
  const saveCurrentChanges = useCallback(async (): Promise<boolean> => {
    if (!taskFormDataValue || !selectedTask) return true;

    const projectType = selectedTask?.projectType;
    if (!projectType) return true;

    // 変更があるかチェック
    const changeDetected = hasTaskChanges(taskFormDataValue, selectedTask);
    if (!changeDetected) return true;

    setIsSaving(true);
    try {
      await updateTask.mutateAsync({
        projectType,
        taskId: selectedTask.id,
        updates: taskFormDataValue,
      });

      // 保存成功時にキャッシュを無効化してリアルタイム反映
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks('all') });
      queryClient.invalidateQueries({ queryKey: queryKeys.task(selectedTask.id) });
      // 追加のクエリキーを無効化
      extraInvalidateQueryKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      return true;
    } catch (error) {
      console.error('保存に失敗しました:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [taskFormDataValue, selectedTask, queryClient, updateTask, extraInvalidateQueryKeys]);

  const handleDrawerClose = useCallback(async () => {
    // 競合状態の防止: 既に保存中の場合は何もしない
    if (isSaving) return;

    if (!taskFormDataValue || !selectedTask) {
      resetSelection();
      return;
    }

    const saved = await saveCurrentChanges();
    if (saved) {
      // 変更があった場合のみトースト表示（変更がなくてもsavedはtrue）
      const changeDetected = hasTaskChanges(taskFormDataValue, selectedTask);
      if (changeDetected) {
        success('タスクを保存しました');
      }
      resetSelection();
    } else {
      const errorMessage = '保存に失敗しました。もう一度お試しください。';
      showError(errorMessage);
      // エラー時はDrawerを開いたまま
    }
  }, [
    isSaving,
    taskFormDataValue,
    selectedTask,
    resetSelection,
    saveCurrentChanges,
    success,
    showError,
  ]);

  return {
    isSaving,
    isSavingOnClose: isSaving, // 後方互換性のため
    saveCurrentChanges,
    handleDrawerClose,
  };
}
