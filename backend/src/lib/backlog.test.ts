import { describe, it, expect } from 'vitest';
import {
  extractProjectTypeFromIssueKey,
  generateBacklogUrl,
  parseDateString,
  getCustomFieldValue,
  extractIssueFromPayload,
  getCustomFieldConfig,
} from './backlog';

describe('Backlog ユーティリティ', () => {
  describe('extractProjectTypeFromIssueKey', () => {
    it('BRGREG-2905 → BRGREG', () => {
      expect(extractProjectTypeFromIssueKey('BRGREG-2905')).toBe('BRGREG');
    });

    it('REG2017-2229 → REG2017', () => {
      expect(extractProjectTypeFromIssueKey('REG2017-2229')).toBe('REG2017');
    });

    it('MONO-100 → MONO', () => {
      expect(extractProjectTypeFromIssueKey('MONO-100')).toBe('MONO');
    });

    it('不明なプロジェクトキー → null', () => {
      expect(extractProjectTypeFromIssueKey('UNKNOWN-100')).toBeNull();
    });

    it('空文字 → null', () => {
      expect(extractProjectTypeFromIssueKey('')).toBeNull();
    });

    it('数字なし → null', () => {
      expect(extractProjectTypeFromIssueKey('MONO')).toBeNull();
    });
  });

  describe('generateBacklogUrl', () => {
    it('正しいURLを生成する', () => {
      expect(generateBacklogUrl('BRGREG-2905')).toBe('https://ss-pj.jp/backlog/view/BRGREG-2905');
    });
  });

  describe('parseDateString', () => {
    it('YYYY/MM/DD形式をパースする', () => {
      const date = parseDateString('2025/07/15');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2025);
      expect(date!.getMonth()).toBe(6); // 0-indexed
      expect(date!.getDate()).toBe(15);
    });

    it('YYYY-MM-DD形式をパースする', () => {
      const date = parseDateString('2025-07-15');
      expect(date).not.toBeNull();
    });

    it('null → null', () => {
      expect(parseDateString(null)).toBeNull();
    });

    it('空文字 → null', () => {
      expect(parseDateString('')).toBeNull();
    });

    it('不正な日付 → null', () => {
      expect(parseDateString('2025/13/01')).toBeNull();
    });

    it('自動調整される日付 → null', () => {
      expect(parseDateString('2025/02/30')).toBeNull();
    });
  });

  describe('getCustomFieldValue', () => {
    it('文字列値を取得', () => {
      expect(getCustomFieldValue([{ id: 1, value: '2025/07/15', fieldTypeId: 4 }], 1)).toBe(
        '2025/07/15'
      );
    });

    it('オブジェクト値（name）を取得', () => {
      expect(
        getCustomFieldValue([{ id: 1, value: { name: '2025/08/01' }, fieldTypeId: 4 }], 1)
      ).toBe('2025/08/01');
    });

    it('存在しないフィールド → null', () => {
      expect(getCustomFieldValue([{ id: 1, value: 'test', fieldTypeId: 4 }], 99)).toBeNull();
    });

    it('null値 → null', () => {
      expect(getCustomFieldValue([{ id: 1, value: null, fieldTypeId: 4 }], 1)).toBeNull();
    });

    it('undefined配列 → null', () => {
      expect(getCustomFieldValue(undefined, 1)).toBeNull();
    });
  });

  describe('getCustomFieldConfig', () => {
    it('REG2017のカスタムフィールドIDを返す', () => {
      const config = getCustomFieldConfig('REG2017');
      expect(config.itUpDate).toBe(1073783169);
      expect(config.releaseDate).toBe(1073783170);
    });

    it('MONOは空オブジェクトを返す', () => {
      const config = getCustomFieldConfig('MONO');
      expect(config.itUpDate).toBeUndefined();
    });

    it('不明なプロジェクトは空オブジェクトを返す', () => {
      const config = getCustomFieldConfig('UNKNOWN');
      expect(config).toEqual({});
    });
  });

  describe('extractIssueFromPayload', () => {
    it('content形式からissueKeyを構築する', () => {
      const result = extractIssueFromPayload({
        project: { projectKey: 'BRGREG' },
        content: { id: 100, key_id: 2905, summary: 'テスト' },
      });
      expect(result.issueKey).toBe('BRGREG-2905');
      expect(result.issueId).toBe('100');
      expect(result.title).toBe('テスト');
    });

    it('issue形式から取得する', () => {
      const result = extractIssueFromPayload({
        issue: { id: 500, issueKey: 'MONO-500', summary: 'テスト2' },
      });
      expect(result.issueKey).toBe('MONO-500');
      expect(result.title).toBe('テスト2');
    });

    it('フラットな形式から取得する', () => {
      const result = extractIssueFromPayload({
        issueKey: 'DES_FIRE-10',
        id: 10,
        title: 'テスト3',
      });
      expect(result.issueKey).toBe('DES_FIRE-10');
      expect(result.title).toBe('テスト3');
    });

    it('空ペイロードでnullを返す', () => {
      const result = extractIssueFromPayload({});
      expect(result.issueKey).toBeNull();
      expect(result.title).toBeNull();
    });
  });
});
