import type { Campaign, ContentItem } from './types';

/**
 * Builds the tagged link an admin pastes into the actual social post —
 * derived from the campaign's utm_campaign + the content item's own
 * platform/content_type, never stored (nothing new to keep in sync if a
 * campaign is renamed). VITE_PORTAL_BASE_URL is the Portal's public site
 * origin (not a secret — just where /product/:slug lives).
 */
export function buildUtmLink(campaign: Pick<Campaign, 'product_slug' | 'utm_campaign'>, item: Pick<ContentItem, 'platform' | 'content_type'>) {
  const base = import.meta.env.VITE_PORTAL_BASE_URL || '';
  const url = new URL(`/product/${campaign.product_slug}`, base || 'https://portal.invalid');
  url.searchParams.set('utm_source', item.platform);
  url.searchParams.set('utm_medium', 'social');
  url.searchParams.set('utm_campaign', campaign.utm_campaign);
  url.searchParams.set('utm_content', item.content_type);

  const full = url.toString();
  return base ? full : full.replace('https://portal.invalid', '');
}
