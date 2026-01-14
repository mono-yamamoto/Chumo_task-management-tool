/**
 * Custom hook for task list with filtering and sorting using UseCase layer
 * This hook demonstrates the new layered architecture pattern
 */

import { useMemo, useState } from 'react';
import { Task } from '@/types';
import { ListTasksUseCase } from '@/lib/application/usecases/listTasks.usecase';
import { TaskFiltersDTO } from '@/lib/presentation/dtos/task.dto';

interface UseTasksListParams {
  tasks: Task[];
  activeTaskId?: string | null;
}

interface UseTasksListResult {
  filteredTasks: Task[];
  sortedTasks: Task[];
  filters: TaskFiltersDTO;
  setFilters: (filters: TaskFiltersDTO) => void;
  totalCount: number;
}

/**
 * タスク一覧のフィルタリング・ソート機能を提供するカスタムフック
 * UseCaseレイヤーを使用してビジネスロジックをカプセル化
 */
export function useTasksList(params: UseTasksListParams): UseTasksListResult {
  const { tasks, activeTaskId } = params;
  const [filters, setFilters] = useState<TaskFiltersDTO>({});

  // コンポーネントマウント時の時刻を保持（1週間判定用）
  const [mountTime] = useState(() => Date.now());

  // UseCaseインスタンス生成
  const listTasksUseCase = useMemo(() => new ListTasksUseCase(), []);

  // UseCaseを実行してフィルタリング・ソート済みタスクを取得
  const result = useMemo(() => {
    return listTasksUseCase.execute({
      tasks,
      filters,
      activeTaskId,
      mountTime,
    });
  }, [tasks, filters, activeTaskId, mountTime, listTasksUseCase]);

  return {
    filteredTasks: result.tasks,
    sortedTasks: result.tasks,
    filters,
    setFilters,
    totalCount: result.totalCount,
  };
}
