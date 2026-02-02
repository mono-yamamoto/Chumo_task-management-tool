'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { writeBatch, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Task } from '@/types';
import { ProjectType } from '@/constants/projectTypes';

interface TaskOrderUpdate {
  taskId: string;
  projectType: ProjectType;
  newOrder: number;
}

/**
 * 複数タスクのorder値を一括更新するmutation
 * D&D並び替え時に使用
 */
export function useUpdateTasksOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: TaskOrderUpdate[]) => {
      if (!db) throw new Error('Firestore is not initialized');
      if (updates.length === 0) return;

      const batch = writeBatch(db);
      const now = Timestamp.fromDate(new Date());

      updates.forEach(({ taskId, projectType, newOrder }) => {
        const taskRef = doc(db!, 'projects', projectType, 'tasks', taskId);
        batch.update(taskRef, {
          order: newOrder,
          updatedAt: now,
        });
      });

      await batch.commit();
    },
    // 楽観的更新
    onMutate: async (updates) => {
      // 関連するクエリをキャンセル（tasksとdashboard-tasks）
      const queryPredicate = (query: { queryKey: readonly unknown[] }) =>
        query.queryKey[0] === 'tasks' || query.queryKey[0] === 'dashboard-tasks';

      await queryClient.cancelQueries({ predicate: queryPredicate });

      // 現在のキャッシュを保存（ロールバック用）
      const previousData = queryClient.getQueriesData({ predicate: queryPredicate });

      // キャッシュを楽観的に更新
      queryClient.setQueriesData({ predicate: queryPredicate }, (old: unknown) => {
        if (!old) return old;

        // 無限スクロールのデータ構造に対応
        if (typeof old === 'object' && old !== null && 'pages' in old) {
          const pagesData = old as { pages: { tasks: Task[] }[]; pageParams: unknown[] };
          return {
            ...pagesData,
            pages: pagesData.pages.map((page) => ({
              ...page,
              tasks: page.tasks.map((task: Task) => {
                const update = updates.find((u) => u.taskId === task.id);
                if (update) {
                  return { ...task, order: update.newOrder };
                }
                return task;
              }),
            })),
          };
        }

        // 通常の配列データに対応
        if (Array.isArray(old)) {
          return old.map((task: Task) => {
            const update = updates.find((u) => u.taskId === task.id);
            if (update) {
              return { ...task, order: update.newOrder };
            }
            return task;
          });
        }

        return old;
      });

      return { previousData };
    },
    // エラー時にロールバック
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    // 成功・エラー後にクエリを再フェッチ
    onSettled: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'tasks' || query.queryKey[0] === 'dashboard-tasks',
      });
    },
  });
}

/**
 * ドラッグ後の新しいorder値を計算するユーティリティ
 * @param tasks ソート済みタスク配列
 * @param activeId ドラッグ中のタスクID
 * @param overId ドロップ先のタスクID
 * @returns 更新が必要なタスクのorder情報
 */
export function calculateNewOrder(
  tasks: (Task & { projectType: ProjectType })[],
  activeId: string,
  overId: string
): TaskOrderUpdate[] {
  const oldIndex = tasks.findIndex((t) => t.id === activeId);
  const newIndex = tasks.findIndex((t) => t.id === overId);

  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return [];
  }

  const movedTask = tasks[oldIndex];

  // 移動先の前後のタスクを取得
  let prevOrder: number;
  let nextOrder: number;

  if (newIndex === 0) {
    // 先頭に移動
    prevOrder = 0;
    nextOrder = tasks[0].order;
  } else if (newIndex >= tasks.length - 1) {
    // 末尾に移動
    prevOrder = tasks[tasks.length - 1].order;
    nextOrder = prevOrder + 2000;
  } else if (oldIndex < newIndex) {
    // 下に移動
    prevOrder = tasks[newIndex].order;
    nextOrder = tasks[newIndex + 1]?.order ?? prevOrder + 2000;
  } else {
    // 上に移動
    prevOrder = tasks[newIndex - 1]?.order ?? 0;
    nextOrder = tasks[newIndex].order;
  }

  // 中間値を計算
  const newOrder = (prevOrder + nextOrder) / 2;

  return [
    {
      taskId: movedTask.id,
      projectType: movedTask.projectType,
      newOrder,
    },
  ];
}
