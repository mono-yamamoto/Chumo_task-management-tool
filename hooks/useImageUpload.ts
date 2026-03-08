import { useState } from 'react';
import { uploadFile } from '@/lib/api/uploadRepository';
import { compressImage } from '@/utils/imageCompression';
import { useAuth } from './useAuth';

export function useImageUpload() {
  const { getToken } = useAuth();
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

      // BlobをFileに変換（uploadFileがFile型を受け取るため）
      const uploadableFile =
        fileToUpload instanceof File
          ? fileToUpload
          : new File([fileToUpload], file.name, { type: file.type });

      setProgress(50);

      // APIアップロード
      const downloadURL = await uploadFile(uploadableFile, path, getToken);
      setProgress(100);

      return downloadURL;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '画像のアップロードに失敗しました';
      setError(message);
      return null;
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return {
    uploadImage,
    uploading,
    error,
    progress,
  };
}
