/**
 * CreateContact UseCase
 * Encapsulates business logic for creating contact/error reports
 */

import { Contact, ContactType, ErrorReportDetails } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';

export interface CreateContactParams {
  type: ContactType;
  title: string;
  content?: string;
  errorReportDetails?: ErrorReportDetails;
  userId: string;
  userEmail: string;
  userName: string;
}

export interface CreateContactResult {
  contactId: string;
  githubIssueUrl?: string;
}

/**
 * コンタクト作成のビジネスロジックを実行するUseCase
 */
export class CreateContactUseCase {
  /**
   * コンタクトを作成
   */
  async execute(params: CreateContactParams): Promise<CreateContactResult> {
    // NOTE: This is a simplified version showing the architecture pattern
    // The actual implementation would include:
    // 1. Firestore への保存
    // 2. GitHub Issue の作成
    // 3. Google Chat への通知
    // など、既存のAPI Routeのロジックをここに移植

    // ビジネスロジックの例:
    // - エラー報告の場合はスクリーンショットURLの処理
    // - GitHub Issue作成のためのマークダウンフォーマット生成
    // - 通知の送信

    // 現時点では構造を示すためのプレースホルダー
    throw new Error('CreateContactUseCase.execute() is not fully implemented yet');
  }

  /**
   * GitHub Issue作成用のマークダウンを生成
   */
  private formatGitHubIssueBody(params: CreateContactParams): string {
    let body = `## 概要\n${params.title}\n\n`;

    if (params.type === 'error' && params.errorReportDetails) {
      const details = params.errorReportDetails;
      body += `## 事象\n${details.issue}\n\n`;
      body += `## 再現方法\n${details.reproductionSteps}\n\n`;
      body += `## 環境\n`;
      body += `- デバイス: ${details.environment.device}\n`;
      body += `- OS: ${details.environment.os}`;
      if (details.environment.osVersion) {
        body += ` (${details.environment.osVersion})`;
      }
      body += `\n`;
      body += `- ブラウザ: ${details.environment.browser} (${details.environment.browserVersion})\n`;

      if (details.screenshotUrl) {
        body += `\n## スクリーンショット\n![screenshot](${details.screenshotUrl})\n`;
      }
    } else if (params.content) {
      body += `## 詳細\n${params.content}\n\n`;
    }

    body += `\n---\n報告者: ${params.userName} (${params.userEmail})`;

    return body;
  }
}
