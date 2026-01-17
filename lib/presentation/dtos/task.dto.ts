import { FlowStatus } from '@/types';

/**
 * タスク一覧取得のリクエストDTO
 */
export interface ListTasksRequestDTO {
  projectType: string;
  filters: TaskFiltersDTO;
  pagination?: PaginationDTO;
}

/**
 * タスクフィルターDTO
 */
export interface TaskFiltersDTO {
  status?: 'not-completed' | 'completed' | 'all';
  assigneeIds?: string[];
  labelIds?: string[];
  timerActive?: boolean;
  itUpDateMonth?: string;
  releaseDateMonth?: string;
  title?: string;
}

/**
 * ページネーションDTO
 */
export interface PaginationDTO {
  page: number;
  pageSize: number;
}

/**
 * タスク一覧レスポンスDTO
 */
export interface TaskListResponseDTO {
  tasks: TaskDTO[];
  pagination?: PaginationMetaDTO;
}

/**
 * ページネーションメタデータDTO
 */
export interface PaginationMetaDTO {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
}

/**
 * タスクDTO
 * 表示用に簡略化されたタスク情報
 */
export interface TaskDTO {
  id: string;
  title: string;
  flowStatus: FlowStatus;
  /** 最初のアサインのみ（ドメインTaskは複数アサイン対応だが、DTOでは単一） */
  assigneeId?: string;
  assigneeName?: string;
  labelIds?: string[];
  hasActiveTimer?: boolean;
  itUpDate?: string;
  releaseDate?: string;
  createdAt: string;
  updatedAt: string;
  isNew?: boolean;
  isUnassignedNew?: boolean;
}
