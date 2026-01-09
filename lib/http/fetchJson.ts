/**
 * HTTP APIエラーを表現するカスタムエラークラス
 */
export class HttpError extends Error {
  status: number;
  statusText: string;
  details?: Record<string, unknown>;

  /**
   * HttpErrorを作成する
   * @param message エラーメッセージ
   * @param status HTTPステータスコード
   * @param statusText HTTPステータステキスト
   * @param details 追加のエラー詳細情報
   */
  constructor(
    message: string,
    status: number,
    statusText: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.details = details;
  }
}

/**
 * JSONレスポンスを返すHTTPリクエストを送信し、エラーハンドリングを行う
 * @template T レスポンスデータの型
 * @param input fetch APIのRequestInfo（URL または Request オブジェクト）
 * @param init fetch APIのRequestInit（オプションパラメータ）
 * @returns Promiseでラップされたレスポンスデータ
 * @throws {HttpError} HTTPエラーが発生した場合
 */
export async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    const errorMessage =
      (data as { error?: unknown }).error ||
      (data as { message?: unknown }).message ||
      `HTTP ${response.status}: ${response.statusText}`;
    throw new HttpError(String(errorMessage), response.status, response.statusText, data);
  }

  return data as T;
}
