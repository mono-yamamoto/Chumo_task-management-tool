import { describe, it, expect } from 'vitest';
import { toDate, toNullableDate } from '../date';

describe('toDate', () => {
  it('Date型をそのまま返す', () => {
    const date = new Date('2024-01-01');
    expect(toDate(date)).toBe(date);
  });

  it('Firestore Timestamp風オブジェクト（toDateメソッド付き）を変換する', () => {
    const expected = new Date('2024-06-15');
    const timestamp = { toDate: () => expected };
    expect(toDate(timestamp)).toBe(expected);
  });

  it('不正な値の場合フォールバック値を返す', () => {
    const fallback = new Date('2000-01-01');
    expect(toDate(null, fallback)).toBe(fallback);
    expect(toDate(undefined, fallback)).toBe(fallback);
    expect(toDate('string', fallback)).toBe(fallback);
    expect(toDate(123, fallback)).toBe(fallback);
  });

  it('フォールバック未指定の場合は現在時刻を返す', () => {
    const before = Date.now();
    const result = toDate(null);
    const after = Date.now();
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.getTime()).toBeLessThanOrEqual(after);
  });
});

describe('toNullableDate', () => {
  it('Date型をそのまま返す', () => {
    const date = new Date('2024-01-01');
    expect(toNullableDate(date)).toBe(date);
  });

  it('Firestore Timestamp風オブジェクトを変換する', () => {
    const expected = new Date('2024-06-15');
    const timestamp = { toDate: () => expected };
    expect(toNullableDate(timestamp)).toBe(expected);
  });

  it('nullの場合nullを返す', () => {
    expect(toNullableDate(null)).toBeNull();
  });

  it('undefinedの場合nullを返す', () => {
    expect(toNullableDate(undefined)).toBeNull();
  });

  it('不正な値の場合nullを返す', () => {
    expect(toNullableDate('string')).toBeNull();
    expect(toNullableDate(123)).toBeNull();
    expect(toNullableDate({})).toBeNull();
  });
});
