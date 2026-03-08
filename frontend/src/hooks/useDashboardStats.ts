import { useMemo } from 'react';
import type { Task } from '../types';
import { COMPLETED_PROGRESS_STATUSES, DUE_SOON_THRESHOLD_DAYS } from '../lib/constants';

interface DashboardStats {
  active: number;
  dueSoon: number;
  overdue: number;
  done: number;
}

export function useDashboardStats(tasks: Task[]): DashboardStats {
  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thresholdDate = new Date(today);
    thresholdDate.setDate(thresholdDate.getDate() + DUE_SOON_THRESHOLD_DAYS);

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

      // 完了段階の進捗はカウント対象外
      if (task.progressStatus && COMPLETED_PROGRESS_STATUSES.includes(task.progressStatus)) {
        continue;
      }

      if (!task.itUpDate) continue;

      const itDate = new Date(task.itUpDate);
      itDate.setHours(0, 0, 0, 0);

      if (itDate < today) {
        overdue++;
      } else if (itDate <= thresholdDate) {
        dueSoon++;
      }
    }

    return { active, dueSoon, overdue, done };
  }, [tasks]);
}
