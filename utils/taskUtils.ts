import { Task } from '@/types';

/**
 * タスクフォームデータと元のタスクデータの変更を検出
 *
 * @param formData - フォームデータ
 * @param originalTask - 元のタスクデータ
 * @returns 変更がある場合はtrue
 */
export function hasTaskChanges(
  formData: Partial<Task>,
  originalTask: Task
): boolean {
  // formDataとoriginalTaskの全フィールドを網羅
  const allKeys = new Set([
    ...Object.keys(formData),
    ...Object.keys(originalTask),
  ]);

  return Array.from(allKeys).some((key) => {
    const formValue = formData[key as keyof Task];
    const taskValue = originalTask[key as keyof Task];

    // null/undefined と Date の比較
    if (formValue instanceof Date || taskValue instanceof Date) {
      if (formValue instanceof Date && taskValue instanceof Date) {
        return formValue.getTime() !== taskValue.getTime();
      }
      // 片方だけがDateの場合は変更あり
      return formValue !== taskValue;
    }

    // null/undefinedの明示的な比較
    if (formValue === null || formValue === undefined ||
        taskValue === null || taskValue === undefined) {
      return formValue !== taskValue;
    }

    // 配列の比較（assigneeIds等）- パフォーマンス最適化版
    if (Array.isArray(formValue) && Array.isArray(taskValue)) {
      if (formValue.length !== taskValue.length) return true;
      return formValue.some((v, i) => v !== taskValue[i]);
    }

    // 基本的な値の比較
    return formValue !== taskValue;
  });
}
