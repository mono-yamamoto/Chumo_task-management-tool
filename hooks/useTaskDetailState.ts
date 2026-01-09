'use client';

import { useEffect, useMemo, useState } from 'react';
import { Task } from '@/types';

export type TaskDetailInitializeMode = 'always' | 'if-empty';

type TaskDetailStateOptions = {
  tasks: Task[];
  initializeMode: TaskDetailInitializeMode;
  selectedTaskId?: string | null;
  setSelectedTaskId?: (_taskId: string | null) => void;
  taskFormData?: Partial<Task> | null;
  setTaskFormData?: (_formData: Partial<Task> | null) => void;
};

const buildTaskFormData = (task: Task) => ({
  title: task.title,
  description: task.description || '',
  flowStatus: task.flowStatus,
  kubunLabelId: task.kubunLabelId,
  assigneeIds: task.assigneeIds,
  itUpDate: task.itUpDate,
  releaseDate: task.releaseDate,
  dueDate: task.dueDate,
});

const buildTaskFormDataOnSelect = (task: Task) => ({
  title: task.title,
  description: task.description || '',
  flowStatus: task.flowStatus,
  kubunLabelId: task.kubunLabelId,
  assigneeIds: task.assigneeIds,
  itUpDate: task.itUpDate,
  releaseDate: task.releaseDate,
});

export function useTaskDetailState({
  tasks,
  initializeMode,
  selectedTaskId,
  setSelectedTaskId,
  taskFormData,
  setTaskFormData,
}: TaskDetailStateOptions) {
  const [internalSelectedTaskId, setInternalSelectedTaskId] = useState<string | null>(null);
  const [internalTaskFormData, setInternalTaskFormData] = useState<Partial<Task> | null>(null);
  const resolvedSelectedTaskId =
    selectedTaskId !== undefined ? selectedTaskId : internalSelectedTaskId;
  const resolvedTaskFormData = taskFormData !== undefined ? taskFormData : internalTaskFormData;
  const setSelectedTaskIdValue = setSelectedTaskId ?? setInternalSelectedTaskId;
  const setTaskFormDataValue = setTaskFormData ?? setInternalTaskFormData;

  const selectedTask = useMemo(() => {
    return tasks.find((task) => task.id === resolvedSelectedTaskId) || null;
  }, [tasks, resolvedSelectedTaskId]);

  useEffect(() => {
    if (selectedTask && resolvedSelectedTaskId) {
      const shouldInitialize =
        initializeMode === 'always' || (initializeMode === 'if-empty' && !resolvedTaskFormData);
      if (shouldInitialize) {
        setTaskFormDataValue(buildTaskFormData(selectedTask));
      }
    } else if (!resolvedSelectedTaskId) {
      setTaskFormDataValue(null);
    }
    // taskFormDataを依存配列に入れると無限ループになる可能性があるため除外
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTask?.id, resolvedSelectedTaskId, initializeMode]);

  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskIdValue(taskId);
    const task = tasks.find((item) => item.id === taskId);
    if (task) {
      setTaskFormDataValue(buildTaskFormDataOnSelect(task));
    }
  };

  const resetSelection = () => {
    setSelectedTaskIdValue(null);
    setTaskFormDataValue(null);
  };

  return {
    selectedTaskId: resolvedSelectedTaskId,
    setSelectedTaskId: setSelectedTaskIdValue,
    selectedTask,
    taskFormData: resolvedTaskFormData,
    setTaskFormData: setTaskFormDataValue,
    handleTaskSelect,
    resetSelection,
  };
}
