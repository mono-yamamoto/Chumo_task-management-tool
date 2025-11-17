import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Timestamp } from 'firebase-admin/firestore';
import {
  ContactType, ErrorReportDetails, DeviceType, PCOSType, SPOSType, SmartphoneType, BrowserType,
} from '@/types';

export async function POST(request: NextRequest) {
  try {
    // 認証トークンを取得
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];

    // Firebase Admin SDKでトークンを検証
    // Firebase Admin Appを初期化（まだ初期化されていない場合）
    if (getApps().length === 0) {
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'chumo-3506a';
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (clientEmail && privateKey) {
        initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      } else {
        initializeApp({
          projectId,
        });
      }
    }

    const auth = getAuth();
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ error: '無効な認証トークンです' }, { status: 401 });
    }

    const userId = decodedToken.uid;

    // リクエストボディを取得（エラーハンドリングで使用するため変数に保存）
    let body: any;
    try {
      body = await request.json();
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return NextResponse.json(
        { error: 'リクエストボディの解析に失敗しました' },
        { status: 400 },
      );
    }
    const {
      type, title, content, errorReportDetails,
    } = body;

    // デバッグ用ログ（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      console.debug('Received contact data:', JSON.stringify({
        type, title, content: content?.substring(0, 100), errorReportDetails,
      }, null, 2));
    }

    // バリデーション
    if (!type || !title) {
      return NextResponse.json(
        { error: 'type、titleは必須です' },
        { status: 400 },
      );
    }

    // エラー報告以外の場合、contentは必須
    if (type !== 'error' && !content) {
      return NextResponse.json(
        { error: 'contentは必須です' },
        { status: 400 },
      );
    }

    // エラー報告の場合、errorReportDetailsは必須
    if (type === 'error' && !errorReportDetails) {
      return NextResponse.json(
        { error: 'エラー報告の場合、詳細情報は必須です' },
        { status: 400 },
      );
    }

    // エラー報告の場合、バリデーション
    if (type === 'error' && errorReportDetails) {
      if (!errorReportDetails.environment) {
        return NextResponse.json(
          { error: '環境情報は必須です' },
          { status: 400 },
        );
      }

      const env = errorReportDetails.environment;

      if (!env.device) {
        return NextResponse.json(
          { error: 'デバイス（PC/SP）は必須です' },
          { status: 400 },
        );
      }

      if (!env.os) {
        return NextResponse.json(
          { error: env.device === 'SP' ? 'スマホの種類は必須です' : 'OSは必須です' },
          { status: 400 },
        );
      }

      if (!env.browser) {
        return NextResponse.json(
          { error: 'ブラウザは必須です' },
          { status: 400 },
        );
      }

      if (!env.browserVersion || !env.browserVersion.trim()) {
        return NextResponse.json(
          { error: 'ブラウザのバージョンは必須です' },
          { status: 400 },
        );
      }

      if (env.device === 'SP' && (!env.osVersion || !env.osVersion.trim())) {
        return NextResponse.json(
          { error: 'スマホのバージョンは必須です' },
          { status: 400 },
        );
      }
    }

    if (!['error', 'feature', 'other'].includes(type)) {
      return NextResponse.json(
        { error: '無効なtypeです' },
        { status: 400 },
      );
    }

    // adminDbの初期化確認とログ
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'chumo-3506a';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    console.debug('Firebase Admin initialization check:', {
      projectId,
      hasClientEmail: !!clientEmail,
      hasPrivateKey: !!privateKey,
      clientEmail: clientEmail ? `${clientEmail.substring(0, 10)}...` : 'not set',
      appsCount: getApps().length,
      adminDbExists: !!adminDb,
    });

    let db = adminDb;

    // 認証情報が設定されている場合、既存のアプリを削除して再初期化を試みる
    // （認証情報なしで初期化されている可能性があるため）
    if (clientEmail && privateKey && getApps().length > 0) {
      // 既存のアプリを削除して再初期化
      try {
        const existingApps = getApps();
        if (existingApps.length > 0) {
          console.debug('Reinitializing Firebase Admin with credentials (existing app found)');
          // 既存のアプリを削除（型アサーションを使用）
          for (const app of existingApps) {
            try {
              (app as any).delete();
            } catch (deleteError) {
              // 削除エラーは無視
            }
          }
          // 少し待ってから再初期化
          await new Promise<void>((resolve) => {
            setTimeout(() => {
              resolve();
            }, 100);
          });
          // 認証情報付きで再初期化
          initializeApp({
            credential: cert({
              projectId,
              clientEmail,
              privateKey,
            }),
          });
          const { getFirestore } = await import('firebase-admin/firestore');
          db = getFirestore();
          console.info('Firebase Admin reinitialized successfully');
        }
      } catch (reinitError: any) {
        console.error('Failed to reinitialize Firebase Admin:', reinitError);
        // エラーが発生した場合、既存のadminDbを使用するか、新しく作成
        if (reinitError.code === 'app/duplicate-app') {
          console.debug('App already exists, using existing app');
          // 既存のアプリを使用
          const { getFirestore } = await import('firebase-admin/firestore');
          db = getFirestore();
        }
      }
    }

    if (!db) {
      console.error('adminDb is undefined - attempting to initialize');
      // adminDbが未初期化の場合、再度初期化を試みる
      if (getApps().length === 0) {
        if (clientEmail && privateKey) {
          console.debug('Initializing Firebase Admin with credentials');
          initializeApp({
            credential: cert({
              projectId,
              clientEmail,
              privateKey,
            }),
          });
        } else {
          console.error('FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are not set.');
          return NextResponse.json(
            { error: 'Firebase Admin SDKの初期化に失敗しました。環境変数FIREBASE_CLIENT_EMAILとFIREBASE_PRIVATE_KEYが設定されているか確認してください。' },
            { status: 500 },
          );
        }
      }

      const { getFirestore } = await import('firebase-admin/firestore');
      db = getFirestore();

      if (!db) {
        console.error('Failed to initialize Firestore');
        return NextResponse.json(
          { error: 'データベースに接続できません' },
          { status: 500 },
        );
      }
    } else if (!clientEmail || !privateKey) {
      // adminDbが既に初期化されている場合でも、認証情報が設定されているか確認
      console.warn('adminDb is initialized but FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY is not set. This may cause permission errors.');
    }

    // dbを使用するように変更
    const firestoreDb = db;

    // 認証情報の確認（デバッグ用）
    // テストクエリをスキップして、直接ユーザー情報を取得してみる
    // （テストクエリが権限エラーを引き起こす可能性があるため）
    console.debug('Skipping connection test, proceeding directly to user lookup');

    // ユーザー情報を取得
    const userDoc = await firestoreDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    const userData = userDoc.data();
    if (!userData) {
      return NextResponse.json({ error: 'ユーザーデータが見つかりません' }, { status: 404 });
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
      type: type as ContactType,
      title: title.trim(),
      content: content?.trim() || '',
      userId,
      userName: userData.displayName || userData.email || '不明',
      userEmail: userData.email || '',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    // エラー報告の場合、詳細情報を追加
    if (type === 'error' && errorReportDetails) {
      try {
        console.debug('Processing errorReportDetails:', JSON.stringify(errorReportDetails, null, 2));

        // errorReportDetailsを検証して、正しい形式に変換
        if (!errorReportDetails.environment) {
          console.error('errorReportDetails.environment is missing');
          return NextResponse.json(
            { error: '環境情報が不足しています' },
            { status: 400 },
          );
        }

        const validatedErrorDetails: ErrorReportDetails = {
          issue: String(errorReportDetails.issue || ''),
          reproductionSteps: String(errorReportDetails.reproductionSteps || ''),
          environment: {
            device: String(errorReportDetails.environment.device || '') as DeviceType,
            os: String(errorReportDetails.environment.os || '') as PCOSType | SPOSType | SmartphoneType,
            browser: String(errorReportDetails.environment.browser || '') as BrowserType,
            browserVersion: String(errorReportDetails.environment.browserVersion || ''),
          },
        };

        // osVersionが存在する場合のみ追加
        if (errorReportDetails.environment.osVersion && typeof errorReportDetails.environment.osVersion === 'string') {
          const trimmedVersion = errorReportDetails.environment.osVersion.trim();
          if (trimmedVersion) {
            validatedErrorDetails.environment.osVersion = trimmedVersion;
          }
        }

        // screenshotUrlが存在する場合のみ追加
        if (errorReportDetails.screenshotUrl && typeof errorReportDetails.screenshotUrl === 'string') {
          const trimmedUrl = errorReportDetails.screenshotUrl.trim();
          if (trimmedUrl) {
            validatedErrorDetails.screenshotUrl = trimmedUrl;
          }
        }

        console.debug('Validated errorReportDetails:', JSON.stringify(validatedErrorDetails, null, 2));
        contactData.errorReportDetails = validatedErrorDetails;
      } catch (validationError) {
        console.error('Error validating errorReportDetails:', validationError);
        console.error('errorReportDetails:', JSON.stringify(errorReportDetails, null, 2));
        console.error('validationError stack:', validationError instanceof Error ? validationError.stack : 'No stack trace');
        return NextResponse.json(
          { error: 'エラー報告の詳細情報の検証に失敗しました', details: validationError instanceof Error ? validationError.message : String(validationError) },
          { status: 400 },
        );
      }
    }

    // Firestoreに保存
    let contactId: string;
    try {
      // firestoreDbの確認
      if (!firestoreDb) {
        console.error('firestoreDb is undefined');
        return NextResponse.json(
          { error: 'データベースに接続できません' },
          { status: 500 },
        );
      }

      // デバッグ用ログ（Timestampを除外して表示）
      const debugData = {
        ...contactData,
        createdAt: contactData.createdAt.toDate().toISOString(),
        updatedAt: contactData.updatedAt.toDate().toISOString(),
      };
      console.debug('Saving contact data to Firestore:', JSON.stringify(debugData, null, 2));

      // contactDataの構造を確認
      console.debug('contactData type:', typeof contactData);
      console.debug('contactData.createdAt type:', typeof contactData.createdAt);
      console.debug('contactData.createdAt instanceof Timestamp:', contactData.createdAt instanceof Timestamp);

      const contactRef = await firestoreDb.collection('contacts').add(contactData);
      contactId = contactRef.id;
      console.info('Contact saved successfully with ID:', contactId);
    } catch (firestoreError) {
      console.error('Firestore save error:', firestoreError);
      console.error('Firestore error details:', firestoreError instanceof Error ? firestoreError.message : String(firestoreError));
      console.error('Firestore error stack:', firestoreError instanceof Error ? firestoreError.stack : 'No stack trace');
      console.error('contactData structure:', {
        type: typeof contactData,
        keys: Object.keys(contactData),
        createdAtType: typeof contactData.createdAt,
        updatedAtType: typeof contactData.updatedAt,
      });
      throw firestoreError;
    }

    // GitHub issue作成のCloud Functionを呼び出し
    try {
      const functionsUrl = process.env.NEXT_PUBLIC_FUNCTIONS_URL || '';
      const createIssueUrl = `${functionsUrl}/createContactIssue`;

      console.debug('Calling GitHub issue creation function:', createIssueUrl);
      console.debug('Request body:', JSON.stringify({
        contactId,
        type,
        title,
        content: content.substring(0, 100),
        userName: contactData.userName,
        userEmail: contactData.userEmail,
        hasErrorReportDetails: !!contactData.errorReportDetails,
      }, null, 2));

      const issueResponse = await fetch(createIssueUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactId,
          type,
          title,
          content,
          userName: contactData.userName,
          userEmail: contactData.userEmail,
          errorReportDetails: contactData.errorReportDetails,
        }),
      });

      console.debug('GitHub issue creation response status:', issueResponse.status);

      if (issueResponse.ok) {
        const issueData = await issueResponse.json();
        console.info('GitHub issue created successfully:', issueData);
        if (issueData.url) {
          // GitHub issue URLを保存
          await firestoreDb.collection('contacts').doc(contactId).update({
            githubIssueUrl: issueData.url,
            updatedAt: Timestamp.now(),
          });
          console.info('GitHub issue URL saved to Firestore');
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
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      // GitHub issue作成に失敗してもお問い合わせは保存済みなので続行
    }

    return NextResponse.json({
      success: true,
      contactId,
    });
  } catch (error) {
    console.error('Contact API error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    return NextResponse.json(
      {
        error: 'お問い合わせの送信に失敗しました',
        details: error instanceof Error ? error.message : String(error),
        // 開発環境のみ詳細情報を返す
        ...(process.env.NODE_ENV === 'development' && {
          stack: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status: 500 },
    );
  }
}
