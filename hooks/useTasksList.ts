import { useMemo } from 'react';
import { Task } from '@/types';
import { ListTasksUseCase } from '@/lib/application/usecases/listTasks.usecase';
import { TaskFiltersDTO } from '@/lib/presentation/dtos/task.dto';

/**
 * タスク一覧のカスタムフック
 * ListTasksUseCaseを使用してビジネスロジックを適用
 */
export function useTasksList(params: {
  tasks: Task[];
  filters?: TaskFiltersDTO;
  activeTaskId?: string;
  mountTime?: number;
}) {
  const { tasks, filters = { status: 'not-completed' }, activeTaskId, mountTime = Date.now() } = params;

  const useCase = useMemo(() => new ListTasksUseCase(), []);

  // フィルタリング・ソート済みのタスクリスト
  const sortedTasks = useMemo(() => {
    return useCase.execute({
      tasks,
      filters,
      activeTaskId,
      mountTime,
    });
  }, [tasks, filters, activeTaskId, mountTime, useCase]);

  return {
    sortedTasks,
  };
}
