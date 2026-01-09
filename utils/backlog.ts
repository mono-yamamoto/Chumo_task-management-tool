/**
 * バックログ関連のユーティリティ関数
 */

import { PROJECT_TYPES, ProjectType } from '@/constants/projectTypes';

/**
 * タイトルから課題番号を抽出する
 * 例: "BRGREG-2905 【井坂】SA-net用情報資材アップの依頼について_自動車" → "BRGREG-2905"
 * 例: "REG2017-2229 【鴨志田】火災_登記情報のオンライン取得サービス メンテナンス期間更新" → "REG2017-2229"
 *
 * @param title タスクのタイトル
 * @returns 課題番号（見つからない場合はnull）
 */
export function extractIssueKeyFromTitle(title: string): string | null {
  if (!title) return null;

  // 課題番号のパターン: 英数字とハイフン、その後に数字
  // 例: BRGREG-2905, REG2017-2229
  const issueKeyPattern = /^([A-Z0-9]+-\d+)/;
  const match = title.match(issueKeyPattern);

  return match ? match[1] : null;
}

/**
 * 課題番号からバックログURLを生成する
 *
 * @param issueKey 課題番号（例: "BRGREG-2905", "REG2017-2229"）
 * @returns バックログURL
 */
export function generateBacklogUrl(issueKey: string): string {
  const baseUrl = 'https://ss-pj.jp/backlog/view';
  return `${baseUrl}/${issueKey}`;
}

/**
 * タイトルからバックログURLを生成する
 * タイトルに課題番号が含まれている場合のみURLを生成
 *
 * @param title タスクのタイトル
 * @returns バックログURL（課題番号が見つからない場合はnull）
 */
export function generateBacklogUrlFromTitle(title: string): string | null {
  const issueKey = extractIssueKeyFromTitle(title);
  if (!issueKey) return null;
  return generateBacklogUrl(issueKey);
}

/**
 * クリップボードから貼り付けたテキストから、タイトルとバックログURLを抽出する
 * バックログのコピー機能でクリップボードに保存された形式を想定
 *
 * @param clipboardText クリップボードから貼り付けたテキスト
 * @returns タイトルとURLを含むオブジェクト（見つからない場合はnull）
 */
export function parseBacklogClipboard(clipboardText: string): {
  title: string;
  url: string;
} | null {
  if (!clipboardText) return null;

  // バックログURLのパターン
  const backlogUrlPattern = /https:\/\/ss-pj\.jp\/backlog\/view\/[A-Z0-9-]+/i;
  const urlMatch = clipboardText.match(backlogUrlPattern);

  if (!urlMatch) return null;

  const url = urlMatch[0];

  // URLを除いた部分をタイトルとして抽出
  // 改行区切りの場合、URLの前の行がタイトルの可能性が高い
  const lines = clipboardText.split(/\r?\n/);
  let title = '';

  // URLが含まれている行を探す
  const urlLineIndex = lines.findIndex((line) => line.includes(url));
  if (urlLineIndex > 0) {
    // URLの前の行をタイトルとして使用
    title = lines[urlLineIndex - 1].trim();
  } else if (urlLineIndex === 0 && lines.length > 1) {
    // URLが最初の行にある場合、次の行をタイトルとして使用
    title = lines[1].trim();
  } else {
    // 改行がない場合、URLを除いた部分をタイトルとして使用
    title = clipboardText.replace(url, '').trim();
  }

  // タイトルが空の場合は、URLから課題番号を抽出してタイトルとして使用
  if (!title) {
    const issueKeyMatch = url.match(/\/view\/([A-Z0-9-]+)/i);
    if (issueKeyMatch) {
      title = issueKeyMatch[1];
    } else {
      return null;
    }
  }

  return { title, url };
}

/**
 * タイトルからプロジェクトタイプを抽出する
 * 課題番号のパターンからプロジェクト名を抽出し、PROJECT_TYPESに一致するものを返す
 * 最初の半角スペースまでを対象とする
 * 例: "BRGREG-2905 【井坂】..." → "BRGREG"
 * 例: "REG2017-2229 【鴨志田】..." → "REG2017"
 *
 * @param title タスクのタイトル
 * @returns プロジェクトタイプ（見つからない場合はnull）
 */
export function extractProjectTypeFromTitle(title: string): ProjectType | null {
  if (!title) return null;

  // 最初の半角スペースまでの部分を取得
  const firstSpaceIndex = title.indexOf(' ');
  const targetText = firstSpaceIndex > 0 ? title.substring(0, firstSpaceIndex) : title;

  // 課題番号のパターンからプロジェクト名を抽出
  // 例: BRGREG-2905 → BRGREG, REG2017-2229 → REG2017
  const issueKeyPattern = /^([A-Z0-9_]+)-\d+/;
  const match = targetText.match(issueKeyPattern);

  if (!match) return null;

  const projectName = match[1];

  // PROJECT_TYPESに一致するか確認
  if (PROJECT_TYPES.includes(projectName as ProjectType)) {
    return projectName as ProjectType;
  }

  return null;
}
