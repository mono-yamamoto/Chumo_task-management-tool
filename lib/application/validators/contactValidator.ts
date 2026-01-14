/**
 * Contact Validation Logic
 * Encapsulates validation rules for contact/error reporting
 */

import {
  ContactType,
  ErrorReportDetails,
  DeviceType,
  PCOSType,
  SPOSType,
  SmartphoneType,
  BrowserType,
} from '@/types';

export interface ContactRequestData {
  type: ContactType;
  title: string;
  content?: string;
  errorReportDetails?: ErrorReportDetails;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * コンタクトリクエストのバリデーター
 */
export class ContactValidator {
  /**
   * コンタクトリクエストデータをバリデーション
   */
  validate(data: any): ValidationResult {
    const errors: string[] = [];

    // 基本フィールドのバリデーション
    if (!data.type || !data.title) {
      errors.push('type、titleは必須です');
      return { isValid: false, errors };
    }

    // エラー報告以外の場合、contentは必須
    if (data.type !== 'error' && !data.content) {
      errors.push('contentは必須です');
    }

    // エラー報告の場合、errorReportDetailsは必須
    if (data.type === 'error' && !data.errorReportDetails) {
      errors.push('エラー報告の場合、詳細情報は必須です');
    }

    // エラー報告の詳細バリデーション
    if (data.type === 'error' && data.errorReportDetails) {
      const detailErrors = this.validateErrorReportDetails(data.errorReportDetails);
      errors.push(...detailErrors);
    }

    // typeの値チェック
    if (!['error', 'feature', 'other'].includes(data.type)) {
      errors.push('無効なtypeです');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * エラー報告詳細のバリデーション
   */
  private validateErrorReportDetails(details: any): string[] {
    const errors: string[] = [];

    if (!details.issue || !details.issue.trim()) {
      errors.push('事象は必須です');
    }

    if (!details.reproductionSteps || !details.reproductionSteps.trim()) {
      errors.push('再現方法は必須です');
    }

    if (!details.environment) {
      errors.push('環境情報は必須です');
      return errors;
    }

    const env = details.environment;

    if (!env.device) {
      errors.push('デバイス（PC/SP）は必須です');
    }

    if (!env.os) {
      errors.push(env.device === 'SP' ? 'スマホの種類は必須です' : 'OSは必須です');
    }

    if (!env.browser) {
      errors.push('ブラウザは必須です');
    }

    if (!env.browserVersion || !env.browserVersion.trim()) {
      errors.push('ブラウザのバージョンは必須です');
    }

    if (env.device === 'SP' && (!env.osVersion || !env.osVersion.trim())) {
      errors.push('スマホのバージョンは必須です');
    }

    return errors;
  }

  /**
   * 型安全なContactRequestDataを返す
   */
  parse(data: any): ContactRequestData {
    return {
      type: data.type as ContactType,
      title: data.title,
      content: data.content,
      errorReportDetails: data.errorReportDetails,
    };
  }
}
