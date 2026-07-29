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

  // TEMP DIAGNOSTIC — the vars are confirmed present in the Vercel project
  // (Production + Preview), so this checks what the running function
  // itself actually sees: which deployment target it's executing under
  // (VERCEL_ENV/VERCEL_URL), and whether each var is present/what length
  // it resolved to — never the values themselves.
  console.log('[api/publish] env diagnostic', {
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    portalUrlDefined: process.env.PORTAL_PUBLISHING_ENGINE_URL !== undefined,
    secretDefined: process.env.PORTAL_PUBLISHING_ENGINE_SECRET !== undefined,
    portalUrlLength: process.env.PORTAL_PUBLISHING_ENGINE_URL?.length,
    secretLength: process.env.PORTAL_PUBLISHING_ENGINE_SECRET?.length,
  });

  // TEMP DIAGNOSTIC — the only code between the env diagnostic log above and
  // the "target publishing URL" log below is this one guard. "Defined"
  // (!== undefined, logged above) and "truthy" are NOT the same thing: an
  // env var set to an empty string, or to whitespace, is defined but still
  // falsy, and would take this exact branch — silently reproducing the
  // "not configured" error and skipping every log after it, even though the
  // var technically "exists" in the Vercel dashboard. This logs the actual
  // boolean the guard evaluates, so a mismatch against the "defined" log
  // above is directly visible instead of inferred.
  console.log('[api/publish] guard check', {
    portalUrlTruthy: Boolean(portalUrl),
    secretTruthy: Boolean(secret),
    portalUrlIsEmptyString: portalUrl === '',
    secretIsEmptyString: secret === '',
    portalUrlTrimmedLength: portalUrl?.trim().length,
    secretTrimmedLength: secret?.trim().length,
  });

  if (!portalUrl || !secret) {
    // TEMP DIAGNOSTIC — if this line logs, the "not configured" response is
    // being returned RIGHT HERE, which fully explains "no logs after the env
    // check": every subsequent console.log in this function is unreachable
    // once this return executes. This isn't a crash or a truncated log —
    // it's this exact, ordinary early return.
    console.log('[api/publish] EARLY RETURN — guard triggered, responding "not configured" now');
    return res.status(500).json({
      ok: false,
      error: 'PORTAL_PUBLISHING_ENGINE_URL / PORTAL_PUBLISHING_ENGINE_SECRET are not configured on Studio.',
    });
  }

  // TEMP DIAGNOSTIC — env validation now confirmed fine (VERCEL_ENV correct,
  // both vars defined). Instrumenting the rest of the request to determine
  // whether the failure happens before the outbound fetch, during it, or
  // after receiving Portal's response. portalUrl itself is safe to log —
  // it's a destination URL, not a credential; the secret's value is never
  // logged, only attached to the outbound request header.
  console.log('[api/publish] target publishing URL:', portalUrl);

  let response;
  try {
    console.log('[api/publish] attempting outbound fetch to Portal...');
    response = await fetch(portalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishing-engine-secret': secret,
      },
      body: JSON.stringify(req.body ?? {}),
    });
    console.log('[api/publish] fetch completed — HTTP status:', response.status, response.statusText);
    console.log('[api/publish] response headers:', Object.fromEntries(response.headers.entries()));
  } catch (err) {
    // Thrown by fetch() itself — the request never got a response at all
    // (DNS failure, connection refused/reset, TLS error, timeout before any
    // bytes came back). Distinct from a request that completed but Portal
    // returned an error status or a bad body (handled below).
    console.error('[api/publish] outbound fetch threw before any response was received');
    console.error('[api/publish] error.name:', err?.name);
    console.error('[api/publish] error.message:', err?.message);
    console.error('[api/publish] error.stack:', err?.stack);
    return res.status(502).json({ ok: false, error: `Could not reach the Publishing Engine: ${String(err)}` });
  }

  try {
    // Portal's own handler always returns JSON, but a platform-level failure
    // upstream of that handler (a timeout, a crash before any response body
    // is written) returns Vercel's own plain-text/HTML error page instead —
    // blindly forwarding that while claiming Content-Type: application/json
    // (the previous behavior here) breaks Studio's frontend with a raw
    // "Unexpected token" JSON.parse error instead of a readable message.
    // Validating and re-wrapping here means Studio's UI never has to guess
    // whether a response is actually parseable.
    const text = await response.text();
    console.log('[api/publish] raw response body (first 500 chars):', text.slice(0, 500));

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
    // Thrown while reading/parsing the response we DID receive — i.e. after
    // the outbound fetch already succeeded and Portal already answered.
    console.error('[api/publish] error while reading/handling Portal\'s response');
    console.error('[api/publish] error.name:', err?.name);
    console.error('[api/publish] error.message:', err?.message);
    console.error('[api/publish] error.stack:', err?.stack);
    res.status(500).json({ ok: false, error: String(err) });
  }
}
