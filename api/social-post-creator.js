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

export const config = {
  api: {
    // Multiple compressed photos as base64 (analyze-photos only) — harmless
    // for the other three, much smaller, JSON-only actions.
    bodyParser: { sizeLimit: '15mb' },
  },
};

const MAX_PHOTOS = 10;

async function handleAnalyzePhotos(req, res) {
  const { images } = req.body ?? {};
  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ ok: false, error: 'images (a non-empty array) is required.' });
  }
  if (images.length > MAX_PHOTOS) {
    return res.status(400).json({ ok: false, error: `A maximum of ${MAX_PHOTOS} photos can be analyzed at once.` });
  }

  try {
    const prompt = buildAnalysisPrompt({ photoCount: images.length });
    const { output } = await runImageAnalysis({
      taskType: 'social_post_creator_analyze_photos',
      images,
      prompt,
    });
    return res.status(200).json({ ok: true, analysis: output });
  } catch (err) {
    console.error('[social-post-creator:analyze-photos]', err);
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}

async function handleGenerateCarousel(req, res) {
  const { analysis, objective, customObjective, platform, photoCount } = req.body ?? {};
  if (!analysis || !objective || !platform || !photoCount) {
    return res.status(400).json({ ok: false, error: 'analysis, objective, platform, and photoCount are required.' });
  }

  try {
    const prompt = buildCarouselPrompt({ analysis, objective, customObjective, platform, photoCount });
    const { output } = await runGeneration({ taskType: 'social_post_creator_generate_carousel', prompt });
    return res.status(200).json({ ok: true, slides: output?.slides ?? [] });
  } catch (err) {
    console.error('[social-post-creator:generate-carousel]', err);
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}

async function handleGenerateCopy(req, res) {
  const { analysis, objective, customObjective, platform, target, existing } = req.body ?? {};
  if (!analysis || !objective || !platform || !target) {
    return res.status(400).json({ ok: false, error: 'analysis, objective, platform, and target are required.' });
  }
  if (!['all', 'phrase', 'caption', 'cta'].includes(target)) {
    return res.status(400).json({ ok: false, error: 'target must be one of: all, phrase, caption, cta.' });
  }

  try {
    const prompt = buildCopyPrompt({ analysis, objective, customObjective, platform, target, existing });
    const { output } = await runGeneration({ taskType: 'social_post_creator_generate_copy', prompt });
    return res.status(200).json({ ok: true, copy: output ?? {} });
  } catch (err) {
    console.error('[social-post-creator:generate-copy]', err);
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}

async function handleGenerateHashtags(req, res) {
  const { analysis, objective, customObjective, platform } = req.body ?? {};
  if (!analysis || !objective || !platform) {
    return res.status(400).json({ ok: false, error: 'analysis, objective, and platform are required.' });
  }

  try {
    const prompt = buildHashtagsPrompt({ analysis, objective, customObjective, platform });
    const { output } = await runGeneration({ taskType: 'social_post_creator_generate_hashtags', prompt });
    return res.status(200).json({ ok: true, hashtags: output ?? {} });
  } catch (err) {
    console.error('[social-post-creator:generate-hashtags]', err);
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
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
