import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { compressImage } from '@/lib/utils/imageCompression';

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const uploadImage = async (
    file: File,
    path: string,
    options?: {
      compress?: boolean;
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      maxSizeKB?: number;
    }
  ): Promise<string | null> => {
    if (!storage) {
      setError('Storage is not initialized');
      return null;
    }

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      let fileToUpload: Blob | File = file;

      // 画像圧縮が有効な場合、圧縮を実行
      if (options?.compress !== false) {
        setProgress(10);
        fileToUpload = await compressImage(
          file,
          options?.maxWidth,
          options?.maxHeight,
          options?.quality,
          options?.maxSizeKB
        );
        setProgress(30);
      }

      // Firebase Storageにアップロード
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, fileToUpload);
      setProgress(80);

      // ダウンロードURLを取得
      const downloadURL = await getDownloadURL(storageRef);
      setProgress(100);

      return downloadURL;
    } catch (err: any) {
      setError(err.message || '画像のアップロードに失敗しました');
      return null;
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000); // 1秒後にプログレスをリセット
    }
  };

  return {
    uploadImage,
    uploading,
    error,
    progress,
  };
}
