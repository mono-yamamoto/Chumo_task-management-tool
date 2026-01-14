/**
 * DTOs for Task-related operations
 * These define the data structures for communication between layers
 */

import { ProjectType } from '@/constants/projectTypes';
import { FlowStatus, Priority } from '@/types';

/**
 * フィルター条件のDTO
 */
export interface TaskFiltersDTO {
  status?: FlowStatus | 'all';
  assigneeIds?: string[];
  labelId?: string | 'all';
  timerActive?: boolean;
  itUpDateMonth?: string; // YYYY-MM format
  releaseDateMonth?: string; // YYYY-MM format
  title?: string;
}

/**
 * ソート条件のDTO
 */
export interface TaskSortDTO {
  field: 'createdAt' | 'updatedAt' | 'itUpDate' | 'releaseDate' | 'order';
  direction: 'asc' | 'desc';
}

/**
 * ページネーション条件のDTO
 */
export interface PaginationDTO {
  page: number;
  limit: number;
  cursor?: unknown; // QueryDocumentSnapshot or similar
}

/**
 * ページネーションのメタ情報DTO
 */
export interface PaginationMetaDTO {
  currentPage: number;
  totalPages?: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * タスク一覧リクエストのDTO
 */
export interface ListTasksRequestDTO {
  projectType: ProjectType | 'all';
  filters?: TaskFiltersDTO;
  sort?: TaskSortDTO;
  pagination: PaginationDTO;
}

/**
 * タスクDTOのエクスターナル情報
 */
export interface TaskExternalDTO {
  source: 'backlog';
  issueId: string;
  issueKey: string;
  url: string;
  lastSyncedAt: string; // ISO 8601 string
  syncStatus: 'ok' | 'failed';
}

/**
 * タスクDTO
 */
export interface TaskDTO {
  id: string;
  projectType: ProjectType;
  external?: TaskExternalDTO;
  title: string;
  description?: string;
  flowStatus: FlowStatus;
  assigneeIds: string[];
  itUpDate: string | null; // ISO 8601 string or null
  releaseDate: string | null; // ISO 8601 string or null
  kubunLabelId: string;
  googleDriveUrl?: string | null;
  fireIssueUrl?: string | null;
  googleChatThreadUrl?: string | null;
  backlogUrl?: string | null;
  dueDate?: string | null; // ISO 8601 string or null
  priority?: Priority | null;
  order: number;
  over3Reason?: string;
  createdBy: string;
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
  completedAt?: string | null; // ISO 8601 string or null
}

/**
 * タスク一覧レスポンスのDTO
 */
export interface ListTasksResponseDTO {
  tasks: TaskDTO[];
  pagination: PaginationMetaDTO;
}

/**
 * タスク作成リクエストのDTO
 */
export interface CreateTaskRequestDTO {
  projectType: ProjectType;
  title: string;
  description?: string;
  flowStatus: FlowStatus;
  assigneeIds: string[];
  itUpDate?: string | null;
  releaseDate?: string | null;
  kubunLabelId: string;
  googleDriveUrl?: string | null;
  fireIssueUrl?: string | null;
  googleChatThreadUrl?: string | null;
  backlogUrl?: string | null;
  dueDate?: string | null;
  priority?: Priority | null;
  over3Reason?: string;
}

/**
 * タスク更新リクエストのDTO
 */
export interface UpdateTaskRequestDTO {
  id: string;
  projectType: ProjectType;
  title?: string;
  description?: string;
  flowStatus?: FlowStatus;
  assigneeIds?: string[];
  itUpDate?: string | null;
  releaseDate?: string | null;
  kubunLabelId?: string;
  googleDriveUrl?: string | null;
  fireIssueUrl?: string | null;
  googleChatThreadUrl?: string | null;
  backlogUrl?: string | null;
  dueDate?: string | null;
  priority?: Priority | null;
  over3Reason?: string;
  completedAt?: string | null;
}
