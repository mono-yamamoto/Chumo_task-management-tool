/**
 * API レスポンスの日付文字列を Date オブジェクトに変換するユーティリティ
 */

export function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

export function parseDateRequired(value: string | Date): Date {
  if (value instanceof Date) return value;
  return new Date(value);
}
