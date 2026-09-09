import { GoogleGenAI } from '@google/genai';

/**
 * The one concrete AI Provider implementation in Phase 1 — Gemini, because
 * Studio already has GEMINI_API_KEY and the server-side @google/genai
 * integration (see api/generate.js). Never imported by anything that ships
 * to the browser. runGeneration.js is the only caller, and it addresses
 * providers by name through GENERATORS, never by importing this file
 * directly — that's what keeps adding OpenAI/Anthropic later a matter of
 * adding a sibling file, not touching call sites.
 */
export async function generateWithGemini({ model, prompt }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });

  return JSON.parse(response.text);
}

/**
 * The vision counterpart to generateWithGemini above — additive, not a
 * modification of it. Same model family, same API key, same JSON-response
 * contract; the only difference is `contents` carries image parts
 * alongside the text prompt (Gemini's standard multimodal generateContent
 * shape — see the official @google/genai multimodal input samples), which
 * is a call-shape difference, not a second AI architecture. Called only by
 * runImageAnalysis.js, exactly the way generateWithGemini is called only by
 * runGeneration.js — neither of those two entry points imports the other's
 * provider function directly.
 */
export async function generateVisionWithGemini({ model, prompt, images }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          ...images.map((image) => ({ inlineData: { mimeType: image.mimeType, data: image.data } })),
        ],
      },
    ],
    config: { responseMimeType: 'application/json' },
  });

  return JSON.parse(response.text);
}
