import { useCallback, useState } from 'react';

export type ViewMode = 'table' | 'card';

const STORAGE_KEY = 'chumo-view-mode';

function getInitialViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'table';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'table' || stored === 'card') return stored;
  return 'table';
}

export function useViewMode() {
  const [viewMode, setViewModeState] = useState<ViewMode>(getInitialViewMode);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, []);

  return { viewMode, setViewMode } as const;
}
