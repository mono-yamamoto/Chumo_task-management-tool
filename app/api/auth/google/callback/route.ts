import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { adminDb } from "@/lib/firebase/admin";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  process.env.GOOGLE_OAUTH_REDIRECT_URI || `${process.env.NEXT_PUBLIC_FUNCTIONS_URL?.replace('/functions', '') || 'http://localhost:3000'}/api/auth/google/callback`
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // userId
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?error=oauth_error&message=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/settings?error=missing_params", request.url)
    );
  }

  try {
    // 認証コードをトークンに交換
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        new URL("/settings?error=no_refresh_token", request.url)
      );
    }

    // Firestoreにリフレッシュトークンを保存
    if (!adminDb) {
      throw new Error("Firestore Admin is not initialized");
    }

    const userId = state;
    console.log("Saving refresh token for userId:", userId);
    console.log("Refresh token length:", tokens.refresh_token?.length || 0);
    
    // ユーザードキュメントが存在するか確認
    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      console.error("User document does not exist for userId:", userId);
      return NextResponse.redirect(
        new URL("/settings?error=user_not_found", request.url)
      );
    }

    await adminDb.collection("users").doc(userId).update({
      googleRefreshToken: tokens.refresh_token,
      googleOAuthUpdatedAt: new Date(),
    });

    console.log("Refresh token saved successfully for userId:", userId);

    // 設定ページにリダイレクト（成功メッセージ付き）
    return NextResponse.redirect(
      new URL("/settings?success=oauth_connected", request.url)
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/settings?error=oauth_failed&message=${encodeURIComponent(error instanceof Error ? error.message : "Unknown error")}`,
        request.url
      )
    );
  }
}

