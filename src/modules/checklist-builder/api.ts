/**
 * API client for the Checklist Builder GAS backend.
 */
import type { ChecklistTemplate, ChecklistInstance } from './types';
import type { ChecklistData } from '../../engine/types';
import { compressString } from '../../lib/compress';

const IS_DEV = import.meta.env.DEV;
const DEV_URL = 'http://localhost:8787';

async function gasGet<T>(params: Record<string, string>): Promise<T> {
  let url: URL;
  if (IS_DEV) {
    url = new URL(DEV_URL);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  } else {
    url = new URL('/api/gas-proxy', window.location.origin);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  const json = (await res.json()) as { ok: boolean; data: T; error?: string };
  if (!json.ok) throw new Error(json.error ?? 'Unknown GAS error');
  return json.data;
}

async function gasPost<T>(params: Record<string, string>): Promise<T> {
  // Served by the same consolidated api/gas-proxy.js as gasGet above (see
  // the Serverless Function consolidation audit) — method alone (POST vs GET)
  // now distinguishes the two, no separate path needed in production.
  const endpoint = IS_DEV ? DEV_URL : '/api/gas-proxy';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const text = await res.text();
  const json = JSON.parse(text);  if (json.error) throw new Error(json.error);
  return json as T;
}

export async function api_getTemplates(ownerEmail: string): Promise<ChecklistTemplate[]> {
  return gasGet({ action: 'checklist_getTemplates', ownerEmail });
}

export async function api_getTemplate(templateId: string): Promise<ChecklistTemplate> {
  return gasGet({ action: 'checklist_getTemplate', templateId });
}

export async function api_saveTemplate(payload: {
  templateId?: string;
  ownerEmail: string;
  name: string;
  category?: string;
  configJson: string;
  status?: string;
}): Promise<ChecklistTemplate> {
  const compressed = await compressString(payload.configJson);
  return gasPost({
    action: 'checklist_saveTemplate',
    ownerEmail: payload.ownerEmail,
    payload: JSON.stringify({ ...payload, configJson: 'GZIP:' + compressed }),
  });
}
export async function api_archiveTemplate(templateId: string): Promise<{ templateId: string; status: string }> {
  return gasGet({ action: 'checklist_archiveTemplate', templateId });
}

export async function api_deleteTemplate(templateId: string): Promise<{ templateId: string; deleted: boolean }> {
  return gasGet({ action: 'checklist_deleteTemplate', templateId });
}

export async function api_getInstances(templateId: string, ownerEmail: string): Promise<ChecklistInstance[]> {
  return gasGet({ action: 'checklist_getInstances', templateId, ownerEmail });
}

export async function api_getInstance(instanceId: string): Promise<ChecklistInstance> {
  return gasGet({ action: 'checklist_getInstance', instanceId });
}

export async function api_saveInstance(payload: {
  instanceId?: string;
  templateId?: string;
  ownerEmail: string;
  clientOrJobRef?: string;
  dataJson: string;
  progressPercent: number;
  status?: string;
}): Promise<ChecklistInstance> {
  return gasPost({
    action: 'checklist_saveInstance',
    ownerEmail: payload.ownerEmail,
    payload: JSON.stringify(payload),
  });
}

export function serializeData(data: ChecklistData): string {
  return JSON.stringify(data);
}

export async function deserializeConfigJson(configJson: string): Promise<string> {
  try {
    const parsed = JSON.parse(configJson);
    if (parsed?.compressed) {
      return await decompressString(parsed.configJson ?? configJson);
    }
  } catch {}
  return configJson;
}

export function deserializeData(dataJson: string): ChecklistData {
  try {
    return JSON.parse(dataJson) as ChecklistData;
  } catch {
    return {};
  }
}
