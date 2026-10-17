/**
 * Turns an AI provider error into a short message a person can act on.
 * Gemini's quota error (429 / RESOURCE_EXHAUSTED) otherwise reaches the
 * screen as a raw JSON blob. Returns { status, message }.
 */
export function friendlyAiError(err) {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const status = err?.status ?? err?.code;
  if (status === 429 || /RESOURCE_EXHAUSTED|exceeded your current quota/i.test(raw)) {
    const daily = /PerDay/i.test(raw);
    return {
      status: 429,
      message: daily
        ? "Today's free AI limit has been reached (Google Gemini). It resets within 24 hours — try again later."
        : 'The AI is receiving too many requests right now. Wait a minute and try again.',
    };
  }
  if (status === 503 || /UNAVAILABLE|high demand/i.test(raw)) {
    return { status: 503, message: 'The AI is busy right now. Please try again in a few minutes.' };
  }
  return { status: 500, message: raw || 'The AI request failed.' };
}
