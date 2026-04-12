import { PREVIEW_TOKEN_KEY, PREVIEW_ENABLED } from '../hooks/usePreviewMode';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export class HttpError extends Error {
  status: number;
  statusText: string;
  details?: Record<string, unknown>;

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
 * Clerk トークン付きで Hono API にリクエストを送信する
 * getToken は useAuth().getToken から渡す
 */
export async function apiClient<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    getToken: () => Promise<string | null>;
  }
): Promise<T> {
  const token = await options.getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (PREVIEW_ENABLED) {
    const previewToken = localStorage.getItem(PREVIEW_TOKEN_KEY);
    if (previewToken) {
      headers['X-Preview-Token'] = previewToken;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

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
