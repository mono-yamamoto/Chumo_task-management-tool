import { PROJECT_TYPES, type ProjectType } from '../types';

const BACKLOG_BASE_URL = 'https://ss-pj.jp/backlog/view';
const ISSUE_KEY_PATTERN = /^([A-Z0-9]+-\d+)/;
const BACKLOG_URL_PATTERN = /https:\/\/ss-pj\.jp\/backlog\/view\/[A-Z0-9-]+/i;
const ISSUE_KEY_FROM_URL_PATTERN = /\/view\/([A-Z0-9-]+)/i;
const PROJECT_TYPE_PATTERN = /^([A-Z0-9_]+)-\d+/;

/**
 * タイトルから課題番号を抽出する
 * 例: "BRGREG-2905 【井坂】..." → "BRGREG-2905"
 */
export function extractIssueKeyFromTitle(title: string): string | null {
  if (!title) return null;
  const match = title.match(ISSUE_KEY_PATTERN);
  return match?.[1] ?? null;
}

/**
 * 課題番号からバックログURLを生成する
 */
export function generateBacklogUrl(issueKey: string): string {
  return `${BACKLOG_BASE_URL}/${issueKey}`;
}

/**
 * タイトルからバックログURLを生成する
 */
export function generateBacklogUrlFromTitle(title: string): string | null {
  const issueKey = extractIssueKeyFromTitle(title);
  if (!issueKey) return null;
  return generateBacklogUrl(issueKey);
}

/**
 * クリップボードからバックログのタイトルとURLを抽出する
 */
export function parseBacklogClipboard(clipboardText: string): {
  title: string;
  url: string;
} | null {
  if (!clipboardText) return null;

  const urlMatch = clipboardText.match(BACKLOG_URL_PATTERN);
  if (!urlMatch) return null;

  const url = urlMatch[0];
  const lines = clipboardText.split(/\r?\n/);
  let title = '';

  const urlLineIndex = lines.findIndex((line) => line.includes(url));
  if (urlLineIndex > 0) {
    title = (lines[urlLineIndex - 1] ?? '').trim();
  } else if (urlLineIndex === 0 && lines.length > 1) {
    title = (lines[1] ?? '').trim();
  } else {
    title = clipboardText.replace(url, '').trim();
  }

  if (!title) {
    const issueKeyMatch = url.match(ISSUE_KEY_FROM_URL_PATTERN);
    if (issueKeyMatch?.[1]) {
      title = issueKeyMatch[1];
    } else {
      return null;
    }
  }

  return { title, url };
}

/**
 * タイトルからプロジェクトタイプを抽出する
 * 例: "BRGREG-2905 【井坂】..." → "BRGREG"
 */
export function extractProjectTypeFromTitle(title: string): ProjectType | null {
  if (!title) return null;

  const firstSpaceIndex = title.indexOf(' ');
  const targetText = firstSpaceIndex > 0 ? title.substring(0, firstSpaceIndex) : title;

  const match = targetText.match(PROJECT_TYPE_PATTERN);
  if (!match?.[1]) return null;

  const projectName = match[1];
  if ((PROJECT_TYPES as readonly string[]).includes(projectName)) {
    return projectName as ProjectType;
  }

  return null;
}
