import type { KnowledgeItem } from '../types';

async function parseOrThrow<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}

export async function fetchKnowledgeItems(): Promise<KnowledgeItem[]> {
  const res = await fetch('/api/knowledge-engine');
  const { items } = await parseOrThrow<{ items: KnowledgeItem[] }>(res);
  return items;
}

export async function createKnowledgeItem(item: Omit<KnowledgeItem, 'id' | 'lastUpdated'>): Promise<KnowledgeItem> {
  const res = await fetch('/api/knowledge-engine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  const { item: created } = await parseOrThrow<{ item: KnowledgeItem }>(res);
  return created;
}

export async function updateKnowledgeItem(item: KnowledgeItem): Promise<KnowledgeItem> {
  const res = await fetch('/api/knowledge-engine', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  const { item: updated } = await parseOrThrow<{ item: KnowledgeItem }>(res);
  return updated;
}

export async function deleteKnowledgeItem(id: string): Promise<void> {
  const res = await fetch(`/api/knowledge-engine?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }
}
