import type { CopyTarget, GeneratedCopy, HashtagGroups, PhotoAnalysis, PostObjective, Platform } from '../types';

async function parseOrThrow<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}

async function post<T>(action: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/social-post-creator?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseOrThrow<T>(res);
}

export interface AnalyzedImage {
  mimeType: string;
  /** Raw base64, no "data:...;base64," prefix. */
  data: string;
}

export async function analyzePhotos(images: AnalyzedImage[]): Promise<PhotoAnalysis> {
  const { analysis } = await post<{ analysis: PhotoAnalysis }>('analyze-photos', { images });
  return analysis;
}

export interface RawCarouselSlide {
  photoIndex: number;
  role: string;
  suggestedText: string | null;
}

export async function generateCarousel(input: {
  analysis: PhotoAnalysis;
  objective: PostObjective;
  customObjective?: string;
  platform: Platform;
  photoCount: number;
}): Promise<RawCarouselSlide[]> {
  const { slides } = await post<{ slides: RawCarouselSlide[] }>('generate-carousel', input);
  return slides;
}

export async function generateCopy(input: {
  analysis: PhotoAnalysis;
  objective: PostObjective;
  customObjective?: string;
  platform: Platform;
  target: CopyTarget;
  existing?: Partial<GeneratedCopy>;
}): Promise<Partial<GeneratedCopy>> {
  const { copy } = await post<{ copy: Partial<GeneratedCopy> }>('generate-copy', input);
  return copy;
}

export async function generateHashtags(input: {
  analysis: PhotoAnalysis;
  objective: PostObjective;
  customObjective?: string;
  platform: Platform;
}): Promise<HashtagGroups> {
  const { hashtags } = await post<{ hashtags: HashtagGroups }>('generate-hashtags', input);
  return hashtags;
}
