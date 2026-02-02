import { Task, User } from '@/types';
import { TaskFiltersDTO } from '@/lib/presentation/dtos/task.dto';
import { SortMode } from '@/stores/taskStore';

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
    sortMode?: SortMode;
  }): Task[] {
    const { tasks, filters, users, activeTaskId, mountTime, sortMode = 'order' } = params;

    // フィルタリング
    let filtered = this.applyFilters(tasks, filters, activeTaskId);

    // ソート
    filtered = this.applySorting(filtered, {
      activeTaskId,
      mountTime,
      users,
      sortMode,
    });

    return filtered;
  }

  /**
   * フィルタリング適用
   */
  private applyFilters(tasks: Task[], filters: TaskFiltersDTO, activeTaskId?: string): Task[] {
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
      result = result.filter((task) => filters.labelIds?.includes(task.kubunLabelId));
    }

    // タイマーアクティブフィルター
    if (filters.timerActive !== undefined) {
      if (!activeTaskId) {
        // アクティブタスク未設定時の挙動を明示
        result = filters.timerActive ? [] : result;
      } else if (filters.timerActive) {
        // タイマーアクティブなタスクのみ
        result = result.filter((task) => task.id === activeTaskId);
      } else {
        // タイマー停止中のタスクのみ
        result = result.filter((task) => task.id !== activeTaskId);
      }
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
      result = result.filter((task) => task.title.toLowerCase().includes(searchTerm));
    }

    return result;
  }

  /**
   * ソート適用
   * 1. アクティブタイマーのタスクを最優先
   * 2. 新規未アサインタスク（作成後1週間以内かつassigneeIds空配列）を次に優先
   * 3. sortModeに応じたソート（order / IT日昇順 / IT日降順）
   */
  private applySorting(
    tasks: Task[],
    options: {
      activeTaskId?: string;
      mountTime: number;
      users?: User[];
      sortMode: SortMode;
    }
  ): Task[] {
    const { activeTaskId, mountTime, sortMode } = options;
    const oneWeekAgo = mountTime - 7 * 24 * 60 * 60 * 1000;

    return [...tasks].sort((a, b) => {
      // 1. アクティブタイマーのタスクを最優先
      const aIsActive = a.id === activeTaskId;
      const bIsActive = b.id === activeTaskId;
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      // 2. 新規未アサインタスクを次に優先
      const aIsNewUnassigned = a.assigneeIds.length === 0 && a.createdAt.getTime() > oneWeekAgo;
      const bIsNewUnassigned = b.assigneeIds.length === 0 && b.createdAt.getTime() > oneWeekAgo;
      if (aIsNewUnassigned && !bIsNewUnassigned) return -1;
      if (!aIsNewUnassigned && bIsNewUnassigned) return 1;

      // 3. sortModeに応じたソート
      switch (sortMode) {
        case 'itUpDate-asc':
          return this.compareItUpDate(a, b, 'asc');
        case 'itUpDate-desc':
          return this.compareItUpDate(a, b, 'desc');
        case 'order':
        default:
          return a.order - b.order;
      }
    });
  }

  /**
   * IT日を比較（nullは末尾に配置）
   */
  private compareItUpDate(a: Task, b: Task, direction: 'asc' | 'desc'): number {
    const aDate = a.itUpDate;
    const bDate = b.itUpDate;

    // nullは末尾に配置
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;

    const diff = aDate.getTime() - bDate.getTime();
    return direction === 'asc' ? diff : -diff;
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
