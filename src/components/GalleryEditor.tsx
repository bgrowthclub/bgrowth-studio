import { useState } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, Link2, Loader2, Video, X } from 'lucide-react';
import { MAX_GALLERY_IMAGES, uploadGalleryFile } from '../lib/productGallery';
import type { ProductGallery } from '../lib/productGallery';

interface GalleryEditorProps {
  value: ProductGallery;
  onChange: (next: ProductGallery) => void;
}

/**
 * The product page gallery in the publish screens: up to 6 images (in the
 * order shown) and one short video, by link or uploaded. Files upload as
 * soon as they're chosen; the gallery is saved with the next Publish.
 */
export default function GalleryEditor({ value, onChange }: GalleryEditorProps) {
  const [busy, setBusy] = useState<'images' | 'video' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoLink, setVideoLink] = useState(value.video?.kind === 'link' ? value.video.url : '');
  const room = MAX_GALLERY_IMAGES - value.images.length;

  async function addImages(list: FileList | null) {
    const files = Array.from(list ?? []).slice(0, room);
    if (!files.length) return;
    setBusy('images');
    setError(null);
    const added: string[] = [];
    try {
      for (const file of files) added.push(await uploadGalleryFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      if (added.length) onChange({ ...value, images: [...value.images, ...added] });
      setBusy(null);
    }
  }

  async function uploadVideo(file: File | undefined) {
    if (!file) return;
    setBusy('video');
    setError(null);
    try {
      onChange({ ...value, video: { kind: 'file', url: await uploadGalleryFile(file) } });
      setVideoLink('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(null);
    }
  }

  function saveLink(link: string) {
    setVideoLink(link);
    const url = link.trim();
    if (!url) {
      if (value.video?.kind === 'link') onChange({ ...value, video: null });
      return;
    }
    if (/^https:\/\//i.test(url)) onChange({ ...value, video: { kind: 'link', url } });
  }

  const move = (i: number, to: number) => {
    const images = [...value.images];
    const [item] = images.splice(i, 1);
    images.splice(to, 0, item);
    onChange({ ...value, images });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {value.images.map((url, i) => (
          <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-navy-100 bg-navy-50">
            <img src={url} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-navy-900/50 px-1 py-0.5 opacity-0 transition group-hover:opacity-100">
              <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} className="text-white disabled:opacity-30" aria-label="Move left">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button type="button" disabled={i === value.images.length - 1} onClick={() => move(i, i + 1)} className="text-white disabled:opacity-30" aria-label="Move right">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => onChange({ ...value, images: value.images.filter((_, j) => j !== i) })}
              className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-navy-600 shadow hover:text-red-500"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {room > 0 && (
          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-navy-200 text-[11px] font-semibold text-navy-400 hover:bg-navy-50">
            {busy === 'images' ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            {busy === 'images' ? 'Uploading' : `Add (${room})`}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              className="hidden"
              disabled={busy !== null}
              onChange={(e) => {
                void addImages(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Link2 className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-navy-300" />
          <input
            value={videoLink}
            onChange={(e) => saveLink(e.target.value)}
            placeholder="Video link (YouTube, TikTok or Instagram)"
            className="h-8 w-full rounded-lg border border-navy-100 bg-white pl-8 pr-2 text-xs outline-none focus:border-brand"
          />
        </div>
        <span className="text-xs text-navy-300">or</span>
        <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-navy-100 bg-white px-3 text-xs font-semibold text-navy-700 shadow-sm hover:bg-navy-50">
          {busy === 'video' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5" />}
          {busy === 'video' ? 'Uploading…' : 'Upload video'}
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            disabled={busy !== null}
            onChange={(e) => {
              void uploadVideo(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {value.video?.kind === 'file' && (
        <div className="flex items-center gap-2">
          <video src={value.video.url} className="h-20 rounded-lg border border-navy-100" muted />
          <button type="button" onClick={() => onChange({ ...value, video: null })} className="flex items-center gap-1 text-xs font-medium text-navy-400 hover:text-red-500">
            <X className="h-3 w-3" /> Remove video
          </button>
        </div>
      )}
      <p className="text-[11px] text-navy-300">Images up to 10 MB, video up to 50 MB (a short clip). Saved when you publish.</p>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
