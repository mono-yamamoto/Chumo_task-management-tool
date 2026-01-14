import {
  ContactType,
  DeviceType,
  PCOSType,
  SPOSType,
  SmartphoneType,
  BrowserType,
} from '@/types';

/**
 * お問い合わせ作成リクエストDTO
 */
export interface CreateContactRequestDTO {
  contactType: ContactType;
  title: string;
  contactContent: string;
  errorReportDetails?: ErrorReportDetailsDTO;
}

/**
 * エラー報告詳細DTO
 */
export interface ErrorReportDetailsDTO {
  errorMessage?: string;
  deviceType: DeviceType;
  pcOS?: PCOSType;
  spOS?: SPOSType;
  smartphoneType?: SmartphoneType;
  browser: BrowserType;
}

/**
 * お問い合わせ作成レスポンスDTO
 */
export interface CreateContactResponseDTO {
  success: boolean;
  contactId: string;
  message?: string;
}
