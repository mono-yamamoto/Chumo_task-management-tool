import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { PROJECT_TYPES } from '@/constants/projectTypes';
import { TaskComment } from '@/types';
import { mapCommentDoc } from '@/lib/firestore/mappers/commentMapper';

/**
 * 指定されたプロジェクト・タスクのコメントを取得する
 * @param projectType プロジェクトタイプ
 * @param taskId タスクID
 * @returns コメントのリスト（作成日時の昇順）
 */
export async function fetchTaskComments(
  projectType: string,
  taskId: string
): Promise<TaskComment[]> {
  if (!projectType || !db || !taskId) return [];

  try {
    const commentsRef = collection(db, 'projects', projectType, 'taskComments');
    const q = query(commentsRef, where('taskId', '==', taskId), orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docItem) => mapCommentDoc(docItem.id, docItem.data()));
  } catch (error: unknown) {
    const isIndexError =
      (error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'failed-precondition') ||
      (error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string' &&
        error.message.includes('index'));
    if (isIndexError) {
      try {
        const commentsRef = collection(db, 'projects', projectType, 'taskComments');
        const q = query(commentsRef, where('taskId', '==', taskId));
        const snapshot = await getDocs(q);
        const comments = snapshot.docs.map((docItem) => mapCommentDoc(docItem.id, docItem.data()));
        return comments.sort((a, b) => {
          const aTime = a.createdAt?.getTime() || 0;
          const bTime = b.createdAt?.getTime() || 0;
          return aTime - bTime; // 昇順（古い順）
        });
      } catch (retryError) {
        console.error('Error fetching comments:', retryError);
        return [];
      }
    }
    console.error('Error fetching comments:', error);
    return [];
  }
}

/**
 * 指定されたユーザーの未読コメントがあるタスクIDを全プロジェクトから取得する
 * @param userId ユーザーID
 * @returns 未読コメントがあるタスクIDのセット
 */
export async function fetchUnreadCommentTaskIds(userId: string): Promise<Set<string>> {
  if (!userId || !db) return new Set();

  const unreadTaskIds = new Set<string>();

  for (const projectType of PROJECT_TYPES) {
    try {
      const commentsRef = collection(db, 'projects', projectType, 'taskComments');
      // 全コメントを取得してクライアントでフィルタ（readByにarray-not-containsは使用不可）
      const snapshot = await getDocs(commentsRef);
      snapshot.docs.forEach((docItem) => {
        const comment = mapCommentDoc(docItem.id, docItem.data());
        // readBy配列に自分のIDが含まれていない場合は未読
        if (!comment.readBy.includes(userId)) {
          unreadTaskIds.add(comment.taskId);
        }
      });
    } catch (error) {
      console.error(`Error fetching comments for project ${projectType}:`, error);
    }
  }

  return unreadTaskIds;
}
