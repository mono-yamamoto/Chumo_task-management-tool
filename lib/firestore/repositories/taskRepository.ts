import {
  collection,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Task } from '@/types';
import { PROJECT_TYPES, ProjectType } from '@/constants/projectTypes';
import { mapTaskDoc } from '@/lib/firestore/mappers/taskMapper';

/**
 * 指定されたプロジェクトタイプのタスクをページネーション付きで取得する
 * @param params パラメータオブジェクト
 * @param params.projectType 取得するプロジェクトタイプ
 * @param params.limitValue 取得件数
 * @param params.cursor ページネーション用のカーソル（前回取得した最後のドキュメント）
 * @returns タスクリストとページネーション情報
 */
export async function fetchTaskPage(params: {
  projectType: ProjectType;
  limitValue: number;
  cursor?: QueryDocumentSnapshot | null;
}): Promise<{
  tasks: (Task & { projectType: ProjectType })[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
  snapshots: QueryDocumentSnapshot[];
}> {
  if (!db) {
    return { tasks: [], lastDoc: null, hasMore: false, snapshots: [] };
  }

  const baseRef = collection(db, 'projects', params.projectType, 'tasks');
  const constraints = params.cursor
    ? [orderBy('createdAt', 'desc'), startAfter(params.cursor), limit(params.limitValue)]
    : [orderBy('createdAt', 'desc'), limit(params.limitValue)];

  try {
    const snapshot = await getDocs(query(baseRef, ...constraints));
    const tasks = snapshot.docs.map((docItem) =>
      mapTaskDoc(docItem.id, docItem.data(), params.projectType)
    );

    const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
    const hasMore = snapshot.docs.length === params.limitValue;

    return { tasks, lastDoc, hasMore, snapshots: snapshot.docs };
  } catch (error) {
    console.error('Error in fetchTaskPage:', error);
    throw error;
  }
}

/**
 * 全プロジェクトを横断してタスクIDでタスクを取得する
 * @param taskId 検索するタスクID
 * @returns 見つかったタスク、または見つからない場合はnull
 */
export async function fetchTaskByIdAcrossProjects(taskId: string): Promise<Task | null> {
  if (!db) return null;

  for (const projectType of PROJECT_TYPES) {
    const taskRef = doc(db, 'projects', projectType, 'tasks', taskId);
    const taskDoc = await getDoc(taskRef);
    if (taskDoc.exists()) {
      return mapTaskDoc(taskDoc.id, taskDoc.data(), projectType);
    }
  }
  return null;
}

/**
 * 指定されたユーザーにアサインされた未完了のタスクを全プロジェクトから取得する
 * @param userId アサインされたユーザーのID
 * @returns ユーザーにアサインされた未完了タスクのリスト
 */
export async function fetchAssignedOpenTasks(userId: string): Promise<(Task & { projectType: ProjectType })[]> {
  if (!db) return [];

  const allTasks: (Task & { projectType: ProjectType })[] = [];

  for (const projectType of PROJECT_TYPES) {
    const tasksRef = collection(db, 'projects', projectType, 'tasks');
    // assigneeIds/flowStatusの複合インデックスを使ってサーバー側で絞り込む
    const q = query(
      tasksRef,
      where('assigneeIds', 'array-contains', userId),
      where('flowStatus', '!=', '完了'),
      orderBy('flowStatus')
    );
    const tasksSnapshot = await getDocs(q);
    tasksSnapshot.docs.forEach((docItem) => {
      const taskData = mapTaskDoc(docItem.id, docItem.data(), projectType);
      allTasks.push(taskData);
    });
  }

  return allTasks;
}
