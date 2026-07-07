import { describe, it, expect } from 'vitest';
import {
  extractProjectTypeFromIssueKey,
  generateBacklogUrl,
  parseDateString,
  getChangedCustomFieldValue,
  resolveCustomDateField,
  extractIssueFromPayload,
  getCustomFieldConfig,
  IT_UP_DATE_FIELD_NAMES,
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

    it('FAQ_IMP-10 → FAQ_IMP（アンダースコア入りキー）', () => {
      expect(extractProjectTypeFromIssueKey('FAQ_IMP-10')).toBe('FAQ_IMP');
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

    it('ISO日時形式（Backlog VUP後の日付属性値）をパースする', () => {
      const date = parseDateString('2026-07-15T00:00:00Z');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2026);
      expect(date!.getMonth()).toBe(6);
      expect(date!.getDate()).toBe(15);
    });

    it('自動調整される日付 → null', () => {
      expect(parseDateString('2025/02/30')).toBeNull();
    });
  });

  describe('getChangedCustomFieldValue', () => {
    it('カスタム属性名でマッチする（全角ＩＴ予定日）', () => {
      const changes = [
        { field: 'status', new_value: '処理中', old_value: '未対応', type: 'standard' },
        { field: 'ＩＴ予定日', new_value: '2026/07/15', old_value: '', type: 'custom' },
      ];
      expect(getChangedCustomFieldValue(changes, 1073783169, IT_UP_DATE_FIELD_NAMES)).toBe(
        '2026/07/15'
      );
    });

    it('customField_<ID> 形式でマッチする', () => {
      const changes = [
        { field: 'customField_1073783169', new_value: '2026/07/15', old_value: '', type: 'custom' },
      ];
      expect(getChangedCustomFieldValue(changes, 1073783169, IT_UP_DATE_FIELD_NAMES)).toBe(
        '2026/07/15'
      );
    });

    it('ID文字列でマッチする', () => {
      const changes = [
        { field: '1073783169', new_value: '2026/07/15', old_value: '', type: 'custom' },
      ];
      expect(getChangedCustomFieldValue(changes, 1073783169, IT_UP_DATE_FIELD_NAMES)).toBe(
        '2026/07/15'
      );
    });

    it('対象フィールドの変更が無い → undefined', () => {
      const changes = [{ field: 'status', new_value: '処理中', old_value: '', type: 'standard' }];
      expect(
        getChangedCustomFieldValue(changes, 1073783169, IT_UP_DATE_FIELD_NAMES)
      ).toBeUndefined();
    });

    it('クリアされた変更（new_value空文字）→ 空文字を返す', () => {
      const changes = [
        { field: 'ＩＴ予定日', new_value: '', old_value: '2026/07/15', type: 'custom' },
      ];
      expect(getChangedCustomFieldValue(changes, 1073783169, IT_UP_DATE_FIELD_NAMES)).toBe('');
    });

    it('changesがundefined → undefined', () => {
      expect(
        getChangedCustomFieldValue(undefined, 1073783169, IT_UP_DATE_FIELD_NAMES)
      ).toBeUndefined();
    });

    it('fieldが数値でもマッチする（外部JSONの型ゆらぎ対策）', () => {
      const changes = [
        { field: 1073783169 as unknown as string, new_value: '2026/07/15', old_value: '' },
      ];
      expect(getChangedCustomFieldValue(changes, 1073783169, IT_UP_DATE_FIELD_NAMES)).toBe(
        '2026/07/15'
      );
    });

    it('new_valueがnull → 空文字（クリア扱い）', () => {
      const changes = [
        { field: 'ＩＴ予定日', new_value: null, old_value: '2026/07/15', type: 'custom' },
      ];
      expect(getChangedCustomFieldValue(changes, 1073783169, IT_UP_DATE_FIELD_NAMES)).toBe('');
    });

    it('new_valueキー欠落 → undefined（情報なし扱い）', () => {
      const changes = [{ field: 'ＩＴ予定日', old_value: '2026/07/15', type: 'custom' }];
      expect(
        getChangedCustomFieldValue(changes, 1073783169, IT_UP_DATE_FIELD_NAMES)
      ).toBeUndefined();
    });
  });

  describe('resolveCustomDateField', () => {
    it('customFieldsに対象フィールドがあればそこから解決する', () => {
      const customFields = [{ id: 1073783169, value: '2026/07/15', fieldTypeId: 4 }];
      const date = resolveCustomDateField(
        customFields,
        undefined,
        1073783169,
        IT_UP_DATE_FIELD_NAMES
      );
      expect(date).toBeInstanceOf(Date);
      expect(date!.getFullYear()).toBe(2026);
    });

    it('customFieldsに無ければchangesから解決する', () => {
      const changes = [
        { field: 'ＩＴ予定日', new_value: '2026/07/15', old_value: '', type: 'custom' },
      ];
      const date = resolveCustomDateField(undefined, changes, 1073783169, IT_UP_DATE_FIELD_NAMES);
      expect(date).toBeInstanceOf(Date);
    });

    it('changesでクリアされた場合はnull', () => {
      const changes = [
        { field: 'ＩＴ予定日', new_value: '', old_value: '2026/07/15', type: 'custom' },
      ];
      expect(
        resolveCustomDateField(undefined, changes, 1073783169, IT_UP_DATE_FIELD_NAMES)
      ).toBeNull();
    });

    it('どちらにも情報が無い場合はundefined（既存値を維持）', () => {
      const changes = [{ field: 'status', new_value: '処理中', old_value: '', type: 'standard' }];
      expect(
        resolveCustomDateField(undefined, changes, 1073783169, IT_UP_DATE_FIELD_NAMES)
      ).toBeUndefined();
    });

    it('customFieldsで値がnull（未設定）ならnull', () => {
      const customFields = [{ id: 1073783169, value: null, fieldTypeId: 4 }];
      expect(
        resolveCustomDateField(customFields, undefined, 1073783169, IT_UP_DATE_FIELD_NAMES)
      ).toBeNull();
    });

    it('fieldIdが未設定のプロジェクトはundefined', () => {
      expect(
        resolveCustomDateField([], undefined, undefined, IT_UP_DATE_FIELD_NAMES)
      ).toBeUndefined();
    });

    it('changesの値がパース不能ならundefined（既存値を消さない）', () => {
      const changes = [
        {
          field: 'ＩＴ予定日',
          new_value: '2026年7月15日',
          old_value: '',
          type: 'custom',
        },
      ];
      expect(
        resolveCustomDateField(undefined, changes, 1073783169, IT_UP_DATE_FIELD_NAMES)
      ).toBeUndefined();
    });

    it('customFieldsの値がパース不能ならundefined（既存値を消さない）', () => {
      const customFields = [{ id: 1073783169, value: '2026年7月15日', fieldTypeId: 4 }];
      expect(
        resolveCustomDateField(customFields, undefined, 1073783169, IT_UP_DATE_FIELD_NAMES)
      ).toBeUndefined();
    });

    it('IDが不一致でも属性名+日付型でフォールバック照合できる', () => {
      // Backlog VUPでIDが振り直された想定: 設定ID(25)と実ID(999)が不一致
      const customFields = [
        { id: 999, fieldTypeId: 4, name: 'ＩＴ予定日', value: '2026-07-15T00:00:00Z' },
        { id: 998, fieldTypeId: 5, name: 'リリース日の重要度', value: { name: '変更可' } },
      ];
      const date = resolveCustomDateField(customFields, undefined, 25, IT_UP_DATE_FIELD_NAMES);
      expect(date).toBeInstanceOf(Date);
      expect(date!.getDate()).toBe(15);
    });

    it('属性名が一致しても日付型でなければフォールバックしない', () => {
      const customFields = [{ id: 999, fieldTypeId: 1, name: 'ＩＴ予定日', value: 'テキスト値' }];
      expect(
        resolveCustomDateField(customFields, undefined, 25, IT_UP_DATE_FIELD_NAMES)
      ).toBeUndefined();
    });
  });

  describe('getCustomFieldConfig', () => {
    it('REG2017のカスタムフィールドIDを返す', () => {
      const config = getCustomFieldConfig('REG2017');
      expect(config.itUpDate).toBe(25);
      expect(config.releaseDate).toBe(30);
    });

    it('MONOは空オブジェクトを返す', () => {
      const config = getCustomFieldConfig('MONO');
      expect(config.itUpDate).toBeUndefined();
    });

    it('FAQ_IMPは空オブジェクトを返す', () => {
      const config = getCustomFieldConfig('FAQ_IMP');
      expect(config).toEqual({});
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
