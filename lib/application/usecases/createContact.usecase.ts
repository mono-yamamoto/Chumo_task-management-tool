import { Timestamp } from 'firebase-admin/firestore';
import {
  CreateContactRequestDTO,
  CreateContactResponseDTO,
} from '@/lib/presentation/dtos/contact.dto';
import { ContactType, ErrorReportDetails } from '@/types';
import { adminDb } from '@/lib/firebase/admin';

/**
 * お問い合わせ作成UseCase
 */
export class CreateContactUseCase {
  /**
   * お問い合わせを作成
   */
  async execute(
    request: CreateContactRequestDTO,
    userId: string,
    userEmail: string,
    userName: string
  ): Promise<CreateContactResponseDTO> {
    const db = adminDb;
    if (!db) {
      throw new Error('データベースに接続できません');
    }

    // お問い合わせデータを作成
    const now = Timestamp.now();
    const contactData: {
      type: ContactType;
      title: string;
      content: string;
      userId: string;
      userName: string;
      userEmail: string;
      errorReportDetails?: ErrorReportDetails;
      status: 'pending';
      createdAt: Timestamp;
      updatedAt: Timestamp;
    } = {
      type: request.contactType,
      title: request.title.trim(),
      content: request.contactContent.trim(),
      userId,
      userName,
      userEmail,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    // エラー報告の場合、詳細情報を追加
    if (request.contactType === 'エラー報告' && request.errorReportDetails) {
      const details = request.errorReportDetails;
      contactData.errorReportDetails = {
        issue: details.errorMessage || '',
        reproductionSteps: '', // フロントエンドから送られる場合は追加
        environment: {
          device: details.deviceType,
          os: (details.pcOS || details.spOS || details.smartphoneType) as any,
          browser: details.browser,
          browserVersion: '', // フロントエンドから送られる場合は追加
        },
      };
    }

    // Firestoreに保存
    const contactRef = await db.collection('contacts').add(contactData);
    const contactId = contactRef.id;

    // GitHub issue作成のCloud Functionを呼び出し
    await this.createGitHubIssue(contactId, contactData);

    return {
      success: true,
      contactId,
      message: 'お問い合わせを受け付けました',
    };
  }

  /**
   * GitHub issue作成
   */
  private async createGitHubIssue(
    contactId: string,
    contactData: {
      type: ContactType;
      title: string;
      content: string;
      userName: string;
      userEmail: string;
      errorReportDetails?: ErrorReportDetails;
    }
  ): Promise<void> {
    try {
      const functionsUrl = process.env.NEXT_PUBLIC_FUNCTIONS_URL || '';
      const createIssueUrl = `${functionsUrl}/createContactIssue`;

      const issueResponse = await fetch(createIssueUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactId,
          type: contactData.type,
          title: contactData.title,
          content: contactData.content,
          userName: contactData.userName,
          userEmail: contactData.userEmail,
          errorReportDetails: contactData.errorReportDetails,
        }),
      });

      if (issueResponse.ok) {
        const issueData = await issueResponse.json();
        if (issueData.url) {
          // GitHub issue URLを保存
          await adminDb?.collection('contacts').doc(contactId).update({
            githubIssueUrl: issueData.url,
            updatedAt: Timestamp.now(),
          });
        }
      } else {
        const errorText = await issueResponse.text();
        console.error('GitHub issue creation failed:', {
          status: issueResponse.status,
          statusText: issueResponse.statusText,
          body: errorText,
        });
      }
    } catch (error) {
      console.error('GitHub issue作成エラー:', error);
      // GitHub issue作成に失敗してもお問い合わせは保存済みなので続行
    }
  }
}
