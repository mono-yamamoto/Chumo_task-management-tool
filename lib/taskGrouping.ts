import { Task, User, FlowStatus } from '@/types';

// 未割り当てを表す特別なID
export const UNASSIGNED_ID = '__unassigned__';

// ステータス別にグルーピングされたタスク
export interface StatusGroup {
  status: FlowStatus;
  tasks: Task[];
}

// 担当者別にグルーピングされたセクション
export interface AssigneeSection {
  assigneeId: string;
  assigneeName: string;
  totalCount: number;
  statusGroups: StatusGroup[];
}

// ステータスの表示順序
const STATUS_ORDER: FlowStatus[] = [
  '対応中',
  'コーディング',
  'デザイン',
  'ディレクション',
  '待ち',
  '未着手',
  '週次報告',
  '月次報告',
  '完了',
];

// Mapにタスクを追加するヘルパー関数
const pushTask = (map: Map<string, Task[]>, key: string, task: Task) => {
  const list = map.get(key);
  if (list) {
    list.push(task);
  } else {
    map.set(key, [task]);
  }
};

/**
 * タスクを担当者別→ステータス別にグルーピングする
 * @param tasks グルーピング対象のタスク
 * @param users ユーザー情報（担当者名の取得用）
 * @returns 担当者別にグルーピングされたセクションの配列
 */
export function groupTasksByAssignee(tasks: Task[], users: User[] | undefined): AssigneeSection[] {
  // ユーザーIDから表示名へのマップを作成（O(n)の探索を回避）
  const userMap = new Map(users?.map((u) => [u.id, u.displayName]) ?? []);

  // 担当者IDごとにタスクをグルーピング（複数担当者のタスクは各セクションに重複）
  const assigneeTaskMap = new Map<string, Task[]>();

  for (const task of tasks) {
    if (task.assigneeIds.length === 0) {
      // 未割り当てタスク
      pushTask(assigneeTaskMap, UNASSIGNED_ID, task);
    } else {
      // 各担当者のセクションにタスクを追加
      for (const assigneeId of task.assigneeIds) {
        pushTask(assigneeTaskMap, assigneeId, task);
      }
    }
  }

  // 担当者ごとにステータス別にグルーピング
  const sections: AssigneeSection[] = [];

  for (const [assigneeId, assigneeTasks] of assigneeTaskMap) {
    // 担当者名を取得（userMapを使用してO(1)で取得）
    const assigneeName =
      assigneeId === UNASSIGNED_ID ? '未割り当て' : userMap.get(assigneeId) || '不明なユーザー';

    // ステータス別にグルーピング
    const statusMap = new Map<FlowStatus, Task[]>();
    for (const task of assigneeTasks) {
      const list = statusMap.get(task.flowStatus);
      if (list) {
        list.push(task);
      } else {
        statusMap.set(task.flowStatus, [task]);
      }
    }

    // ステータス順序に従ってソート
    const statusGroups: StatusGroup[] = STATUS_ORDER.filter((status) => statusMap.has(status)).map(
      (status) => ({
        status,
        tasks: statusMap.get(status) || [],
      })
    );

    sections.push({
      assigneeId,
      assigneeName,
      totalCount: assigneeTasks.length,
      statusGroups,
    });
  }

  // 担当者名でソート（未割り当ては最後）
  sections.sort((a, b) => {
    if (a.assigneeId === UNASSIGNED_ID) return 1;
    if (b.assigneeId === UNASSIGNED_ID) return -1;
    return a.assigneeName.localeCompare(b.assigneeName, 'ja');
  });

  return sections;
}
