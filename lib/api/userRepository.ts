import { apiClient } from '@/lib/http/apiClient';
import { User } from '@/types';
import { parseDateRequired } from './dateUtils';

type GetToken = () => Promise<string | null>;

type UserRaw = Omit<User, 'createdAt' | 'updatedAt' | 'googleOAuthUpdatedAt'> & {
  createdAt: string;
  updatedAt: string;
  googleOAuthUpdatedAt?: string;
};

function mapUser(raw: UserRaw): User {
  return {
    ...raw,
    createdAt: parseDateRequired(raw.createdAt),
    updatedAt: parseDateRequired(raw.updatedAt),
    googleOAuthUpdatedAt: raw.googleOAuthUpdatedAt
      ? parseDateRequired(raw.googleOAuthUpdatedAt)
      : undefined,
  };
}

export async function fetchAllUsers(getToken: GetToken): Promise<User[]> {
  const data = await apiClient<{ users: UserRaw[] }>('/api/users', { getToken });
  return data.users.map(mapUser);
}

export async function fetchMe(getToken: GetToken): Promise<User | null> {
  const data = await apiClient<{ user: UserRaw }>('/api/users/me', { getToken });
  return data.user ? mapUser(data.user) : null;
}

export async function fetchUser(userId: string, getToken: GetToken): Promise<User | null> {
  const data = await apiClient<{ user: UserRaw }>(`/api/users/${userId}`, { getToken });
  return data.user ? mapUser(data.user) : null;
}

export async function updateUser(
  userId: string,
  updates: {
    githubUsername?: string;
    chatId?: string | null;
    isAllowed?: boolean;
    googleRefreshToken?: string | null;
    googleOAuthUpdatedAt?: string | null;
  },
  getToken: GetToken
): Promise<User> {
  const data = await apiClient<{ user: UserRaw }>(`/api/users/${userId}`, {
    method: 'PUT',
    body: updates,
    getToken,
  });
  return mapUser(data.user);
}

export async function addFcmToken(fcmToken: string, getToken: GetToken): Promise<void> {
  await apiClient('/api/users/me/fcm-tokens', {
    method: 'POST',
    body: { token: fcmToken },
    getToken,
  });
}

export async function removeFcmToken(fcmToken: string, getToken: GetToken): Promise<void> {
  await apiClient('/api/users/me/fcm-tokens', {
    method: 'DELETE',
    body: { token: fcmToken },
    getToken,
  });
}
