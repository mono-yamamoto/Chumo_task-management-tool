/**
 * Mappers for converting between Task DTOs and Domain Models
 */

import { Task } from '@/types';
import { TaskDTO, TaskExternalDTO } from '../dtos/task.dto';

/**
 * Convert Task domain model to TaskDTO
 */
export function taskToDTO(task: Task): TaskDTO {
  return {
    id: task.id,
    projectType: task.projectType,
    external: task.external
      ? {
          source: task.external.source,
          issueId: task.external.issueId,
          issueKey: task.external.issueKey,
          url: task.external.url,
          lastSyncedAt: task.external.lastSyncedAt.toISOString(),
          syncStatus: task.external.syncStatus,
        }
      : undefined,
    title: task.title,
    description: task.description,
    flowStatus: task.flowStatus,
    assigneeIds: task.assigneeIds,
    itUpDate: task.itUpDate ? task.itUpDate.toISOString() : null,
    releaseDate: task.releaseDate ? task.releaseDate.toISOString() : null,
    kubunLabelId: task.kubunLabelId,
    googleDriveUrl: task.googleDriveUrl,
    fireIssueUrl: task.fireIssueUrl,
    googleChatThreadUrl: task.googleChatThreadUrl,
    backlogUrl: task.backlogUrl,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    priority: task.priority,
    order: task.order,
    over3Reason: task.over3Reason,
    createdBy: task.createdBy,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
  };
}

/**
 * Convert TaskDTO to Task domain model
 */
export function dtoToTask(dto: TaskDTO): Task {
  return {
    id: dto.id,
    projectType: dto.projectType,
    external: dto.external
      ? {
          source: dto.external.source,
          issueId: dto.external.issueId,
          issueKey: dto.external.issueKey,
          url: dto.external.url,
          lastSyncedAt: new Date(dto.external.lastSyncedAt),
          syncStatus: dto.external.syncStatus,
        }
      : undefined,
    title: dto.title,
    description: dto.description,
    flowStatus: dto.flowStatus,
    assigneeIds: dto.assigneeIds,
    itUpDate: dto.itUpDate ? new Date(dto.itUpDate) : null,
    releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : null,
    kubunLabelId: dto.kubunLabelId,
    googleDriveUrl: dto.googleDriveUrl,
    fireIssueUrl: dto.fireIssueUrl,
    googleChatThreadUrl: dto.googleChatThreadUrl,
    backlogUrl: dto.backlogUrl,
    dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
    priority: dto.priority,
    order: dto.order,
    over3Reason: dto.over3Reason,
    createdBy: dto.createdBy,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
    completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
  };
}

/**
 * Convert array of Tasks to array of TaskDTOs
 */
export function tasksToDTO(tasks: Task[]): TaskDTO[] {
  return tasks.map(taskToDTO);
}

/**
 * Convert array of TaskDTOs to array of Tasks
 */
export function dtoToTasks(dtos: TaskDTO[]): Task[] {
  return dtos.map(dtoToTask);
}
