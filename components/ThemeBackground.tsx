'use client';

import { useThemeStore } from '@/stores/themeStore';
import { RiveBackground } from './RiveBackground';

/**
 * テーマに応じた背景を表示するコンポーネント
 * 新しいテーマを追加する場合はここにケースを追加
 */
export function ThemeBackground() {
  const { currentTheme } = useThemeStore();

  switch (currentTheme) {
    case 'nature':
      return <RiveBackground />;
    case 'default':
    default:
      // デフォルトテーマは背景なし（layout.tsxのgrey.50が表示される）
      return null;
  }
}
