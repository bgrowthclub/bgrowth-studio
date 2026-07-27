// Server-side proxy to the BGrowth Publishing Engine's archive endpoint
// (lives in bgrowth-portal). Same reasoning as api/publish.js: Studio's
// frontend never holds PORTAL_PUBLISHING_ENGINE_SECRET, so this attaches it
// server-side. Reuses PORTAL_PUBLISHING_ENGINE_URL rather than requiring a
// second env var — that value already points at
// ".../api/publishing-engine/publish", so this just swaps the last path
// segment for "archive" rather than asking for a whole new setting.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const publishUrl = process.env.PORTAL_PUBLISHING_ENGINE_URL;
  const secret = process.env.PORTAL_PUBLISHING_ENGINE_SECRET;

  if (!publishUrl || !secret) {
    return res.status(500).json({
      ok: false,
      error: 'PORTAL_PUBLISHING_ENGINE_URL / PORTAL_PUBLISHING_ENGINE_SECRET are not configured on Studio.',
    });
  }

  const archiveUrl = publishUrl.replace(/\/publish$/, '/archive');
  if (archiveUrl === publishUrl) {
    return res.status(500).json({
      ok: false,
      error: 'PORTAL_PUBLISHING_ENGINE_URL is not in the expected ".../publish" shape — cannot derive the archive endpoint URL.',
    });
  }

  try {
    const response = await fetch(archiveUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishing-engine-secret': secret,
      },
      body: JSON.stringify(req.body ?? {}),
    });

    // Same "never blindly forward a non-JSON body" hardening as api/publish.js.
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      console.error('[api/archive] Portal returned a non-JSON response:', text.slice(0, 500));
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
