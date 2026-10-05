// Consolidated GET + POST proxy to the Google Apps Script backend (Vercel
// Hobby plan's 12-function limit; see the Serverless Function audit). Was
// two files (gas-proxy.js, gas-proxy-post.js); merged into one, branching
// on req.method exactly as every other multi-method endpoint in this repo
// already does. Behavior is unchanged for both methods.

// Adicione esta configuração ao seu arquivo para liberar o limite de tamanho na Vercel / Next.js
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Altera o limite padrão para 50 Megabytes! (only applies to POST bodies; harmless for GET)
    },
  },
};

import { requireAdmin } from './_lib/requireAdmin.js';

// Anonymous callers (the public fill links ?template=, ?planner=, ?calc=)
// may only read. Everything else — saving, archiving, deleting, listing
// the owner's templates or saved instances — needs a Studio admin's
// session (requireAdmin), so nobody can change or wipe Studio's data
// through this proxy.
const PUBLIC_READ_ACTIONS = new Set(['checklist_getTemplate', 'studio_getPlanners', 'studio_getCalculators']);

// Optional shared key: when GAS_PROXY_KEY is set, it is sent to the Apps
// Script on every call so the script can reject requests that don't come
// through this proxy (see the setup note in the GAS project).
const GAS_PROXY_KEY = process.env.GAS_PROXY_KEY || '';

const GAS_URL = process.env.GAS_URL || process.env.VITE_GAS_URL ||
  'https://script.google.com/macros/s/AKfycbxpzLWLE_rv6u-pYRx8PuclAkvyf3wYTHioSxG789Bjhe-faVVfFkmxe1g3CkgtA8ut/exec';

async function handleGet(req, res) {
  const params = new URLSearchParams(req.query);
  if (GAS_PROXY_KEY) params.set('proxyKey', GAS_PROXY_KEY);
  const url = `${GAS_URL}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'BGrowth-Studio-Proxy/1.0' },
      redirect: 'follow',
    });
    const text = await response.text();
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
}

async function handlePost(req, res) {
  const body = { ...(req.body || {}) };
  if (GAS_PROXY_KEY) body.proxyKey = GAS_PROXY_KEY;

  try {
    // GAS aceita form-encoded no POST
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BGrowth-Studio-Proxy/1.0',
      },
      body: JSON.stringify(body),
      redirect: 'follow',
    });

    const text = await response.text();

    // Verificar se o GAS retornou HTML de erro
    if (text.trim().startsWith('<')) {
      res.status(500).json({ ok: false, error: 'GAS returned HTML instead of JSON. Check doPost implementation.' });
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const action = String((req.method === 'POST' && req.body && req.body.action) || req.query.action || '');
  if (!PUBLIC_READ_ACTIONS.has(action) && !(await requireAdmin(req))) {
    return res.status(401).json({ ok: false, error: 'Sign in to BGrowth Studio with an admin account.' });
  }
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handlePost(req, res);
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
