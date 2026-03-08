import { useMemo } from 'react';
import type { Task } from '../types';
import { getTaskBgVariant } from '../lib/taskUtils';

interface DashboardStats {
  active: number;
  dueSoon: number;
  overdue: number;
  done: number;
}

export function useDashboardStats(tasks: Task[]): DashboardStats {
  return useMemo(() => {
    let active = 0;
    let dueSoon = 0;
    let overdue = 0;
    let done = 0;

    for (const task of tasks) {
      if (task.flowStatus === '完了') {
        done++;
        continue;
      }

      active++;

      const variant = getTaskBgVariant(task);
      if (variant === 'error') overdue++;
      else if (variant === 'warning') dueSoon++;
    }

    return { active, dueSoon, overdue, done };
  }, [tasks]);
}
