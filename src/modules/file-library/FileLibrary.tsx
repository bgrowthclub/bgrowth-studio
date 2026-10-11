import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Download, FileText, FolderOpen, Image as ImageIcon, Link2, Loader2, Pencil, Search, Trash2, Upload, X } from 'lucide-react';
import { Button, PrimaryButton } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { deleteFile, getDownloadUrl, importFromUrl, listFiles, updateFile, uploadFile } from './api';
import { WIX_FILES } from './wixFiles';
import type { LibraryFile } from './types';

interface FileLibraryProps {
  onHome?: () => void;
}

type Status = { name: string; state: 'waiting' | 'working' | 'done' | 'skipped' | 'error'; note?: string };

const NO_FOLDER = '__none__';
// Wix files skipped as exact copies of one already stored (kept so the
// "Import from Wix" button doesn't keep offering them).
const WIX_SKIPPED_KEY = 'studio.files.wixSkipped';

function readSkipped(): string[] {
  try {
    return JSON.parse(localStorage.getItem(WIX_SKIPPED_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}
const SOURCE_LABEL: Record<LibraryFile['source'], string> = { upload: 'Uploaded', wix: 'Wix', link: 'Link' };

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Studio → Files: the one place every PDF/image BGrowth sells or uses is
 * stored (Portal migration 0049, private bucket). Kits, single-PDF
 * products, bundles and apps will point to these files. Admin-only; every
 * call goes through /api/access-management?resource=library.
 */
export function FileLibrary({ onHome }: FileLibraryProps) {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [folder, setFolder] = useState<string>('all');
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [busy, setBusy] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string; folder: string } | null>(null);
  const [toDelete, setToDelete] = useState<LibraryFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [wixSkipped, setWixSkipped] = useState<string[]>(readSkipped);

  useEffect(() => {
    listFiles()
      .then(setFiles)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the files.'))
      .finally(() => setLoading(false));
  }, []);

  const folders = useMemo(
    () => Array.from(new Set(files.flatMap((f) => (f.folder ? [f.folder] : [])))).sort((a, b) => a.localeCompare(b)),
    [files],
  );
  const hasLoose = files.some((f) => !f.folder);
  // New files go into the folder being viewed.
  const targetFolder = folder === 'all' || folder === NO_FOLDER ? null : folder;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return files.filter(
      (f) =>
        (folder === 'all' || (folder === NO_FOLDER ? !f.folder : f.folder === folder)) &&
        (!q || f.name.toLowerCase().includes(q) || (f.folder ?? '').toLowerCase().includes(q)),
    );
  }, [files, folder, query]);

  const importedWix = new Set(files.filter((f) => f.source === 'wix').map((f) => f.source_url));
  const wixLeft = WIX_FILES.filter((w) => !importedWix.has(w.url) && !wixSkipped.includes(w.url));

  const addFile = (file: LibraryFile) => setFiles((prev) => [file, ...prev.filter((f) => f.id !== file.id)]);
  const setStatus = (i: number, patch: Partial<Status>) =>
    setStatuses((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  // Runs one step per item, in order, showing each item's result.
  async function runAll<T>(items: T[], label: (item: T) => string, step: (item: T, i: number) => Promise<void>) {
    setBusy(true);
    setError(null);
    setStatuses(items.map((item) => ({ name: label(item), state: 'waiting' })));
    for (let i = 0; i < items.length; i++) {
      setStatus(i, { state: 'working' });
      try {
        await step(items[i], i);
      } catch (err) {
        setStatus(i, { state: 'error', note: err instanceof Error ? err.message : 'Failed.' });
      }
    }
    setBusy(false);
  }

  function uploadMany(list: FileList | null) {
    if (!list?.length) return;
    void runAll(Array.from(list), (f) => f.name, async (f, i) => {
      addFile(await uploadFile(f, targetFolder));
      setStatus(i, { state: 'done' });
    });
    if (inputRef.current) inputRef.current.value = '';
  }

  function importLink() {
    const url = link.trim();
    if (!url) return;
    setLinkOpen(false);
    setLink('');
    void runAll([url], (u) => u, async (u, i) => {
      const result = await importFromUrl({ url: u, folder: targetFolder, source: 'link' });
      if (result.skipped) setStatus(i, { state: 'skipped', note: `already in the library as "${result.duplicateOf.name}"` });
      else {
        addFile(result.file);
        setStatus(i, { state: 'done', note: result.file.name });
      }
    });
  }

  function importWix() {
    void runAll(wixLeft, (w) => w.name, async (w, i) => {
      const result = await importFromUrl({ url: w.url, name: w.name, folder: w.folder, source: 'wix' });
      if (result.skipped) {
        setStatus(i, { state: 'skipped', note: `same file as "${result.duplicateOf.name}"` });
        setWixSkipped((prev) => {
          const next = [...prev, w.url];
          try {
            localStorage.setItem(WIX_SKIPPED_KEY, JSON.stringify(next));
          } catch {
            /* only a convenience */
          }
          return next;
        });
      }
      else {
        addFile(result.file);
        setStatus(i, { state: 'done' });
      }
    });
  }

  async function download(file: LibraryFile) {
    try {
      window.open(await getDownloadUrl(file.id), '_blank', 'noopener');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download.');
    }
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      addFile(await updateFile(editing.id, { name: editing.name, folder: editing.folder.trim() || null }));
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    }
  }

  async function confirmDelete() {
    const file = toDelete;
    setToDelete(null);
    if (!file) return;
    try {
      await deleteFile(file.id);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete.');
    }
  }

  const doneCount = statuses.filter((s) => s.state === 'done').length;
  const pill = (key: string, label: string) => (
    <button
      key={key}
      type="button"
      onClick={() => setFolder(key)}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
        folder === key ? 'bg-brand text-white' : 'bg-white text-navy-600 ring-1 ring-navy-100 hover:bg-navy-50'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#f4f6fb] font-sans">
      <header className="flex items-center gap-3 border-b border-navy-100 bg-white px-4 py-4 sm:px-6">
        <button type="button" onClick={onHome} className="flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800">
          <ArrowLeft className="h-4 w-4" /> Home
        </button>
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-brand-600" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">BGrowth Studio</p>
            <h1 className="text-sm font-extrabold text-navy-900">Files</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <p className="mb-5 max-w-2xl text-sm text-navy-500">
          Every PDF and image BGrowth sells or uses, stored once and kept private. Kits, single PDFs, bundles and apps will use the files from here.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <PrimaryButton type="button" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Upload files
          </PrimaryButton>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="application/pdf,image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            className="sr-only"
            onChange={(e) => uploadMany(e.target.files)}
          />
          <Button type="button" size="sm" disabled={busy} onClick={() => setLinkOpen((v) => !v)}>
            <Link2 className="h-4 w-4" /> Add from link
          </Button>
          {!loading && wixLeft.length > 0 && (
            <Button type="button" size="sm" disabled={busy} onClick={importWix}>
              <Download className="h-4 w-4" /> Import from Wix ({wixLeft.length})
            </Button>
          )}
          {targetFolder && <span className="text-xs text-navy-400">New files go to “{targetFolder}”.</span>}
        </div>

        {linkOpen && (
          <div className="mt-3 flex max-w-2xl gap-2">
            <input
              autoFocus
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && importLink()}
              placeholder="https://… link to a PDF or image"
              className="h-9 flex-1 rounded-lg border border-navy-100 bg-white px-3 text-sm outline-none focus:border-brand"
            />
            <PrimaryButton type="button" size="sm" onClick={importLink}>
              Add
            </PrimaryButton>
          </div>
        )}

        {statuses.length > 0 && (
          <div className="mt-4 rounded-xl border border-navy-100 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-navy-400">
                {busy ? 'Working…' : 'Done'} — {doneCount} of {statuses.length} added
              </p>
              {!busy && (
                <button type="button" onClick={() => setStatuses([])} className="text-navy-400 hover:text-navy-700" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <ul className="max-h-60 space-y-1 overflow-y-auto text-[13px]">
              {statuses.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 w-4 shrink-0">
                    {s.state === 'working' && <Loader2 className="h-4 w-4 animate-spin text-brand" />}
                    {s.state === 'done' && <Check className="h-4 w-4 text-emerald-600" />}
                    {s.state === 'error' && <X className="h-4 w-4 text-red-500" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-navy-700">{s.name}</span>
                  <span className={`shrink-0 ${s.state === 'error' ? 'text-red-500' : 'text-navy-400'}`}>
                    {s.state === 'waiting' && 'waiting'}
                    {s.state === 'skipped' && `skipped — ${s.note}`}
                    {s.state === 'error' && s.note}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <div className="relative mr-2">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-navy-300" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files"
              className="h-9 w-56 rounded-lg border border-navy-100 bg-white pl-8 pr-3 text-sm outline-none focus:border-brand"
            />
          </div>
          {pill('all', `All (${files.length})`)}
          {folders.map((f) => pill(f, f))}
          {hasLoose && pill(NO_FOLDER, 'No folder')}
        </div>

        <datalist id="library-folders">
          {folders.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>

        <div className="mt-4 overflow-hidden rounded-xl border border-navy-100 bg-white">
          {loading && <p className="p-6 text-sm text-navy-400">Loading…</p>}
          {!loading && shown.length === 0 && (
            <p className="p-6 text-sm text-navy-400">{files.length ? 'No files match.' : 'No files yet — upload some or import them from Wix.'}</p>
          )}
          {shown.map((f) => {
            const isEditing = editing?.id === f.id;
            const Icon = f.mime_type.startsWith('image/') ? ImageIcon : FileText;
            return (
              <div key={f.id} className="flex flex-wrap items-center gap-3 border-t border-navy-50 px-4 py-3 first:border-t-0">
                <Icon className="h-5 w-5 shrink-0 text-brand-600" />
                {isEditing ? (
                  <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                    <input
                      autoFocus
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && void saveEdit()}
                      className="h-8 min-w-[220px] flex-1 rounded-lg border border-navy-100 px-2 text-sm outline-none focus:border-brand"
                      aria-label="File name"
                    />
                    <input
                      list="library-folders"
                      value={editing.folder}
                      onChange={(e) => setEditing({ ...editing, folder: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && void saveEdit()}
                      placeholder="Folder"
                      className="h-8 w-44 rounded-lg border border-navy-100 px-2 text-sm outline-none focus:border-brand"
                      aria-label="Folder"
                    />
                    <PrimaryButton type="button" size="sm" className="h-8" onClick={() => void saveEdit()}>
                      Save
                    </PrimaryButton>
                    <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-900">{f.name}</p>
                    <p className="text-xs text-navy-400">
                      {f.folder ?? 'No folder'} · {formatSize(f.size_bytes)} · {SOURCE_LABEL[f.source]} · {new Date(f.created_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {!isEditing && (
                  <div className="flex items-center gap-1">
                    <Button type="button" size="sm" variant="ghost" title="Download" aria-label={`Download ${f.name}`} onClick={() => void download(f)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      title="Rename / move to folder"
                      aria-label={`Rename ${f.name}`}
                      onClick={() => setEditing({ id: f.id, name: f.name, folder: f.folder ?? '' })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="sm" variant="ghost" title="Delete" aria-label={`Delete ${f.name}`} onClick={() => setToDelete(f)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this file?"
        description={`"${toDelete?.name ?? ''}" will be removed from the library for good.`}
        confirmLabel="Delete"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
