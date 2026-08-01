/**
 * One entry per generatable content_type — the JSON shape the model must
 * return and a short platform-agnostic instruction. Platform (instagram/
 * facebook/tiktok) shapes the tone/length guidance injected alongside this,
 * not the JSON shape itself, so adding a platform is a prompt-text change,
 * never a new content_type or a new output schema.
 */
export const CONTENT_SPECS = {
  caption: {
    label: 'Caption',
    instruction:
      'Write a single social media caption promoting this Workspace, plus a matching set of hashtags.',
    schema: '{ "caption": string, "hashtags": string[] }',
  },
  carousel: {
    label: 'Carousel',
    instruction:
      'Write a multi-slide carousel post: 4-7 slides, each with a short heading and one line of body copy, plus a caption tying the slides together and a matching set of hashtags.',
    schema:
      '{ "slides": [{ "heading": string, "body": string }], "caption": string, "hashtags": string[] }',
  },
  script: {
    label: 'Short Video Script',
    instruction:
      'Write a short-form vertical video script (Reels/TikTok/Stories): an opening hook, 3-6 scenes each with a visual direction and voiceover/on-screen text line, and a closing call to action.',
    schema:
      '{ "hook": string, "scenes": [{ "visual": string, "voiceover": string }], "cta": string }',
  },
  hook_cta: {
    label: 'Hooks & CTAs',
    instruction:
      'Write 5 alternative opening hooks and 5 alternative closing calls to action for this Workspace, usable across any post format.',
    schema: '{ "hooks": string[], "ctas": string[] }',
  },
};

export const PLATFORM_LABELS = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
};
