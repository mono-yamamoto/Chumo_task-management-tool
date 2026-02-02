import { useMemo, useEffect, useCallback } from 'react';
import { Task } from '@/types';

const TASKS_PER_PAGE = 30;

/**
 * タスク一覧のページネーション管理フック
 */
export function useTaskPagination(params: {
  sortedTasks: Task[];
  currentPage: number;
  setCurrentPage: (_value: number) => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage?: () => void;
}) {
  const {
    sortedTasks,
    currentPage,
    setCurrentPage,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = params;

  const requiredItemsForCurrentPage = currentPage * TASKS_PER_PAGE;
  const shouldRequestMoreData = hasNextPage && sortedTasks.length < requiredItemsForCurrentPage;

  useEffect(() => {
    if (!fetchNextPage || !shouldRequestMoreData || isFetchingNextPage) {
      return;
    }
    fetchNextPage();
  }, [fetchNextPage, shouldRequestMoreData, isFetchingNextPage]);

  const paginatedTasks = useMemo<Task[]>(() => {
    const start = (currentPage - 1) * TASKS_PER_PAGE;
    return sortedTasks.slice(start, start + TASKS_PER_PAGE);
  }, [sortedTasks, currentPage]);

  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / TASKS_PER_PAGE));
  const canGoPrev = currentPage > 1;
  const canGoNext = hasNextPage || currentPage < totalPages;

  const paginatedRangeStart =
    paginatedTasks.length > 0 ? (currentPage - 1) * TASKS_PER_PAGE + 1 : 0;
  const paginatedRangeEnd =
    paginatedTasks.length > 0 ? paginatedRangeStart + paginatedTasks.length - 1 : 0;

  const totalKnownCount = sortedTasks.length;
  const rangeLabel =
    paginatedTasks.length === 0
      ? hasNextPage || isFetchingNextPage
        ? '表示中: 読み込み中...'
        : '表示中: 0件'
      : `表示中: ${paginatedRangeStart}-${paginatedRangeEnd}件 / ${
          hasNextPage ? `${totalKnownCount}+` : totalKnownCount
        }件`;

  const handlePrevPage = useCallback(() => {
    if (!canGoPrev) return;
    setCurrentPage(Math.max(1, currentPage - 1));
  }, [canGoPrev, currentPage, setCurrentPage]);

  const handleNextPage = useCallback(() => {
    if (!canGoNext) return;
    setCurrentPage(currentPage + 1);
  }, [canGoNext, currentPage, setCurrentPage]);

  return {
    paginatedTasks,
    totalPages,
    canGoPrev,
    canGoNext,
    rangeLabel,
    handlePrevPage,
    handleNextPage,
  };
}
