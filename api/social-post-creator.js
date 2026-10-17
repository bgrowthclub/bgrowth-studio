// Social Post Creator's API surface, consolidated into ONE Vercel function
// (routed by ?action=) — same pattern as api/gas-proxy.js and
// api/publishing-engine.js, and for the same reason: the Hobby plan's
// 12-function limit (this file is the 12th; see those two files' own
// comments on the same constraint). Four actions, one file:
//   ?action=analyze-photos    (vision — the only action that sends images)
//   ?action=generate-carousel
//   ?action=generate-copy
//   ?action=generate-hashtags
// No persistence anywhere in this file — every action is a pure
// AI-provider call; the client holds all generated state.

import { runGeneration } from './_lib/ai/runGeneration.js';
import { runImageAnalysis } from './_lib/ai/runImageAnalysis.js';
import {
  buildAnalysisPrompt,
  buildCarouselPrompt,
  buildCopyPrompt,
  buildHashtagsPrompt,
} from './_lib/socialPostCreator/promptBuilder.js';
import { DEFAULT_CONTENT_LANGUAGE, CONTENT_LANGUAGE_LABELS } from './_lib/socialPostCreator/contentSpecs.js';
import { requireAdmin } from './_lib/requireAdmin.js';
import { friendlyAiError } from './_lib/ai/friendlyError.js';

function sendAiError(res, tag, err) {
  console.error(`[social-post-creator:${tag}]`, err);
  const { status, message } = friendlyAiError(err);
  return res.status(status).json({ ok: false, error: message });
}

// Optional BGrowth product the post promotes — only its name and summary,
// trimmed, ever reach the prompt.
function normalizeProduct(product) {
  if (!product || typeof product !== 'object') return null;
  const name = String(product.name ?? '').trim().slice(0, 160);
  if (!name) return null;
  return { name, short_description: String(product.short_description ?? '').trim().slice(0, 500) };
}

function normalizeLanguage(language) {
  return language && CONTENT_LANGUAGE_LABELS[language] ? language : DEFAULT_CONTENT_LANGUAGE;
}

export const config = {
  api: {
    // Multiple compressed photos as base64 (analyze-photos only) — harmless
    // for the other three, much smaller, JSON-only actions.
    bodyParser: { sizeLimit: '15mb' },
  },
};

const MAX_PHOTOS = 10;

async function handleAnalyzePhotos(req, res) {
  const { images, language } = req.body ?? {};
  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ ok: false, error: 'images (a non-empty array) is required.' });
  }
  if (images.length > MAX_PHOTOS) {
    return res.status(400).json({ ok: false, error: `A maximum of ${MAX_PHOTOS} photos can be analyzed at once.` });
  }

  try {
    const prompt = buildAnalysisPrompt({ photoCount: images.length, language: normalizeLanguage(language) });
    const { output } = await runImageAnalysis({
      taskType: 'social_post_creator_analyze_photos',
      images,
      prompt,
    });
    return res.status(200).json({ ok: true, analysis: output });
  } catch (err) {
    return sendAiError(res, 'analyze-photos', err);
  }
}

async function handleGenerateCarousel(req, res) {
  const { analysis, objective, customObjective, platform, photoCount, language, product } = req.body ?? {};
  if (!analysis || !objective || !platform || !photoCount) {
    return res.status(400).json({ ok: false, error: 'analysis, objective, platform, and photoCount are required.' });
  }

  try {
    const prompt = buildCarouselPrompt({ analysis, objective, customObjective, platform, photoCount, language: normalizeLanguage(language), product: normalizeProduct(product) });
    const { output } = await runGeneration({ taskType: 'social_post_creator_generate_carousel', prompt });
    return res.status(200).json({ ok: true, slides: output?.slides ?? [] });
  } catch (err) {
    return sendAiError(res, 'generate-carousel', err);
  }
}

async function handleGenerateCopy(req, res) {
  const { analysis, objective, customObjective, platform, target, existing, language, withHashtags, product } = req.body ?? {};
  if (!analysis || !objective || !platform || !target) {
    return res.status(400).json({ ok: false, error: 'analysis, objective, platform, and target are required.' });
  }
  if (!['all', 'phrase', 'caption', 'cta'].includes(target)) {
    return res.status(400).json({ ok: false, error: 'target must be one of: all, phrase, caption, cta.' });
  }

  try {
    // First generation (target 'all') can also return the hashtags in the same
    // AI call — one request fewer per post (free-tier quota).
    const includeHashtags = target === 'all' && withHashtags === true;
    const prompt = buildCopyPrompt({
      analysis,
      objective,
      customObjective,
      platform,
      target,
      existing,
      language: normalizeLanguage(language),
      withHashtags: includeHashtags,
      product: normalizeProduct(product),
    });
    const { output } = await runGeneration({ taskType: 'social_post_creator_generate_copy', prompt });
    if (includeHashtags) {
      const { hashtags, ...copy } = output ?? {};
      return res.status(200).json({ ok: true, copy, hashtags: hashtags ?? null });
    }
    return res.status(200).json({ ok: true, copy: output ?? {} });
  } catch (err) {
    return sendAiError(res, 'generate-copy', err);
  }
}

async function handleGenerateHashtags(req, res) {
  const { analysis, objective, customObjective, platform, language, product } = req.body ?? {};
  if (!analysis || !objective || !platform) {
    return res.status(400).json({ ok: false, error: 'analysis, objective, and platform are required.' });
  }

  try {
    const prompt = buildHashtagsPrompt({ analysis, objective, customObjective, platform, language: normalizeLanguage(language), product: normalizeProduct(product) });
    const { output } = await runGeneration({ taskType: 'social_post_creator_generate_hashtags', prompt });
    return res.status(200).json({ ok: true, hashtags: output ?? {} });
  } catch (err) {
    return sendAiError(res, 'generate-hashtags', err);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!(await requireAdmin(req))) return res.status(401).json({ ok: false, error: 'Sign in to BGrowth Studio with an admin account.' });
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const { action } = req.query;
  if (action === 'analyze-photos') return handleAnalyzePhotos(req, res);
  if (action === 'generate-carousel') return handleGenerateCarousel(req, res);
  if (action === 'generate-copy') return handleGenerateCopy(req, res);
  if (action === 'generate-hashtags') return handleGenerateHashtags(req, res);
  return res.status(400).json({
    ok: false,
    error: 'action must be one of: analyze-photos, generate-carousel, generate-copy, generate-hashtags.',
  });
}
