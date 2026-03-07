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
