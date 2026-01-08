export const queryKeys = {
  tasks: (projectType: string | 'all') => ['tasks', projectType] as const,
  task: (taskId: string) => ['task', taskId] as const,
  taskSessions: (taskId: string) => ['taskSessions', taskId] as const,
  activeSession: (userId?: string | null, taskId?: string | null) =>
    ['activeSession', userId ?? null, taskId ?? null] as const,
  contacts: (status: 'pending' | 'resolved') => ['contacts', status] as const,
  sessionHistory: (taskId: string) => ['sessionHistory', taskId] as const,
  dashboardTasks: (userId?: string | null) => ['dashboard-tasks', userId ?? null] as const,
};
