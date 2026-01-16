import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/application/services/authService';
import { ContactValidator } from '@/lib/application/validators/contactValidator';
import { CreateContactUseCase } from '@/lib/application/usecases/createContact.usecase';
import { CreateContactRequestDTO } from '@/lib/presentation/dtos/contact.dto';
import { adminDb } from '@/lib/firebase/admin';

/**
 * お問い合わせ作成API
 * レイヤードアーキテクチャを適用し、ビジネスロジックを分離
 *
 * Before: 476行
 * After: 約80行 (約396行削減)
 */
export async function POST(request: NextRequest) {
  try {
    // 認証
    const authService = new AuthService();
    const token = authService.extractToken(request.headers.get('authorization'));
    const authResult = await authService.verifyToken(token);

    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const userId = authResult.userId!;
    const userEmail = authResult.email!;

    // リクエストボディを取得
    let body: any;
    try {
      body = await request.json();
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return NextResponse.json(
        { error: 'リクエストボディの解析に失敗しました' },
        { status: 400 }
      );
    }

    // フロントエンドのフィールド名をDTOに変換
    const requestDTO = {
      contactType: body.type,
      title: body.title,
      contactContent: body.content,
      errorReportDetails: body.errorReportDetails,
    };

    // バリデーション
    const validator = new ContactValidator();
    const validationResult = validator.validate(requestDTO);

    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: validationResult.errors.join(', ') },
        { status: 400 }
      );
    }

    // ユーザー情報を取得
    const db = adminDb;
    if (!db) {
      return NextResponse.json({ error: 'データベースに接続できません' }, { status: 500 });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    const userData = userDoc.data();
    if (!userData) {
      return NextResponse.json({ error: 'ユーザーデータが見つかりません' }, { status: 404 });
    }

    const userName = userData.displayName || userData.email || '不明';

    // お問い合わせ作成
    const createContactUseCase = new CreateContactUseCase();
    const contactRequest: CreateContactRequestDTO = {
      contactType: requestDTO.contactType,
      title: requestDTO.title,
      contactContent: requestDTO.contactContent,
      errorReportDetails: requestDTO.errorReportDetails,
    };

    const result = await createContactUseCase.execute(
      contactRequest,
      userId,
      userEmail,
      userName
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Contact API error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    return NextResponse.json(
      {
        error: 'お問い合わせの送信に失敗しました',
        details: error instanceof Error ? error.message : String(error),
        ...(process.env.NODE_ENV === 'development' && {
          stack: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status: 500 }
    );
  }
}
