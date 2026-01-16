import { Task } from '@/types';
import { TaskDTO } from '../dtos/task.dto';

/**
 * Task エンティティから TaskDTO への変換
 *
 * Note: TaskDTO is a simplified representation for API responses.
 * - assigneeIds (array) -> assigneeId (single, first assignee)
 * - labelIds and hasActiveTimer are not part of core Task entity
 */
export function toTaskDTO(task: Task, assigneeName?: string): TaskDTO {
  return {
    id: task.id,
    title: task.title,
    flowStatus: task.flowStatus,
    assigneeId: task.assigneeIds?.[0],
    assigneeName,
    itUpDate: task.itUpDate?.toISOString(),
    releaseDate: task.releaseDate?.toISOString(),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

/**
 * TaskDTO から Task エンティティへの変換
 *
 * Note: This is a partial conversion as DTO doesn't contain all Task fields.
 * Missing fields should be filled by the caller.
 */
export function fromTaskDTO(dto: TaskDTO): Partial<Task> {
  return {
    id: dto.id,
    title: dto.title,
    flowStatus: dto.flowStatus,
    assigneeIds: dto.assigneeId ? [dto.assigneeId] : [],
    itUpDate: dto.itUpDate ? new Date(dto.itUpDate) : null,
    releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : null,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}
