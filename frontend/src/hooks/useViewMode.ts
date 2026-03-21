import { useCallback, useState } from 'react';

export type ViewMode = 'table' | 'card';
export type ViewModeScope = 'dashboard' | 'tasks' | 'members';

const STORAGE_KEY_PREFIX = 'chumo-view-mode';

function getStorageKey(scope: ViewModeScope): string {
  return `${STORAGE_KEY_PREFIX}-${scope}`;
}

function getInitialViewMode(scope: ViewModeScope): ViewMode {
  if (typeof window === 'undefined') return 'table';
  try {
    const stored = window.localStorage.getItem(getStorageKey(scope));
    if (stored === 'table' || stored === 'card') return stored;
  } catch {
    // SecurityError: ストレージ制限環境ではフォールバック
  }
  return 'table';
}

export function useViewMode(scope: ViewModeScope) {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => getInitialViewMode(scope));

  const setViewMode = useCallback(
    (mode: ViewMode) => {
      setViewModeState(mode);
      try {
        window.localStorage.setItem(getStorageKey(scope), mode);
      } catch {
        // noop: 表示状態だけ維持する
      }
    },
    [scope]
  );

  return { viewMode, setViewMode } as const;
}
