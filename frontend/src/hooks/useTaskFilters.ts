import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

export interface TaskFilters {
  title: string;
  projectType: string;
  status: string;
  assigneeId: string;
  kubunLabelId: string;
  timer: string;
  itUpMonth: string;
  releaseMonth: string;
}

const FILTER_KEYS: (keyof TaskFilters)[] = [
  'title',
  'projectType',
  'status',
  'assigneeId',
  'kubunLabelId',
  'timer',
  'itUpMonth',
  'releaseMonth',
];

export function useTaskFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<TaskFilters>(
    () => ({
      title: searchParams.get('title') ?? '',
      projectType: searchParams.get('projectType') ?? '',
      status: searchParams.get('status') ?? '',
      assigneeId: searchParams.get('assigneeId') ?? '',
      kubunLabelId: searchParams.get('kubunLabelId') ?? '',
      timer: searchParams.get('timer') ?? '',
      itUpMonth: searchParams.get('itUpMonth') ?? '',
      releaseMonth: searchParams.get('releaseMonth') ?? '',
    }),
    [searchParams]
  );

  const setFilter = useCallback(
    (key: keyof TaskFilters, value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) {
            next.set(key, value);
          } else {
            next.delete(key);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const clearFilters = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const key of FILTER_KEYS) {
          next.delete(key);
        }
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const hasActiveFilters = FILTER_KEYS.some((key) => filters[key] !== '');

  return { filters, setFilter, clearFilters, hasActiveFilters };
}
