import { createHash, randomUUID } from 'node:crypto';

/**
 * File Library — Studio → Files (Portal migration 0049). Every file BGrowth
 * sells or uses is stored once in the PRIVATE `library-files` bucket and
 * listed in portal.library_files; kits, single-PDF products, bundles and
 * apps point to these rows. Served through api/access-management.js
 * (`?resource=library`) because the Vercel plan caps the number of
 * functions. Every call already passed requireAdmin().
 *
 *   GET                       → { files }
 *   GET  &download=<id>       → { url }  (signed link, 2 minutes)
 *   POST { action:'upload-url', name, mimeType, size, checksum }
 *                             → { id, path, token } for a direct browser upload
 *   POST { action:'confirm', id, path, name, folder, mimeType, size, checksum }
 *                             → { file }
 *   POST { action:'from-url', url, name?, folder?, source:'link'|'wix' }
 *                             → { file } or { skipped, duplicateOf }
 *   PATCH  { id, name?, folder? } → { file }
 *   DELETE { id }                 → { ok }
 */

export const LIBRARY_BUCKET = 'library-files';
const MAX_BYTES = 50 * 1024 * 1024;
const MIME_BY_EXT = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};
const ALLOWED = new Set(Object.values(MIME_BY_EXT));
const COLUMNS = 'id, name, folder, storage_path, mime_type, size_bytes, checksum, source, source_url, created_by, created_at, updated_at';

function table(supabase) {
  return supabase.schema('portal').from('library_files');
}

function cleanName(value) {
  const name = String(value ?? '').trim().slice(0, 200);
  return name || null;
}

function cleanFolder(value) {
  const folder = String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
  return folder || null;
}

// Storage key: ascii only, keeps the extension.
function safeFileName(name) {
  const base = String(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
  return base || 'file';
}

function extOf(name) {
  const m = /\.([A-Za-z0-9]+)(?:$|\?)/.exec(String(name));
  return m ? m[1].toLowerCase() : '';
}

function mimeFor(name, headerType) {
  const fromHeader = String(headerType ?? '').split(';')[0].trim().toLowerCase();
  if (ALLOWED.has(fromHeader)) return fromHeader;
  return MIME_BY_EXT[extOf(name)] ?? null;
}

async function findDuplicate(supabase, checksum) {
  if (!checksum) return null;
  const { data } = await table(supabase).select('id, name').eq('checksum', checksum).limit(1);
  return data?.[0] ?? null;
}

// Only plain public https addresses — no local or private hosts.
function checkUrl(raw) {
  let url;
  try {
    url = new URL(String(raw ?? '').trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || /^[\d.]+$/.test(host) || host.includes(':')) return null;
  return url;
}

async function listFiles(res, supabase) {
  const { data, error } = await table(supabase).select(COLUMNS).order('created_at', { ascending: false });
  if (error) {
    if (error.code === '42P01' || /does not exist/i.test(error.message ?? '')) {
      return res.status(409).json({ error: 'Run Portal migration 0049 (File Library) in Supabase first.' });
    }
    throw error;
  }
  return res.json({ files: data ?? [] });
}

async function downloadLink(res, supabase, id) {
  const { data: row } = await table(supabase).select('name, storage_path').eq('id', id).maybeSingle();
  if (!row) return res.status(404).json({ error: 'File not found.' });
  const { data, error } = await supabase.storage
    .from(LIBRARY_BUCKET)
    .createSignedUrl(row.storage_path, 120, { download: row.name });
  if (error) throw error;
  return res.json({ url: data.signedUrl });
}

async function uploadUrl(res, supabase, body) {
  const name = cleanName(body.name);
  const mimeType = mimeFor(name ?? '', body.mimeType);
  const size = Number(body.size ?? 0);
  if (!name) return res.status(400).json({ error: 'The file needs a name.' });
  if (!mimeType) return res.status(400).json({ error: 'Only PDF and image files can be added.' });
  if (!(size > 0) || size > MAX_BYTES) return res.status(400).json({ error: 'Files must be up to 50 MB.' });

  const duplicate = await findDuplicate(supabase, body.checksum);
  if (duplicate) return res.status(409).json({ error: `This file is already in the library as "${duplicate.name}".`, duplicateOf: duplicate });

  const id = randomUUID();
  const path = `${id}/${safeFileName(name)}`;
  const { data, error } = await supabase.storage.from(LIBRARY_BUCKET).createSignedUploadUrl(path);
  if (error) throw error;
  return res.json({ id, path, token: data.token });
}

async function confirmUpload(res, supabase, body, admin) {
  const id = String(body.id ?? '');
  const path = String(body.path ?? '');
  const name = cleanName(body.name);
  if (!id || !path.startsWith(`${id}/`) || !name) return res.status(400).json({ error: 'Invalid upload.' });

  // The object must really be there before it is listed.
  const { data: objects, error: listError } = await supabase.storage.from(LIBRARY_BUCKET).list(id);
  if (listError) throw listError;
  const stored = (objects ?? []).find((o) => `${id}/${o.name}` === path);
  if (!stored) return res.status(400).json({ error: 'The upload did not finish. Please try again.' });

  const { data, error } = await table(supabase)
    .insert({
      id,
      name,
      folder: cleanFolder(body.folder),
      storage_path: path,
      mime_type: mimeFor(name, body.mimeType) ?? 'application/octet-stream',
      size_bytes: Number(stored.metadata?.size ?? body.size ?? 0),
      checksum: typeof body.checksum === 'string' ? body.checksum : null,
      source: 'upload',
      created_by: admin.email,
    })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return res.json({ file: data });
}

async function fromUrl(res, supabase, body, admin) {
  const url = checkUrl(body.url);
  if (!url) return res.status(400).json({ error: 'Paste a full https:// link to the file.' });
  const source = body.source === 'wix' ? 'wix' : 'link';

  const { data: already } = await table(supabase).select('id, name').eq('source_url', url.toString()).limit(1);
  if (already?.[0]) return res.json({ skipped: true, duplicateOf: already[0] });

  let response;
  try {
    response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(45000) });
  } catch {
    return res.status(502).json({ error: 'Could not reach that link.' });
  }
  if (!response.ok) return res.status(502).json({ error: `The link answered ${response.status}.` });

  const fromPath = decodeURIComponent(url.pathname.split('/').pop() ?? '');
  const name = cleanName(body.name) ?? cleanName(fromPath) ?? 'file';
  const mimeType = mimeFor(name, response.headers.get('content-type')) ?? mimeFor(fromPath, null);
  if (!mimeType) return res.status(400).json({ error: 'That link is not a PDF or an image.' });

  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > MAX_BYTES) return res.status(400).json({ error: 'Files must be up to 50 MB.' });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.byteLength || buffer.byteLength > MAX_BYTES) return res.status(400).json({ error: 'Files must be up to 50 MB.' });

  const checksum = createHash('sha256').update(buffer).digest('hex');
  const duplicate = await findDuplicate(supabase, checksum);
  if (duplicate) return res.json({ skipped: true, duplicateOf: duplicate });

  const id = randomUUID();
  const fileName = extOf(name) ? name : `${name}.${Object.keys(MIME_BY_EXT).find((k) => MIME_BY_EXT[k] === mimeType)}`;
  const path = `${id}/${safeFileName(fileName)}`;
  const { error: uploadError } = await supabase.storage.from(LIBRARY_BUCKET).upload(path, buffer, { contentType: mimeType, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await table(supabase)
    .insert({
      id,
      name: fileName,
      folder: cleanFolder(body.folder),
      storage_path: path,
      mime_type: mimeType,
      size_bytes: buffer.byteLength,
      checksum,
      source,
      source_url: url.toString(),
      created_by: admin.email,
    })
    .select(COLUMNS)
    .single();
  if (error) {
    await supabase.storage.from(LIBRARY_BUCKET).remove([path]).catch(() => undefined);
    throw error;
  }
  return res.json({ file: data });
}

async function updateFile(res, supabase, body) {
  const id = String(body.id ?? '');
  const patch = { updated_at: new Date().toISOString() };
  if ('name' in body) {
    const name = cleanName(body.name);
    if (!name) return res.status(400).json({ error: 'The file needs a name.' });
    patch.name = name;
  }
  if ('folder' in body) patch.folder = cleanFolder(body.folder);
  const { data, error } = await table(supabase).update(patch).eq('id', id).select(COLUMNS).maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'File not found.' });
  return res.json({ file: data });
}

async function deleteFile(res, supabase, body) {
  const id = String(body.id ?? '');
  const { data: row } = await table(supabase).select('storage_path').eq('id', id).maybeSingle();
  if (!row) return res.status(404).json({ error: 'File not found.' });
  const { error: removeError } = await supabase.storage.from(LIBRARY_BUCKET).remove([row.storage_path]);
  if (removeError) throw removeError;
  const { error } = await table(supabase).delete().eq('id', id);
  if (error) throw error;
  return res.json({ ok: true });
}

// Product page gallery (Portal migration 0050): images and short videos go
// to the PUBLIC portal-product-assets bucket (gallery/…) — they are shown
// to every visitor. The browser uploads straight to Storage with this
// one-time token; the publish then sends the public URLs.
const GALLERY_BUCKET = 'portal-product-assets';
const GALLERY_TYPES = {
  'image/png': ['png', 10],
  'image/jpeg': ['jpg', 10],
  'image/webp': ['webp', 10],
  'image/gif': ['gif', 10],
  'video/mp4': ['mp4', 50],
  'video/webm': ['webm', 50],
  'video/quicktime': ['mov', 50],
};

async function galleryUploadUrl(res, supabase, body) {
  const type = GALLERY_TYPES[String(body.mimeType ?? '').toLowerCase()];
  if (!type) return res.status(400).json({ error: 'Use a PNG, JPG, WebP or GIF image, or an MP4, WebM or MOV video.' });
  const [ext, maxMb] = type;
  const size = Number(body.size ?? 0);
  if (!(size > 0) || size > maxMb * 1024 * 1024) return res.status(400).json({ error: `This file must be up to ${maxMb} MB.` });
  const path = `gallery/${randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage.from(GALLERY_BUCKET).createSignedUploadUrl(path);
  if (error) throw error;
  const { data: pub } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(path);
  return res.json({ bucket: GALLERY_BUCKET, path, token: data.token, url: pub.publicUrl });
}

export async function handleLibrary(req, res, supabase, admin) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
  if (req.method === 'GET') {
    if (req.query.download) return downloadLink(res, supabase, String(req.query.download));
    return listFiles(res, supabase);
  }
  if (req.method === 'POST') {
    if (body.action === 'upload-url') return uploadUrl(res, supabase, body);
    if (body.action === 'confirm') return confirmUpload(res, supabase, body, admin);
    if (body.action === 'from-url') return fromUrl(res, supabase, body, admin);
    if (body.action === 'gallery-upload-url') return galleryUploadUrl(res, supabase, body);
    return res.status(400).json({ error: 'Unknown action.' });
  }
  if (req.method === 'PATCH') return updateFile(res, supabase, body);
  if (req.method === 'DELETE') return deleteFile(res, supabase, body);
  return res.status(405).json({ error: 'Method not allowed' });
}
