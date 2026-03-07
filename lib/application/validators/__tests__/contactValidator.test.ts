import { describe, it, expect } from 'vitest';
import { ContactValidator } from '../contactValidator';

const validator = new ContactValidator();

describe('ContactValidator', () => {
  describe('validate - 基本バリデーション', () => {
    it('有効なリクエストでisValid=trueを返す', () => {
      const result = validator.validate({
        contactType: 'feature',
        title: '機能要望',
        contactContent: '新しい機能が欲しいです',
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('null/undefinedデータでエラーを返す', () => {
      expect(validator.validate(null).isValid).toBe(false);
      expect(validator.validate(undefined).isValid).toBe(false);
      expect(validator.validate('string').isValid).toBe(false);
    });

    it('contactTypeが未指定でエラーを返す', () => {
      const result = validator.validate({
        title: 'テスト',
        contactContent: '内容',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('お問い合わせ種別を選択してください');
    });

    it('不正なcontactTypeでエラーを返す', () => {
      const result = validator.validate({
        contactType: 'invalid',
        title: 'テスト',
        contactContent: '内容',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('お問い合わせ種別が不正です');
    });

    it('有効なcontactType（error, feature, other）を受け付ける', () => {
      for (const type of ['error', 'feature', 'other']) {
        const result = validator.validate({
          contactType: type,
          title: 'テスト',
          contactContent: '内容',
        });
        // errorの場合はerrorReportDetails未指定でも基本バリデーションは通る
        expect(result.errors).not.toContain('お問い合わせ種別が不正です');
      }
    });
  });

  describe('validate - タイトル', () => {
    it('タイトルが空でエラーを返す', () => {
      const result = validator.validate({
        contactType: 'feature',
        title: '',
        contactContent: '内容',
      });
      expect(result.errors).toContain('タイトルを入力してください');
    });

    it('タイトルが空白のみでエラーを返す', () => {
      const result = validator.validate({
        contactType: 'feature',
        title: '   ',
        contactContent: '内容',
      });
      expect(result.errors).toContain('タイトルを入力してください');
    });

    it('タイトルが200文字超でエラーを返す', () => {
      const result = validator.validate({
        contactType: 'feature',
        title: 'あ'.repeat(201),
        contactContent: '内容',
      });
      expect(result.errors).toContain('タイトルは200文字以内で入力してください');
    });

    it('タイトルが200文字ちょうどはOK', () => {
      const result = validator.validate({
        contactType: 'feature',
        title: 'あ'.repeat(200),
        contactContent: '内容',
      });
      expect(result.errors).not.toContain('タイトルは200文字以内で入力してください');
    });
  });

  describe('validate - お問い合わせ内容', () => {
    it('内容が空でエラーを返す', () => {
      const result = validator.validate({
        contactType: 'feature',
        title: 'テスト',
        contactContent: '',
      });
      expect(result.errors).toContain('お問い合わせ内容を入力してください');
    });

    it('内容が5000文字超でエラーを返す', () => {
      const result = validator.validate({
        contactType: 'feature',
        title: 'テスト',
        contactContent: 'あ'.repeat(5001),
      });
      expect(result.errors).toContain('お問い合わせ内容は5000文字以内で入力してください');
    });
  });

  describe('validate - エラー報告詳細', () => {
    it('PC + Chrome の有効なエラー報告を受け付ける', () => {
      const result = validator.validate({
        contactType: 'error',
        title: 'バグ報告',
        contactContent: '表示がおかしい',
        errorReportDetails: {
          deviceType: 'PC',
          pcOS: 'Mac',
          browser: 'Chrome',
        },
      });
      expect(result.isValid).toBe(true);
    });

    it('SP でsmartphoneTypeとspOSが未指定でエラーを返す', () => {
      const result = validator.validate({
        contactType: 'error',
        title: 'バグ報告',
        contactContent: '表示がおかしい',
        errorReportDetails: {
          deviceType: 'SP',
          browser: 'Safari',
        },
      });
      expect(result.errors).toContain('スマホのOSを選択してください');
      expect(result.errors).toContain('スマホの種類を選択してください');
    });

    it('PC でpcOSが未指定でエラーを返す', () => {
      const result = validator.validate({
        contactType: 'error',
        title: 'バグ報告',
        contactContent: '表示がおかしい',
        errorReportDetails: {
          deviceType: 'PC',
          browser: 'Chrome',
        },
      });
      expect(result.errors).toContain('OSを選択してください');
    });

    it('不正なdeviceTypeでエラーを返す', () => {
      const result = validator.validate({
        contactType: 'error',
        title: 'バグ報告',
        contactContent: '表示がおかしい',
        errorReportDetails: {
          deviceType: 'INVALID',
          browser: 'Chrome',
        },
      });
      expect(result.errors).toContain('デバイスタイプが不正です');
    });

    it('不正なbrowserTypeでエラーを返す', () => {
      const result = validator.validate({
        contactType: 'error',
        title: 'バグ報告',
        contactContent: '表示がおかしい',
        errorReportDetails: {
          deviceType: 'PC',
          pcOS: 'Mac',
          browser: 'INVALID',
        },
      });
      expect(result.errors).toContain('ブラウザが不正です');
    });

    it('全ブラウザタイプが有効として受け付けられる', () => {
      const browsers = ['Chrome', 'Firefox', 'Safari', 'Arc', 'Comet', 'Dia', 'other'];
      for (const browser of browsers) {
        const result = validator.validate({
          contactType: 'error',
          title: 'バグ報告',
          contactContent: '表示がおかしい',
          errorReportDetails: {
            deviceType: 'PC',
            pcOS: 'Mac',
            browser,
          },
        });
        expect(result.errors).not.toContain('ブラウザが不正です');
      }
    });
  });

  describe('validate - 複数エラーの同時検出', () => {
    it('複数のバリデーションエラーを同時に返す', () => {
      const result = validator.validate({
        contactType: 'invalid',
        title: '',
        contactContent: '',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });
});
