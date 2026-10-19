import type { KnowledgeItem } from '../types';

import { apiFetch } from '../../../lib/apiClient';
async function parseOrThrow<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}

export async function fetchKnowledgeItems(): Promise<KnowledgeItem[]> {
  const res = await apiFetch('/api/knowledge-engine');
  const { items } = await parseOrThrow<{ items: KnowledgeItem[] }>(res);
  return items;
}

export interface OldLink {
  kind: string
  id: string
  title: string
  status: string
  where: string
  url: string
}

// Places that still point at the old Wix site (read-only check).
export async function fetchOldLinks(): Promise<OldLink[]> {
  const res = await apiFetch('/api/knowledge-engine?check=old-links');
  const { found } = await parseOrThrow<{ found: OldLink[] }>(res);
  return found;
}

export async function createKnowledgeItem(item: Omit<KnowledgeItem, 'id' | 'lastUpdated'>): Promise<KnowledgeItem> {
  const res = await apiFetch('/api/knowledge-engine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  const { item: created } = await parseOrThrow<{ item: KnowledgeItem }>(res);
  return created;
}

export async function updateKnowledgeItem(item: KnowledgeItem): Promise<KnowledgeItem> {
  const res = await apiFetch('/api/knowledge-engine', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  const { item: updated } = await parseOrThrow<{ item: KnowledgeItem }>(res);
  return updated;
}

export type KnowledgeReleaseAction =
  | { action: 'stage'; stage: 'Draft' | 'In Review' | 'Approved' }
  | { action: 'schedule'; at: string | null }
  | { action: 'publish-now' }
  | { action: 'unpublish' };

/** Release flow (Portal migration 0054): move an article between stages. */
export async function knowledgeRelease(id: string, body: KnowledgeReleaseAction): Promise<KnowledgeItem> {
  const res = await apiFetch('/api/knowledge-engine?release=1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...body }),
  });
  const { item } = await parseOrThrow<{ item: KnowledgeItem }>(res);
  return item;
}

export async function deleteKnowledgeItem(id: string): Promise<void> {
  const res = await apiFetch(`/api/knowledge-engine?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }
}
