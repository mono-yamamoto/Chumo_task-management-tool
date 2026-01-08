/**
 * 不明な値をDate型に変換する（Firestore Timestampにも対応）
 * @param value 変換したい値（Firestore Timestamp、Date、またはその他）
 * @param fallback 変換に失敗した場合のフォールバック値（デフォルト: 現在時刻）
 * @returns Date型のオブジェクト
 */
export function toDate(value: unknown, fallback: Date = new Date()): Date {
  if (value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return fallback;
}

/**
 * 不明な値をDate型またはnullに変換する（Firestore Timestampにも対応）
 * @param value 変換したい値（Firestore Timestamp、Date、またはその他）
 * @returns Date型のオブジェクト、またはnull
 */
export function toNullableDate(value: unknown): Date | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return null;
}
