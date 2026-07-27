// Server-side proxy to the BGrowth Publishing Engine (lives in bgrowth-portal).
// Studio's frontend never holds PORTAL_PUBLISHING_ENGINE_SECRET — it calls
// this function, which attaches the secret server-side, exactly like the
// existing GAS proxy (api/gas-proxy-post.js) never exposes GAS internals to
// the browser either.

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb', // cover images arrive as base64
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const portalUrl = process.env.PORTAL_PUBLISHING_ENGINE_URL;
  const secret = process.env.PORTAL_PUBLISHING_ENGINE_SECRET;

  if (!portalUrl || !secret) {
    return res.status(500).json({
      ok: false,
      error: 'PORTAL_PUBLISHING_ENGINE_URL / PORTAL_PUBLISHING_ENGINE_SECRET are not configured on Studio.',
    });
  }

  try {
    const response = await fetch(portalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishing-engine-secret': secret,
      },
      body: JSON.stringify(req.body ?? {}),
    });

    // Portal's own handler always returns JSON, but a platform-level failure
    // upstream of that handler (a timeout, a crash before any response body
    // is written) returns Vercel's own plain-text/HTML error page instead —
    // blindly forwarding that while claiming Content-Type: application/json
    // (the previous behavior here) breaks Studio's frontend with a raw
    // "Unexpected token" JSON.parse error instead of a readable message.
    // Validating and re-wrapping here means Studio's UI never has to guess
    // whether a response is actually parseable.
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      console.error('[api/publish] Portal returned a non-JSON response:', text.slice(0, 500));
      return res.status(502).json({
        ok: false,
        error: "The Publishing Engine returned an unexpected response instead of JSON — check Portal's deployment logs.",
      });
    }

    res.status(response.status).json(json);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
}
