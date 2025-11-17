/**
 * 画像を圧縮するユーティリティ関数
 * @param file 元の画像ファイル
 * @param maxWidth 最大幅（デフォルト: 1920）
 * @param maxHeight 最大高さ（デフォルト: 1920）
 * @param quality 圧縮品質 0-1（デフォルト: 0.8）
 * @param maxSizeKB 最大ファイルサイズ（KB、デフォルト: 500）
 * @returns 圧縮されたBlob
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8,
  maxSizeKB: number = 500
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // 画像のサイズを計算
        let { width } = img;
        let { height } = img;

        // 最大サイズを超えている場合はリサイズ
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        // Canvasを作成して画像を描画
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // 画像を描画
        ctx.drawImage(img, 0, 0, width, height);

        // 品質を調整しながら圧縮
        let currentQuality = quality;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }

              const sizeKB = blob.size / 1024;

              // 目標サイズより大きい場合、品質を下げて再試行
              if (sizeKB > maxSizeKB && currentQuality > 0.1) {
                currentQuality -= 0.1;
                tryCompress();
              } else {
                resolve(blob);
              }
            },
            'image/jpeg',
            currentQuality
          );
        };

        tryCompress();
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
