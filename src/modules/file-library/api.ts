import { apiFetch } from '../../lib/apiClient';
import { supabase } from '../../lib/supabaseClient';
import type { ImportResult, LibraryFile } from './types';

// Studio → Files (Portal migration 0049). Everything goes through
// /api/access-management?resource=library (requireAdmin); the browser only
// talks to Storage to send a file's bytes with a one-time upload token.
const ENDPOINT = '/api/access-management?resource=library';
const BUCKET = 'library-files';

async function parse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}

function send(method: string, body: unknown) {
  return apiFetch(ENDPOINT, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

export async function listFiles(): Promise<LibraryFile[]> {
  const { files } = await parse<{ files: LibraryFile[] }>(await apiFetch(ENDPOINT));
  return files;
}

export async function getDownloadUrl(id: string): Promise<string> {
  const { url } = await parse<{ url: string }>(await apiFetch(`${ENDPOINT}&download=${encodeURIComponent(id)}`));
  return url;
}

async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Uploads one file from the computer straight to Storage, then lists it. */
export async function uploadFile(file: File, folder: string | null): Promise<LibraryFile> {
  const checksum = await sha256(file);
  const meta = { name: file.name, mimeType: file.type, size: file.size, checksum };
  const { id, path, token } = await parse<{ id: string; path: string; token: string }>(await send('POST', { action: 'upload-url', ...meta }));
  const { error } = await supabase.storage.from(BUCKET).uploadToSignedUrl(path, token, file, { contentType: file.type || undefined });
  if (error) throw new Error(error.message);
  const { file: row } = await parse<{ file: LibraryFile }>(await send('POST', { action: 'confirm', id, path, folder, ...meta }));
  return row;
}

/** The server downloads the file from a link (or Wix) and stores a copy. */
export async function importFromUrl(input: { url: string; name?: string; folder?: string | null; source?: 'link' | 'wix' }): Promise<ImportResult> {
  return parse<ImportResult>(await send('POST', { action: 'from-url', ...input }));
}

export async function updateFile(id: string, patch: { name?: string; folder?: string | null }): Promise<LibraryFile> {
  const { file } = await parse<{ file: LibraryFile }>(await send('PATCH', { id, ...patch }));
  return file;
}

export async function deleteFile(id: string): Promise<void> {
  await parse(await send('DELETE', { id }));
}
