/**
 * Cloud Functions URL管理ユーティリティ
 * Firebase Functions v2では各関数に個別のURLが割り当てられるため、
 * 各関数のURLを環境変数として定義します。
 */

/**
 * 環境変数から関数URLを取得
 * 環境変数が設定されていない場合は、フォールバックURLを使用
 */
function getFunctionUrl(functionName: string, fallbackUrl: string): string {
  const envVarName = `NEXT_PUBLIC_FUNCTION_${functionName.toUpperCase()}_URL`;
  const envUrl = process.env[envVarName];
  if (envUrl) {
    return envUrl;
  }
  return fallbackUrl;
}

/**
 * タイマー開始関数のURLを取得
 */
export function getStartTimerUrl(): string {
  return getFunctionUrl('startTimer', 'https://starttimer-zbk3yr5vta-uc.a.run.app');
}

/**
 * タイマー停止関数のURLを取得
 */
export function getStopTimerUrl(): string {
  return getFunctionUrl('stopTimer', 'https://stoptimer-zbk3yr5vta-uc.a.run.app');
}

/**
 * Driveフォルダ作成関数のURLを取得
 */
export function getCreateDriveFolderUrl(): string {
  return getFunctionUrl('createDriveFolder', 'https://createdrivefolder-zbk3yr5vta-uc.a.run.app');
}

/**
 * Fire Issue作成関数のURLを取得
 */
export function getCreateFireIssueUrl(): string {
  return getFunctionUrl('createFireIssue', 'https://createfireissue-zbk3yr5vta-uc.a.run.app');
}

/**
 * Google Chatスレッド作成関数のURLを取得
 */
export function getCreateGoogleChatThreadUrl(): string {
  return getFunctionUrl(
    'createGoogleChatThread',
    'https://creategooglechatthread-zbk3yr5vta-uc.a.run.app'
  );
}

/**
 * タイムレポート取得関数のURLを取得
 */
export function getTimeReportUrl(): string {
  return getFunctionUrl('getTimeReport', 'https://gettimereport-zbk3yr5vta-uc.a.run.app');
}

/**
 * タイムレポートCSVエクスポート関数のURLを取得
 */
export function getExportTimeReportCsvUrl(): string {
  return getFunctionUrl('exportTimeReportCsv', 'https://exporttimereportcsv-zbk3yr5vta-uc.a.run.app');
}

