import DOMPurify from 'dompurify';

/**
 * Template content can come from anyone who could write a template, so it
 * is never trusted: formatted text is cleaned of scripts and event
 * handlers, and links only keep web, e-mail and inline-file schemes.
 */
export function safeHtml(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

const SAFE_URL = /^(https?:|mailto:|tel:|data:(?!text\/html)|blob:|#|\/)/i;

export function safeUrl(url: string | undefined | null): string {
  const value = (url ?? '').trim();
  return SAFE_URL.test(value) ? value : '#';
}
