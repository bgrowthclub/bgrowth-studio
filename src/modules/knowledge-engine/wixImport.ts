import { copyWixImage } from '../downloads/api';
import { createKnowledgeItem } from './api/knowledgeEngineClient';
import type { ContentBlock, KnowledgeItem } from './types';
import type { WixPost } from './wixPosts';

export const WIX_POST_COUNT = 89;

export interface WixPostImportProgress {
  done: number;
  total: number;
  current: string;
  failed: { name: string; error: string }[];
}

const WIX_NOTE = 'Imported from Wix';

// Wix images are copied to the Studio's public bucket so they keep working
// after the Wix site closes; if a copy fails the Wix address is kept.
async function copy(url: string) {
  if (!url) return '';
  return copyWixImage(url).catch(() => url);
}

async function toBlocks(post: WixPost): Promise<ContentBlock[]> {
  const blocks: ContentBlock[] = [];
  let n = 0;
  for (const [kind, a, b] of post.b) {
    const id = `wix-${++n}`;
    if (kind === 'p') blocks.push({ id, type: 'paragraph', data: { text: String(a ?? '') } });
    else if (kind === 'h') blocks.push({ id, type: 'heading', data: { level: Number(a) || 2, text: String(b ?? '') } });
    else if (kind === 'q') blocks.push({ id, type: 'quote', data: { text: String(a ?? ''), citation: '' } });
    else if (kind === 'i') blocks.push({ id, type: 'image', data: { url: await copy(String(a ?? '')), caption: String(b ?? '') } });
    else if (kind === 'v') blocks.push({ id, type: 'video', data: { url: String(a ?? '') } });
    else if (kind === 'd') blocks.push({ id, type: 'divider', data: {} });
  }
  return blocks;
}

async function toItem(post: WixPost): Promise<Omit<KnowledgeItem, 'id' | 'lastUpdated'>> {
  const [category = '', ...otherLabels] = post.c;
  const tags = [...new Set([...otherLabels, ...post.hs].map((t) => t.trim()).filter(Boolean))];
  const cover = await copy(post.cv);
  return {
    title: post.t,
    slug: post.s,
    excerpt: post.x,
    featuredImage: cover,
    contentType: 'Article',
    category,
    industry: '',
    language: post.l,
    difficulty: 'Beginner',
    readingTime: `${post.m || 1} min read`,
    tags,
    authorId: 'author-1',
    seo: {
      title: post.t,
      metaDescription: post.sd || post.x,
      canonicalUrl: '',
      ogImage: cover,
      schemaType: 'Article',
      index: true,
      follow: true,
    },
    blocks: await toBlocks(post),
    attachments: [],
    relatedContent: [],
    featuredOptions: { featured: false, featuredOnHomepage: false, featuredOnCategory: false, trending: false, editorsPick: false },
    publishing: {
      slug: post.s,
      status: 'Draft',
      visibility: 'Public',
      publishDate: post.d.slice(0, 10),
      scheduleDate: '',
      futureWebsiteUrl: '',
      publicationNotes: `${WIX_NOTE} (post ${post.id}, first published ${post.d.slice(0, 10)}).`,
    },
  };
}

/**
 * Creates a Draft for every Wix blog post not imported yet (matched by its
 * address, so running it again only adds what's missing). Nothing is
 * published.
 */
export async function importWixPosts(
  existing: KnowledgeItem[],
  onProgress: (p: WixPostImportProgress) => void,
): Promise<{ progress: WixPostImportProgress; created: KnowledgeItem[] }> {
  const { WIX_POSTS } = await import('./wixPosts');
  const taken = new Set(existing.map((i) => i.slug).filter(Boolean));
  const todo = WIX_POSTS.filter((p) => !taken.has(p.s));
  const progress: WixPostImportProgress = { done: 0, total: todo.length, current: '', failed: [] };
  const created: KnowledgeItem[] = [];
  for (const post of todo) {
    progress.current = post.t;
    onProgress({ ...progress });
    try {
      created.push(await createKnowledgeItem(await toItem(post)));
    } catch (err) {
      progress.failed.push({ name: post.t, error: err instanceof Error ? err.message : 'Failed' });
    }
    progress.done += 1;
    onProgress({ ...progress });
  }
  progress.current = '';
  return { progress, created };
}
