'use client';

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

/**
 * コメント用の画像をFirebase Storageにアップロード
 * @param file アップロードするファイル
 * @param projectType プロジェクトタイプ
 * @param taskId タスクID
 * @returns アップロードされた画像のURL
 */
export async function uploadCommentImage(
  file: File,
  projectType: string,
  taskId: string
): Promise<string> {
  if (!storage) {
    throw new Error('Firebase Storage is not initialized');
  }

  // ファイル名をユニークにする
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const extension = file.name.split('.').pop() || 'png';
  const fileName = `${timestamp}-${randomStr}.${extension}`;

  // パスを構築: comments/{projectType}/{taskId}/{fileName}
  const storagePath = `comments/${projectType}/${taskId}/${fileName}`;
  const storageRef = ref(storage, storagePath);

  // アップロード
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type,
  });

  // ダウンロードURLを取得
  const downloadURL = await getDownloadURL(snapshot.ref);

  return downloadURL;
}

/**
 * ペーストされた画像データをFileオブジェクトに変換
 */
export function clipboardItemToFile(item: DataTransferItem): File | null {
  if (item.type.startsWith('image/')) {
    return item.getAsFile();
  }
  return null;
}
