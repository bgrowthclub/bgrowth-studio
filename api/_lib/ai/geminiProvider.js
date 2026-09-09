import { GoogleGenAI } from '@google/genai';

// Bounded retry for transient Gemini capacity errors only (HTTP 503 /
// "UNAVAILABLE" / "currently experiencing high demand") — every other error
// (auth, invalid request, permission, unsupported model, and any error from
// parsing the response, which happens outside this helper) passes straight
// through on the first attempt, unchanged, exactly as before this change.
// Applies uniformly to every caller of generateWithGemini/
// generateVisionWithGemini (Content Engine included) since it lives at the
// shared provider layer, not in any task-specific code.
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 300;

function isTransientAvailabilityError(err) {
  if (!err) return false;
  if (err.status === 503 || err.code === 503) return true;
  const message = typeof err.message === 'string' ? err.message : '';
  return /\bUNAVAILABLE\b/i.test(message) || /high demand/i.test(message);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiWithRetry(makeRequest) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await makeRequest();
    } catch (err) {
      const canRetry = attempt < MAX_ATTEMPTS && isTransientAvailabilityError(err);
      if (!canRetry) throw err;
      await wait(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }
  // Unreachable — the loop always either returns or throws — but keeps this
  // function's return type honest for any future refactor.
  throw new Error('Gemini request failed after retrying.');
}

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
  const response = await callGeminiWithRetry(() =>
    ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    })
  );

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
  const response = await callGeminiWithRetry(() =>
    ai.models.generateContent({
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
    })
  );

  return JSON.parse(response.text);
}
