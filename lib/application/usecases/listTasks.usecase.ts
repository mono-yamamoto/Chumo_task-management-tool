/**
 * ListTasks UseCase
 * Encapsulates business logic for listing tasks with filtering and sorting
 */

import { Task } from '@/types';
import { TaskFiltersDTO, TaskSortDTO } from '@/presentation/dtos/task.dto';
import { ProjectType } from '@/constants/projectTypes';

export interface ListTasksParams {
  tasks: Task[];
  filters?: TaskFiltersDTO;
  sort?: TaskSortDTO;
  activeTaskId?: string | null;
  mountTime: number;
}

export interface ListTasksResult {
  tasks: Task[];
  totalCount: number;
}

/**
 * タスク一覧取得のビジネスロジックを実行するUseCase
 */
export class ListTasksUseCase {
  /**
   * タスク一覧をフィルタリング・ソートして返す
   */
  execute(params: ListTasksParams): ListTasksResult {
    const { tasks, filters, mountTime, activeTaskId } = params;

    // Step 1: フィルタリング
    const filteredTasks = this.applyFilters(tasks, filters, activeTaskId);

    // Step 2: ソート
    const sortedTasks = this.applySorting(filteredTasks, mountTime);

    return {
      tasks: sortedTasks,
      totalCount: sortedTasks.length,
    };
  }

  /**
   * フィルタリングロジック
   */
  private applyFilters(
    tasks: Task[],
    filters: TaskFiltersDTO | undefined,
    activeTaskId: string | null | undefined
  ): Task[] {
    if (!filters) return tasks;

    return tasks.filter((task: Task) => {
      // ステータスフィルタ
      if (filters.status) {
        if (filters.status === 'not-completed' && task.flowStatus === '完了') {
          return false;
        }
        if (
          filters.status !== 'all' &&
          filters.status !== 'not-completed' &&
          task.flowStatus !== filters.status
        ) {
          return false;
        }
      }

      // アサインフィルタ
      if (filters.assigneeIds && filters.assigneeIds.length > 0) {
        const hasMatchingAssignee = filters.assigneeIds.some((assigneeId) => {
          if (assigneeId === 'all') return true;
          return task.assigneeIds.includes(assigneeId);
        });
        if (!hasMatchingAssignee) return false;
      }

      // 区分フィルタ
      if (filters.labelId && filters.labelId !== 'all' && task.kubunLabelId !== filters.labelId) {
        return false;
      }

      // タイトル検索フィルタ
      if (filters.title && !task.title.toLowerCase().includes(filters.title.toLowerCase())) {
        return false;
      }

      // タイマー稼働中フィルタ
      if (filters.timerActive !== undefined) {
        if (filters.timerActive && activeTaskId !== task.id) {
          return false;
        }
        if (!filters.timerActive && activeTaskId === task.id) {
          return false;
        }
      }

      // ITアップ日フィルタ（月指定）
      if (filters.itUpDateMonth) {
        if (!task.itUpDate) return false;
        const [year, month] = filters.itUpDateMonth.split('-');
        const taskDate = new Date(task.itUpDate);
        const taskYear = taskDate.getFullYear();
        const taskMonth = taskDate.getMonth() + 1;
        if (taskYear !== parseInt(year, 10) || taskMonth !== parseInt(month, 10)) {
          return false;
        }
      }

      // リリース日フィルタ（月指定）
      if (filters.releaseDateMonth) {
        if (!task.releaseDate) return false;
        const [year, month] = filters.releaseDateMonth.split('-');
        const taskDate = new Date(task.releaseDate);
        const taskYear = taskDate.getFullYear();
        const taskMonth = taskDate.getMonth() + 1;
        if (taskYear !== parseInt(year, 10) || taskMonth !== parseInt(month, 10)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * ソートロジック
   * 未アサインかつ作成から1週間以内のタスクを上位表示
   */
  private applySorting(tasks: Task[], mountTime: number): Task[] {
    const oneWeekAgo = mountTime - 7 * 24 * 60 * 60 * 1000;

    const isNewTask = (task: Task) => {
      return (
        task.assigneeIds.length === 0 && task.createdAt && task.createdAt.getTime() >= oneWeekAgo
      );
    };

    return [...tasks].sort((a, b) => {
      const aIsNew = isNewTask(a);
      const bIsNew = isNewTask(b);

      // 条件に合うタスクを最優先
      if (aIsNew && !bIsNew) return -1;
      if (!aIsNew && bIsNew) return 1;

      // それ以外は既存のソート順（createdAt降順）を維持
      const aTime = a.createdAt?.getTime() || 0;
      const bTime = b.createdAt?.getTime() || 0;
      return bTime - aTime;
    });
  }
}
