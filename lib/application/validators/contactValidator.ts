import { ContactType, DeviceType, BrowserType } from '@/types';
import { CreateContactRequestDTO } from '@/lib/presentation/dtos/contact.dto';

/**
 * バリデーション結果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * お問い合わせバリデーター
 */
export class ContactValidator {
  /**
   * お問い合わせリクエストをバリデーション
   */
  validate(data: unknown): ValidationResult {
    const errors: string[] = [];

    // データが存在するか
    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        errors: ['リクエストデータが不正です'],
      };
    }

    const request = data as Partial<CreateContactRequestDTO>;

    // contactTypeの検証
    if (!request.contactType) {
      errors.push('お問い合わせ種別を選択してください');
    } else if (!this.isValidContactType(request.contactType)) {
      errors.push('お問い合わせ種別が不正です');
    }

    // titleの検証
    if (typeof request.title !== 'string' || request.title.trim() === '') {
      errors.push('タイトルを入力してください');
    } else if (request.title.length > 200) {
      errors.push('タイトルは200文字以内で入力してください');
    }

    // contactContentの検証
    if (
      typeof request.contactContent !== 'string' ||
      request.contactContent.trim() === ''
    ) {
      errors.push('お問い合わせ内容を入力してください');
    } else if (request.contactContent.length > 5000) {
      errors.push('お問い合わせ内容は5000文字以内で入力してください');
    }

    // エラー報告の場合の追加検証
    if (request.contactType === 'error' && request.errorReportDetails) {
      const detailErrors = this.validateErrorReportDetails(
        request.errorReportDetails
      );
      errors.push(...detailErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * エラー報告詳細のバリデーション
   */
  private validateErrorReportDetails(
    details: CreateContactRequestDTO['errorReportDetails']
  ): string[] {
    const errors: string[] = [];

    if (!details) {
      return errors;
    }

    // deviceTypeの検証
    if (!details.deviceType) {
      errors.push('デバイスタイプを選択してください');
    } else if (!this.isValidDeviceType(details.deviceType)) {
      errors.push('デバイスタイプが不正です');
    }

    // browserの検証
    if (!details.browser) {
      errors.push('ブラウザを選択してください');
    } else if (!this.isValidBrowserType(details.browser)) {
      errors.push('ブラウザが不正です');
    }

    // PCの場合、pcOSの検証
    if (details.deviceType === 'PC' && !details.pcOS) {
      errors.push('OSを選択してください');
    }

    // スマホの場合、spOSとsmartphoneTypeの検証
    if (details.deviceType === 'SP') {
      if (!details.spOS) {
        errors.push('スマホのOSを選択してください');
      }
      if (!details.smartphoneType) {
        errors.push('スマホの種類を選択してください');
      }
    }

    return errors;
  }

  /**
   * ContactTypeの検証
   */
  private isValidContactType(type: string): type is ContactType {
    const validTypes: ContactType[] = ['error', 'feature', 'other'];
    return validTypes.includes(type as ContactType);
  }

  /**
   * DeviceTypeの検証
   */
  private isValidDeviceType(type: string): type is DeviceType {
    const validTypes: DeviceType[] = ['PC', 'SP'];
    return validTypes.includes(type as DeviceType);
  }

  /**
   * BrowserTypeの検証
   */
  private isValidBrowserType(type: string): type is BrowserType {
    const validTypes: BrowserType[] = ['Chrome', 'Firefox', 'Safari', 'Arc', 'Comet', 'Dia', 'other'];
    return validTypes.includes(type as BrowserType);
  }
}
