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
