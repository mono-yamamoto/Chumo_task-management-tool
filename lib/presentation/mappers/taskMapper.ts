import { Task } from '@/types';
import { TaskDTO } from '../dtos/task.dto';

/**
 * Task エンティティから TaskDTO への変換
 */
export function toTaskDTO(task: Task, assigneeName?: string): TaskDTO {
  return {
    id: task.id,
    title: task.title,
    flowStatus: task.flowStatus,
    assigneeId: task.assigneeId,
    assigneeName,
    labelIds: task.labelIds,
    hasActiveTimer: task.hasActiveTimer,
    itUpDate: task.itUpDate?.toISOString(),
    releaseDate: task.releaseDate?.toISOString(),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

/**
 * TaskDTO から Task エンティティへの変換
 */
export function fromTaskDTO(dto: TaskDTO): Task {
  return {
    id: dto.id,
    title: dto.title,
    flowStatus: dto.flowStatus,
    assigneeId: dto.assigneeId,
    labelIds: dto.labelIds || [],
    hasActiveTimer: dto.hasActiveTimer,
    itUpDate: dto.itUpDate ? new Date(dto.itUpDate) : undefined,
    releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : undefined,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}
