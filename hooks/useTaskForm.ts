'use client';

import { useState, useEffect, useCallback } from 'react';
import { Task, FlowStatus, Priority } from '@/types';
import { ProjectType } from '@/constants/projectTypes';

export interface TaskFormData {
  projectType?: ProjectType | '';
  title: string;
  description?: string;
  flowStatus: FlowStatus;
  assigneeIds: string[];
  itUpDate: Date | null;
  releaseDate: Date | null;
  dueDate: Date | null;
  kubunLabelId: string;
  priority?: Priority | null;
}

const initialFormData: TaskFormData = {
  projectType: '',
  title: '',
  description: '',
  flowStatus: '未着手',
  assigneeIds: [],
  itUpDate: null,
  releaseDate: null,
  dueDate: null,
  kubunLabelId: '',
  priority: null,
};

/**
 * タスクフォームの状態管理とバリデーションを行うカスタムフック
 * @param initialData 初期データ（編集時など）
 */
export function useTaskForm(initialData?: Partial<Task> | null) {
  const [formData, setFormData] = useState<TaskFormData>(() => {
    if (initialData) {
      return {
        projectType: (initialData as any)?.projectType || '',
        title: initialData.title || '',
        description: initialData.description || '',
        flowStatus: initialData.flowStatus || '未着手',
        assigneeIds: initialData.assigneeIds || [],
        itUpDate: initialData.itUpDate || null,
        releaseDate: initialData.releaseDate || null,
        dueDate: initialData.dueDate || null,
        kubunLabelId: initialData.kubunLabelId || '',
        priority: initialData.priority || null,
      };
    }
    return initialFormData;
  });

  // 初期データが変更されたらフォームデータを更新
  useEffect(() => {
    if (initialData) {
      setFormData({
        projectType: (initialData as any)?.projectType || '',
        title: initialData.title || '',
        description: initialData.description || '',
        flowStatus: initialData.flowStatus || '未着手',
        assigneeIds: initialData.assigneeIds || [],
        itUpDate: initialData.itUpDate || null,
        releaseDate: initialData.releaseDate || null,
        dueDate: initialData.dueDate || null,
        kubunLabelId: initialData.kubunLabelId || '',
        priority: initialData.priority || null,
      });
    } else {
      setFormData(initialFormData);
    }
    // initialData全体を依存配列に入れると、オブジェクトの参照が変わるたびに再実行される
    // タスクIDが変更されたときのみ更新する意図的な制限
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id]);

  const updateField = useCallback(
    <K extends keyof TaskFormData>(field: K, value: TaskFormData[K]) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  const updateFields = useCallback((updates: Partial<TaskFormData>) => {
    setFormData((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const reset = useCallback(() => {
    setFormData(initialFormData);
  }, []);

  const validate = useCallback((): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!formData.projectType) {
      errors.push('プロジェクトを選択してください');
    }
    if (!formData.title.trim()) {
      errors.push('タイトルを入力してください');
    }
    if (!formData.kubunLabelId) {
      errors.push('区分を選択してください');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [formData]);

  return {
    formData,
    updateField,
    updateFields,
    reset,
    validate,
  };
}
