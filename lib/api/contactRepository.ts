import { apiClient } from '@/lib/http/apiClient';
import { Contact } from '@/types';
import { parseDateRequired } from './dateUtils';

type GetToken = () => Promise<string | null>;

type ContactRaw = Omit<Contact, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

function mapContact(raw: ContactRaw): Contact {
  return {
    ...raw,
    createdAt: parseDateRequired(raw.createdAt),
    updatedAt: parseDateRequired(raw.updatedAt),
  };
}

export async function fetchContactsByStatus(
  status: 'pending' | 'resolved',
  getToken: GetToken
): Promise<Contact[]> {
  const data = await apiClient<{ contacts: ContactRaw[] }>(`/api/contact?status=${status}`, {
    getToken,
  });
  return data.contacts.map(mapContact);
}

export async function updateContactStatus(
  contactId: string,
  status: 'pending' | 'resolved',
  getToken: GetToken
): Promise<void> {
  await apiClient(`/api/contact/${contactId}`, {
    method: 'PUT',
    body: { status },
    getToken,
  });
}
