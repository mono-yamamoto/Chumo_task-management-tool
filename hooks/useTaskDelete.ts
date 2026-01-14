import { useState, useCallback } from 'react';
import { Task } from '@/types';
import { ProjectType } from '@/constants/projectTypes';
import { useDeleteTask } from '@/hooks/useTasks';

/**
 * タスク削除ダイアログの管理フック
 */
export function useTaskDelete(params: {
  tasks: Task[];
  selectedTaskIdValue?: string;
  resetSelection: () => void;
}) {
  const { tasks, selectedTaskIdValue, resetSelection } = params;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteProjectType, setDeleteProjectType] = useState<string | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('');

  const deleteTask = useDeleteTask();

  const handleDeleteClick = useCallback((taskId: string, projectType: string) => {
    setDeleteTaskId(taskId);
    setDeleteProjectType(projectType);
    setDeleteDialogOpen(true);
    setDeleteConfirmTitle('');
  }, []);

  const handleDeleteTask = useCallback(async () => {
    if (!deleteTaskId || !deleteProjectType) return;

    const taskToDelete = tasks?.find((t: Task) => t.id === deleteTaskId);
    if (!taskToDelete) {
      window.alert('タスクが見つかりません');
      setDeleteDialogOpen(false);
      return;
    }

    // タイトルが一致しない場合は削除しない
    if (deleteConfirmTitle !== taskToDelete.title) {
      window.alert('タイトルが一致しません。削除をキャンセルしました。');
      setDeleteDialogOpen(false);
      setDeleteConfirmTitle('');
      return;
    }

    deleteTask.mutate(
      {
        projectType: deleteProjectType as ProjectType,
        taskId: deleteTaskId,
      },
      {
        onSuccess: () => {
          // 削除したタスクが選択されていた場合はサイドバーを閉じる
          if (selectedTaskIdValue === deleteTaskId) {
            resetSelection();
          }
          window.alert('タスクを削除しました');
        },
        onError: (error: Error) => {
          console.error('Delete task error:', error);
          window.alert(`タスクの削除に失敗しました: ${error.message || '不明なエラー'}`);
        },
        onSettled: () => {
          setDeleteDialogOpen(false);
          setDeleteTaskId(null);
          setDeleteProjectType(null);
          setDeleteConfirmTitle('');
        },
      }
    );
  }, [deleteTaskId, deleteProjectType, deleteConfirmTitle, tasks, selectedTaskIdValue, resetSelection, deleteTask]);

  const handleDialogClose = useCallback(() => {
    setDeleteDialogOpen(false);
    setDeleteConfirmTitle('');
  }, []);

  return {
    deleteDialogOpen,
    deleteTaskId,
    deleteConfirmTitle,
    setDeleteConfirmTitle,
    handleDeleteClick,
    handleDeleteTask,
    handleDialogClose,
  };
}
