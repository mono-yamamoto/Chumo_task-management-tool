/**
 * Hooks Barrel File
 *
 * 全てのカスタムフックをカテゴリ別にエクスポート
 * import { useAuth, useTasks, useToast } from '@/hooks';
 */

// ============================================
// Auth / User
// ============================================
export { useAuth } from './useAuth';
export { useUsers } from './useUsers';

// ============================================
// Task - Data Fetching & Mutations
// ============================================
export { useTasks, useTask, useCreateTask, useUpdateTask, useDeleteTask } from './useTasks';

// ============================================
// Task - Page State Management
// ============================================
export { useTaskListPageManager } from './useTaskListPageManager';
export { useTaskForm } from './useTaskForm';
export type { TaskFormData } from './useTaskForm';
export { useTasksList } from './useTasksList';
export { useTaskFilters } from './useTaskFilters';
export { useTaskPagination } from './useTaskPagination';
export { useTaskDetailState } from './useTaskDetailState';
export type { TaskDetailInitializeMode } from './useTaskDetailState';
export { useTaskDetailActions } from './useTaskDetailActions';
export { useTaskDelete } from './useTaskDelete';
export { useTaskDrawer } from './useTaskDrawer';

// ============================================
// Timer / Session
// ============================================
export { useTimer } from './useTimer';
export { useTimerActions } from './useTimerActions';
export { useTimerTitle } from './useTimerTitle';
export {
  useTaskSessions,
  useActiveSession,
  useAddSession,
  useUpdateSession,
  useDeleteSession,
} from './useTaskSessions';
export { useActiveSessionValidator } from './useActiveSessionValidator';

// ============================================
// Comments
// ============================================
export {
  useTaskComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useMarkCommentsAsRead,
  useTaskCommentsManager,
} from './useTaskComments';
export { useUnreadComments, useHasUnreadComments } from './useUnreadComments';

// ============================================
// Integrations (Drive, Fire, GoogleChat)
// ============================================
export { useDriveIntegration, useFireIntegration, useGoogleChatIntegration } from './useIntegrations';

// ============================================
// UI / Toast
// ============================================
export { useToast, useToastStore } from './useToast';
export type { ToastType } from './useToast';

// ============================================
// Domain Specific
// ============================================
export { useKubunLabels } from './useKubunLabels';
export { useReportData } from './useReportData';
export { useContactFormState } from './useContactFormState';
export { useImageUpload } from './useImageUpload';
export { useSettingsOauthStatus } from './useSettingsOauthStatus';
export { useLoginErrorMessage, ERROR_MESSAGES } from './useLoginErrorMessage';
