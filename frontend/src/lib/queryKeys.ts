/**
 * TanStack Query キー一元管理
 * 全てのクエリキーをここで定義し、キャッシュの一貫性を保つ
 */
export const queryKeys = {
  // Auth / Users
  currentUser: () => ['currentUser'] as const,
  users: () => ['users'] as const,
  user: (userId: string) => ['users', userId] as const,

  // Labels
  labels: () => ['labels'] as const,

  // Tasks
  tasks: (projectType?: string) =>
    projectType ? (['tasks', projectType] as const) : (['tasks'] as const),
  assignedTasks: (userId?: string) =>
    userId ? (['tasks', 'assigned', userId] as const) : (['tasks', 'assigned'] as const),
  task: (taskId: string) => ['tasks', 'detail', taskId] as const,

  // Comments
  comments: (taskId: string) => ['comments', taskId] as const,
  unreadComments: () => ['comments', 'unread'] as const,

  // Sessions
  sessions: (taskId: string) => ['sessions', taskId] as const,
  activeSession: () => ['sessions', 'active'] as const,

  // Reports
  reports: (from: string, to: string, type: string) => ['reports', from, to, type] as const,

  // Contacts
  contacts: (status?: string) =>
    status ? (['contacts', status] as const) : (['contacts'] as const),
} as const;
