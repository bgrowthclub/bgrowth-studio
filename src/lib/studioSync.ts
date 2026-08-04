/**
 * BGrowth Studio — GAS Sync API
 * Saves and loads all Studio data to/from Google Sheets via GAS proxy
 */

// Both GET and POST are served by the same consolidated api/gas-proxy.js
// (see the Serverless Function consolidation audit) — still two constants
// since gasCall's method-based branching below reads cleanly either way.
const GAS_PROXY_GET = '/api/gas-proxy';
const GAS_PROXY_POST = '/api/gas-proxy';

async function gasCall(action: string, params: Record<string, string> = {}, method: 'GET' | 'POST' = 'GET'): Promise<any> {
  const url = new URL(method === 'POST' ? GAS_PROXY_POST : GAS_PROXY_GET, window.location.origin);
  url.searchParams.set('page', 'api');
  url.searchParams.set('action', action);
  
  if (method === 'GET') {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    const json = await res.json();
    return json;
  } else {
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params) // Envia o payload com segurança no corpo da requisição
    });
    const json = await res.json();
    return json;
  }
}
// -----------------------------------------------------------------------
// AI Products
// -----------------------------------------------------------------------
export async function gasGetAIProducts(ownerEmail: string): Promise<any[]> {
  try {
    const result = await gasCall('studio_getAIProducts', { ownerEmail });
    return Array.isArray(result) ? result : [];
  } catch { return []; }
}

export async function gasSaveAIProduct(ownerEmail: string, product: any): Promise<boolean> {
  try {
    const result = await gasCall('studio_saveAIProduct', {
  ownerEmail,
  product: JSON.stringify(product),
}, 'POST'); // <--- adicionado 'POST' aqui
    return result?.ok === true;
  } catch { return false; }
}

export async function gasDeleteAIProduct(ownerEmail: string, productId: string): Promise<boolean> {
  try {
    const result = await gasCall('studio_deleteAIProduct', { ownerEmail, productId });
    return result?.ok === true;
  } catch { return false; }
}

// -----------------------------------------------------------------------
// Planners
// -----------------------------------------------------------------------
export async function gasGetPlanners(ownerEmail: string): Promise<any[]> {
  try {
    const result = await gasCall('studio_getPlanners', { ownerEmail });
    return Array.isArray(result) ? result : [];
  } catch { return []; }
}

export async function gasSavePlanners(ownerEmail: string, planners: any[]): Promise<boolean> {
  try {
    // Mude para:
const result = await gasCall('studio_savePlanners', {
  ownerEmail,
  planners: JSON.stringify(planners),
}, 'POST'); // <--- adicionado 'POST' here
    return result?.ok === true;
  } catch { return false; }
}

// -----------------------------------------------------------------------
// Calculators (custom only)
// -----------------------------------------------------------------------
export async function gasGetCalculators(ownerEmail: string): Promise<any[]> {
  try {
    const result = await gasCall('studio_getCalculators', { ownerEmail });
    return Array.isArray(result) ? result : [];
  } catch { return []; }
}

export async function gasSaveCalculators(ownerEmail: string, calculators: any[]): Promise<boolean> {
  try {
    // Mude para:
const result = await gasCall('studio_saveCalculators', {
  ownerEmail,
  calculators: JSON.stringify(calculators),
}, 'POST'); // <--- adicionado 'POST' here
    return result?.ok === true;
  } catch { return false; }
}

// -----------------------------------------------------------------------
// Checklists
// -----------------------------------------------------------------------
export async function gasGetChecklists(ownerEmail: string): Promise<any[]> {
  try {
    const result = await gasCall('studio_getChecklists', { ownerEmail });
    return Array.isArray(result) ? result : [];
  } catch { return []; }
}

export async function gasSaveChecklists(ownerEmail: string, checklists: any[]): Promise<boolean> {
  try {
// Mude para:
const result = await gasCall('studio_saveChecklists', {
  ownerEmail,
  checklists: JSON.stringify(checklists),
}, 'POST'); // <--- adicionado 'POST' here
    return result?.ok === true;
  } catch { return false; }
}
