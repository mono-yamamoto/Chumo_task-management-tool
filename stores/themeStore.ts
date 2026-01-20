import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 利用可能なテーマの定義
export const THEME_OPTIONS = {
  default: {
    id: 'default',
    name: 'デフォルト',
    description: 'シンプルなグレー背景',
  },
  nature: {
    id: 'nature',
    name: '羊の牧場',
    description: '時間帯で昼夜が切り替わるアニメーション背景',
  },
  // 今後追加するテーマはここに追加
} as const;

export type ThemeId = keyof typeof THEME_OPTIONS;

interface ThemeStore {
  // 現在選択中のテーマID
  currentTheme: ThemeId;
  setCurrentTheme: (themeId: ThemeId) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      currentTheme: 'default',
      setCurrentTheme: (themeId) => set({ currentTheme: themeId }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
