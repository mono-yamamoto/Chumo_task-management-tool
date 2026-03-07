import { apiClient } from '@/lib/http/apiClient';
import { Task, TaskExternal } from '@/types';
import { ProjectType } from '@/constants/projectTypes';
import { parseDate, parseDateRequired } from './dateUtils';

type GetToken = () => Promise<string | null>;

// API レスポンスの生データ型（日付が文字列で返る）
type TaskRaw = Omit<
  Task,
  | 'projectType'
  | 'flowStatus'
  | 'progressStatus'
  | 'priority'
  | 'itUpDate'
  | 'releaseDate'
  | 'dueDate'
  | 'completedAt'
  | 'createdAt'
  | 'updatedAt'
  | 'external'
> & {
  projectType: string;
  flowStatus: string;
  progressStatus?: string | null;
  priority?: string | null;
  itUpDate: string | null;
  releaseDate: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  external?: TaskExternal & { lastSyncedAt: string };
};

function mapTask(raw: TaskRaw): Task {
  return {
    ...raw,
    projectType: raw.projectType as ProjectType,
    flowStatus: raw.flowStatus as Task['flowStatus'],
    progressStatus: (raw.progressStatus as Task['progressStatus']) ?? null,
    priority: (raw.priority as Task['priority']) ?? null,
    itUpDate: parseDate(raw.itUpDate),
    releaseDate: parseDate(raw.releaseDate),
    dueDate: parseDate(raw.dueDate),
    completedAt: parseDate(raw.completedAt),
    createdAt: parseDateRequired(raw.createdAt),
    updatedAt: parseDateRequired(raw.updatedAt),
    external: raw.external
      ? {
          ...raw.external,
          lastSyncedAt: parseDateRequired(raw.external.lastSyncedAt),
        }
      : undefined,
  };
}

export interface TaskPage {
  tasks: (Task & { projectType: ProjectType })[];
  hasMore: boolean;
}

export async function fetchTaskPage(params: {
  projectType: ProjectType;
  limitValue: number;
  offset?: number;
  getToken: GetToken;
}): Promise<TaskPage> {
  const { projectType, limitValue, offset = 0, getToken } = params;
  const data = await apiClient<{ tasks: TaskRaw[]; hasMore: boolean }>(
    `/api/tasks?projectType=${projectType}&limit=${limitValue}&offset=${offset}`,
    { getToken }
  );
  return {
    tasks: data.tasks.map(mapTask),
    hasMore: data.hasMore,
  };
}

export async function fetchTaskByIdAcrossProjects(
  taskId: string,
  getToken: GetToken
): Promise<Task | null> {
  try {
    const data = await apiClient<{ task: TaskRaw }>(`/api/tasks/${taskId}`, { getToken });
    return mapTask(data.task);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function fetchAssignedOpenTasks(
  userId: string,
  getToken: GetToken
): Promise<(Task & { projectType: ProjectType })[]> {
  const data = await apiClient<{ tasks: TaskRaw[] }>(`/api/tasks/assigned?userId=${userId}`, {
    getToken,
  });
  return data.tasks.map(mapTask);
}

export async function createTask(
  projectType: ProjectType,
  taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>,
  getToken: GetToken
): Promise<string> {
  const data = await apiClient<{ id: string }>('/api/tasks', {
    method: 'POST',
    body: { ...taskData, projectType },
    getToken,
  });
  return data.id;
}

export async function updateTask(
  _projectType: ProjectType,
  taskId: string,
  updates: Partial<Task>,
  getToken: GetToken
): Promise<void> {
  await apiClient(`/api/tasks/${taskId}`, {
    method: 'PUT',
    body: updates,
    getToken,
  });
}

export async function deleteTask(
  _projectType: ProjectType,
  taskId: string,
  getToken: GetToken
): Promise<void> {
  await apiClient(`/api/tasks/${taskId}`, {
    method: 'DELETE',
    getToken,
  });
}

export type TaskOrderUpdate = {
  taskId: string;
  projectType: ProjectType;
  newOrder: number;
};

export async function updateTasksOrder(
  updates: TaskOrderUpdate[],
  getToken: GetToken
): Promise<void> {
  await apiClient('/api/tasks/order', {
    method: 'PUT',
    body: { updates },
    getToken,
  });
}
