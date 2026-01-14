import { Task, User } from '@/types';
import { TaskFiltersDTO } from '@/lib/presentation/dtos/task.dto';

/**
 * タスク一覧取得UseCase
 * ビジネスロジック（フィルタリング・ソート）を集約
 */
export class ListTasksUseCase {
  /**
   * タスク一覧を取得し、フィルタリング・ソートを適用
   */
  execute(params: {
    tasks: Task[];
    filters: TaskFiltersDTO;
    users?: User[];
    activeTaskId?: string;
    mountTime: number;
  }): Task[] {
    const { tasks, filters, users, activeTaskId, mountTime } = params;

    // フィルタリング
    let filtered = this.applyFilters(tasks, filters);

    // ソート
    filtered = this.applySorting(filtered, {
      activeTaskId,
      mountTime,
      users,
    });

    return filtered;
  }

  /**
   * フィルタリング適用
   */
  private applyFilters(tasks: Task[], filters: TaskFiltersDTO): Task[] {
    let result = [...tasks];

    // ステータスフィルター
    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'not-completed') {
        result = result.filter((task) => task.flowStatus !== '完了');
      } else if (filters.status === 'completed') {
        result = result.filter((task) => task.flowStatus === '完了');
      }
    }

    // アサインフィルター
    if (filters.assigneeIds && filters.assigneeIds.length > 0) {
      result = result.filter((task) =>
        task.assigneeIds.some((id) => filters.assigneeIds?.includes(id))
      );
    }

    // ラベルフィルター
    if (filters.labelIds && filters.labelIds.length > 0) {
      result = result.filter((task) =>
        filters.labelIds?.includes(task.kubunLabelId)
      );
    }

    // タイマーアクティブフィルター
    if (filters.timerActive !== undefined) {
      // タイマーアクティブなタスクのみ表示する場合
      // hasActiveTimerはTask型にないため、後でタスク取得時に追加する必要がある
      // ここでは仮実装としてフィルタリングを行う
    }

    // IT UP日フィルター
    if (filters.itUpDateMonth) {
      result = result.filter((task) => {
        if (!task.itUpDate) return false;
        const taskMonth = this.formatMonth(task.itUpDate);
        return taskMonth === filters.itUpDateMonth;
      });
    }

    // リリース日フィルター
    if (filters.releaseDateMonth) {
      result = result.filter((task) => {
        if (!task.releaseDate) return false;
        const taskMonth = this.formatMonth(task.releaseDate);
        return taskMonth === filters.releaseDateMonth;
      });
    }

    // タイトル検索フィルター
    if (filters.title && filters.title.trim() !== '') {
      const searchTerm = filters.title.toLowerCase();
      result = result.filter((task) =>
        task.title.toLowerCase().includes(searchTerm)
      );
    }

    return result;
  }

  /**
   * ソート適用
   * 1. アクティブタイマーのタスクを最優先
   * 2. 新規未アサインタスク（作成後1週間以内かつassigneeIds空配列）を次に優先
   * 3. 残りはorder昇順
   */
  private applySorting(
    tasks: Task[],
    options: {
      activeTaskId?: string;
      mountTime: number;
      users?: User[];
    }
  ): Task[] {
    const { activeTaskId, mountTime } = options;
    const oneWeekAgo = mountTime - 7 * 24 * 60 * 60 * 1000;

    return [...tasks].sort((a, b) => {
      // 1. アクティブタイマーのタスクを最優先
      const aIsActive = a.id === activeTaskId;
      const bIsActive = b.id === activeTaskId;
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      // 2. 新規未アサインタスクを次に優先
      const aIsNewUnassigned =
        a.assigneeIds.length === 0 && a.createdAt.getTime() > oneWeekAgo;
      const bIsNewUnassigned =
        b.assigneeIds.length === 0 && b.createdAt.getTime() > oneWeekAgo;
      if (aIsNewUnassigned && !bIsNewUnassigned) return -1;
      if (!aIsNewUnassigned && bIsNewUnassigned) return 1;

      // 3. 残りはorder昇順
      return a.order - b.order;
    });
  }

  /**
   * 日付を YYYY-MM 形式にフォーマット
   */
  private formatMonth(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}
