import { useCallback, useMemo } from 'react';
import { TaskFiltersDTO } from '@/lib/presentation/dtos/task.dto';
import { FlowStatus } from '@/types';

/**
 * タスクフィルター管理のカスタムフック
 */
export function useTaskFilters(params: {
  filterStatus: string;
  setFilterStatus: (_value: FlowStatus | 'all' | 'not-completed') => void;
  filterAssignee: string;
  setFilterAssignee: (_value: string) => void;
  filterLabel: string;
  setFilterLabel: (_value: string) => void;
  filterTimerActive: string;
  setFilterTimerActive: (_value: string) => void;
  filterItUpDateMonth: string;
  setFilterItUpDateMonth: (_value: string) => void;
  filterReleaseDateMonth: string;
  setFilterReleaseDateMonth: (_value: string) => void;
  filterTitle: string;
  setFilterTitle: (_value: string) => void;
  setCurrentPage: (_value: number) => void;
  resetFilters: () => void;
}) {
  const {
    filterStatus,
    setFilterStatus,
    filterAssignee,
    setFilterAssignee,
    filterLabel,
    setFilterLabel,
    filterTimerActive,
    setFilterTimerActive,
    filterItUpDateMonth,
    setFilterItUpDateMonth,
    filterReleaseDateMonth,
    setFilterReleaseDateMonth,
    filterTitle,
    setFilterTitle,
    setCurrentPage,
    resetFilters,
  } = params;

  // フィルターDTOを作成
  const filters: TaskFiltersDTO = useMemo(() => {
    return {
      status: filterStatus as 'not-completed' | 'completed' | 'all',
      assigneeIds: filterAssignee !== 'all' ? [filterAssignee] : undefined,
      labelIds: filterLabel !== 'all' ? [filterLabel] : undefined,
      title: filterTitle || undefined,
      timerActive:
        filterTimerActive === 'active' ? true : filterTimerActive === 'inactive' ? false : undefined,
      itUpDateMonth: filterItUpDateMonth || undefined,
      releaseDateMonth: filterReleaseDateMonth || undefined,
    };
  }, [
    filterStatus,
    filterAssignee,
    filterLabel,
    filterTitle,
    filterTimerActive,
    filterItUpDateMonth,
    filterReleaseDateMonth,
  ]);

  const handleFilterTitleChange = useCallback(
    (value: string) => {
      setFilterTitle(value);
      setCurrentPage(1);
    },
    [setFilterTitle, setCurrentPage]
  );

  const handleFilterStatusChange = useCallback(
    (value: FlowStatus | 'all' | 'not-completed') => {
      setFilterStatus(value);
      setCurrentPage(1);
    },
    [setFilterStatus, setCurrentPage]
  );

  const handleFilterAssigneeChange = useCallback(
    (value: string) => {
      setFilterAssignee(value);
      setCurrentPage(1);
    },
    [setFilterAssignee, setCurrentPage]
  );

  const handleFilterLabelChange = useCallback(
    (value: string) => {
      setFilterLabel(value);
      setCurrentPage(1);
    },
    [setFilterLabel, setCurrentPage]
  );

  const handleFilterTimerActiveChange = useCallback(
    (value: string) => {
      setFilterTimerActive(value);
      setCurrentPage(1);
    },
    [setFilterTimerActive, setCurrentPage]
  );

  const handleFilterItUpDateMonthChange = useCallback(
    (value: string) => {
      setFilterItUpDateMonth(value);
      setCurrentPage(1);
    },
    [setFilterItUpDateMonth, setCurrentPage]
  );

  const handleFilterReleaseDateMonthChange = useCallback(
    (value: string) => {
      setFilterReleaseDateMonth(value);
      setCurrentPage(1);
    },
    [setFilterReleaseDateMonth, setCurrentPage]
  );

  const handleResetFilters = useCallback(() => {
    resetFilters();
    setCurrentPage(1);
  }, [resetFilters, setCurrentPage]);

  return {
    filters,
    handleFilterTitleChange,
    handleFilterStatusChange,
    handleFilterAssigneeChange,
    handleFilterLabelChange,
    handleFilterTimerActiveChange,
    handleFilterItUpDateMonthChange,
    handleFilterReleaseDateMonthChange,
    handleResetFilters,
  };
}
