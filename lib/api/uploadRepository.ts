type GetToken = () => Promise<string | null>;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

/**
 * ファイルをバックエンドR2にアップロードし、公開URLを返す
 */
export async function uploadFile(file: File, path: string, getToken: GetToken): Promise<string> {
  const token = await getToken();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', path);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || `Upload failed: ${response.status}`);
  }

  const data = (await response.json()) as { url: string; key: string };
  return data.url;
}
