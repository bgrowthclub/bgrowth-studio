import { apiFetch } from '../../../lib/apiClient';
import type { BrandProfile, Campaign, ContentItem, ContentItemStatus, ContentStrategy, ContentType, Platform } from '../types';

async function parseOrThrow<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}

export async function fetchBrandProfile(): Promise<BrandProfile> {
  const res = await apiFetch('/api/content-engine/brand-profile');
  const { brandProfile } = await parseOrThrow<{ brandProfile: BrandProfile }>(res);
  return brandProfile;
}

export async function updateBrandProfile(patch: Partial<BrandProfile>): Promise<BrandProfile> {
  const res = await apiFetch('/api/content-engine/brand-profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const { brandProfile } = await parseOrThrow<{ brandProfile: BrandProfile }>(res);
  return brandProfile;
}

export async function fetchStrategies(): Promise<ContentStrategy[]> {
  const res = await apiFetch('/api/content-engine/strategies');
  const { strategies } = await parseOrThrow<{ strategies: ContentStrategy[] }>(res);
  return strategies;
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  const res = await apiFetch('/api/content-engine/campaigns');
  const { campaigns } = await parseOrThrow<{ campaigns: Campaign[] }>(res);
  return campaigns;
}

export async function createCampaign(input: {
  productId: string;
  productSlug: string;
  strategyId: string;
  name: string;
  goal?: string;
  utmCampaign?: string;
}): Promise<Campaign> {
  const res = await apiFetch('/api/content-engine/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const { campaign } = await parseOrThrow<{ campaign: Campaign }>(res);
  return campaign;
}

export async function fetchContentItems(campaignId?: string): Promise<ContentItem[]> {
  const qs = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : '';
  const res = await apiFetch(`/api/content-engine/content-items${qs}`);
  const { contentItems } = await parseOrThrow<{ contentItems: ContentItem[] }>(res);
  return contentItems;
}

export async function updateContentItem(input: {
  id: string;
  status?: ContentItemStatus;
  body?: Record<string, unknown>;
  scheduledAt?: string | null;
  publishedAt?: string | null;
}): Promise<ContentItem> {
  const res = await apiFetch('/api/content-engine/content-items', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const { contentItem } = await parseOrThrow<{ contentItem: ContentItem }>(res);
  return contentItem;
}

export async function deleteContentItem(id: string): Promise<void> {
  const res = await apiFetch(`/api/content-engine/content-items?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }
}

export async function generateContentItem(input: {
  campaignId: string;
  platform: Platform;
  contentType: ContentType;
}): Promise<ContentItem> {
  const res = await apiFetch('/api/content-engine/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const { contentItem } = await parseOrThrow<{ contentItem: ContentItem }>(res);
  return contentItem;
}
