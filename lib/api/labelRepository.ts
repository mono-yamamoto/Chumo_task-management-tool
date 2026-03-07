import { apiClient } from '@/lib/http/apiClient';
import { Label } from '@/types';
import { parseDateRequired } from './dateUtils';

type GetToken = () => Promise<string | null>;

type LabelRaw = Omit<Label, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

function mapLabel(raw: LabelRaw): Label {
  return {
    ...raw,
    createdAt: parseDateRequired(raw.createdAt),
    updatedAt: parseDateRequired(raw.updatedAt),
  };
}

export async function fetchKubunLabels(getToken: GetToken): Promise<Label[]> {
  const data = await apiClient<{ labels: LabelRaw[] }>('/api/labels', { getToken });
  return data.labels.map(mapLabel);
}
