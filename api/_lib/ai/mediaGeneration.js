import { GoogleGenAI } from '@google/genai';
import { getProviderForTask } from './registry.js';

// Media generators return raw bytes + a mime type, never parsed JSON — a
// fundamentally different contract from GENERATORS in runGeneration.js
// (text-only, always JSON via responseMimeType:'application/json'), which
// is why this is a separate module rather than an extension of it. Both
// share the SAME provider_task_config routing table via getProviderForTask
// — reused as-is, not modified — so a future second media provider (or a
// future per-workspace BYOK provider) is a routing-table row, exactly like
// text generation already works.
const MEDIA_GENERATORS = {
  gemini: generateImageWithGemini,
};

/**
 * The Creative Assets media entry point, parallel to (never touching)
 * runGeneration.js. Callers (api/content-engine/creative-assets.js) pass a
 * task_type and a prompt, and get back { provider, model, buffer, mimeType }.
 */
export async function runMediaGeneration({ taskType, prompt }) {
  const { provider, model } = await getProviderForTask(taskType);
  const generate = MEDIA_GENERATORS[provider];
  if (!generate) {
    throw new Error(`No media provider registered for "${provider}".`);
  }
  const result = await generate({ model, prompt });
  return { provider, model, ...result };
}

// Matches Google's official @google/genai sample for image output via
// generateContent (sdk-samples/interactions_multimodal_response_image_
// with_generate_content.ts, gemini-2.5-flash-image): responseModalities
// must include 'IMAGE', and the response's own `.data` getter (see
// node_modules/@google/genai's GenerateContentResponse — reconstructs the
// base64 image bytes from candidates[0].content.parts[].inlineData.data)
// is used exactly as the sample demonstrates, rather than re-deriving the
// bytes by hand. mimeType isn't exposed by `.data`, so it's still read off
// the same officially-typed inlineData (Blob) part — never guessed.
async function generateImageWithGemini({ model, prompt }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseModalities: ['TEXT', 'IMAGE'] },
  });

  const base64Data = response.data;
  if (!base64Data) {
    throw new Error('The model did not return image data for this prompt.');
  }

  const imagePart = (response.candidates?.[0]?.content?.parts ?? []).find((part) => part.inlineData?.data);

  return {
    buffer: Buffer.from(base64Data, 'base64'),
    mimeType: imagePart?.inlineData?.mimeType || 'image/png',
  };
}
