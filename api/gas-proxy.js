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

const GAS_URL = process.env.VITE_GAS_URL ||
  'https://script.google.com/macros/s/AKfycbxpzLWLE_rv6u-pYRx8PuclAkvyf3wYTHioSxG789Bjhe-faVVfFkmxe1g3CkgtA8ut/exec';

async function handleGet(req, res) {
  const params = new URLSearchParams(req.query);
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
  const body = req.body || {};

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handlePost(req, res);
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
