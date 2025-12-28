export class HttpError extends Error {
  status: number;
  statusText: string;
  details?: Record<string, unknown>;

  constructor(message: string, status: number, statusText: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.details = details;
  }
}

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
