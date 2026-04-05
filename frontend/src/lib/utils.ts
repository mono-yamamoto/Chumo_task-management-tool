import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwindクラスをマージするユーティリティ
 * clsx で条件付きクラスを結合し、tailwind-merge で重複を解決する
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 外部URLを新しいタ���で安全に開く */
export function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}
