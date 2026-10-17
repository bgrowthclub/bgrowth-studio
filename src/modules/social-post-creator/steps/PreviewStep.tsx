import { useEffect, useState } from 'react';
import { Copy, Download, Loader2, Share2 } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '../../../components/ui/Button';
import {
  DEFAULT_SLIDE_FORMAT,
  SLIDE_FORMATS,
  SLIDE_ROLE_LABELS,
  type CarouselSlide,
  type GeneratedCopy,
  type HashtagGroups,
  type Platform,
  type PreviewTab,
  type SlideFormat,
  type UploadedPhoto,
} from '../types';
import {
  canShareFiles,
  downloadBlob,
  downloadDataUrl,
  renderSlide,
  slideFileName,
  slideFiles,
  zipSlides,
} from '../lib/slideImages';

interface PreviewStepProps {
  slides: CarouselSlide[];
  analyzedPhotos: UploadedPhoto[];
  platform: Platform | null;
  copy: GeneratedCopy;
  hashtags: HashtagGroups;
  onCopied: (message: string) => void;
}

const TABS: { id: PreviewTab; label: string }[] = [
  { id: 'carousel', label: 'Carousel' },
  { id: 'caption', label: 'Caption' },
  { id: 'hashtags', label: 'Hashtags' },
  { id: 'cta', label: 'CTA' },
];

function flatHashtags(hashtags: HashtagGroups): string[] {
  return [...hashtags.niche, ...hashtags.product, ...hashtags.audience, ...hashtags.location, ...hashtags.brand];
}

async function copyText(text: string, onCopied: (message: string) => void, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    onCopied(`${label} copied ✓`);
  } catch {
    onCopied('Could not copy — your browser blocked clipboard access.');
  }
}

export function PreviewStep({ slides, analyzedPhotos, platform, copy, hashtags, onCopied }: PreviewStepProps) {
  const [tab, setTab] = useState<PreviewTab>('carousel');
  const [format, setFormat] = useState<SlideFormat>(platform ? DEFAULT_SLIDE_FORMAT[platform] : 'portrait');
  // The finished slide images (photo cropped to the format + its text), in slide order.
  const [rendered, setRendered] = useState<(string | null)[]>([]);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'zip' | 'share' | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRendered([]);
    setRenderError(null);
    Promise.all(
      slides.map((slide) => {
        const photo = analyzedPhotos[slide.photoIndex];
        if (!photo) return Promise.resolve(null);
        return renderSlide(photo.exportDataUrl || photo.dataUrl, slide.hasText ? slide.text : '', format);
      }),
    )
      .then((images) => {
        if (!cancelled) setRendered(images);
      })
      .catch((err: unknown) => {
        if (!cancelled) setRenderError(err instanceof Error ? err.message : 'Could not create the slide images.');
      });
    return () => {
      cancelled = true;
    };
  }, [slides, analyzedPhotos, format]);

  const ready = rendered.filter((img): img is string => !!img);
  const isRendering = slides.length > 0 && rendered.length === 0 && !renderError;
  const files = ready.length ? slideFiles(ready) : [];
  const shareable = files.length > 0 && canShareFiles(files);

  const downloadAll = async () => {
    setBusy('zip');
    try {
      downloadBlob(await zipSlides(ready), 'carousel.zip');
    } catch {
      onCopied('Could not create the .zip — download the slides one by one.');
    } finally {
      setBusy(null);
    }
  };

  const shareAll = async () => {
    setBusy('share');
    try {
      await navigator.share({ files });
    } catch {
      // Cancelled by the user, or the app refused — nothing to do.
    } finally {
      setBusy(null);
    }
  };
  const tags = flatHashtags(hashtags);
  const hashtagsText = tags.join(' ');
  const fullPost = [copy.phrase, '', copy.caption, '', copy.cta, '', hashtagsText].filter((line) => line !== undefined).join('\n');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-navy-900">Preview & Export</h2>
        <p className="mt-1 text-sm text-navy-400">Everything reflects your current photos, order, and edits.</p>
      </div>

      <div className="flex gap-1 rounded-xl bg-navy-50 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors ${
              tab === t.id ? 'bg-white text-navy-900 shadow-sm' : 'text-navy-400 hover:text-navy-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'carousel' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-navy-500">Size</span>
            {(Object.keys(SLIDE_FORMATS) as SlideFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  format === f ? 'bg-brand text-white' : 'bg-navy-50 text-navy-500 hover:bg-navy-100'
                }`}
              >
                {SLIDE_FORMATS[f].label}
              </button>
            ))}
          </div>

          {renderError ? (
            <p className="text-sm text-red-500">{renderError}</p>
          ) : isRendering ? (
            <p className="flex items-center gap-2 text-sm text-navy-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Creating your slides…
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {slides.map((slide, index) => {
                const image = rendered[index];
                return (
                  <div key={slide._key} className="w-40 shrink-0">
                    <div
                      className="overflow-hidden rounded-xl border border-navy-100 bg-navy-50"
                      style={{ aspectRatio: `${SLIDE_FORMATS[format].width} / ${SLIDE_FORMATS[format].height}` }}
                    >
                      {image && <img src={image} alt={`Slide ${index + 1}`} className="h-full w-full object-cover" />}
                    </div>
                    <p className="mt-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-navy-400">
                      {index + 1} · {SLIDE_ROLE_LABELS[slide.role]}
                    </p>
                    {image && (
                      <SecondaryButton size="sm" className="mt-1 w-full" onClick={() => downloadDataUrl(image, slideFileName(index))}>
                        <Download className="h-3.5 w-3.5" /> Download
                      </SecondaryButton>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {ready.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <PrimaryButton onClick={() => void downloadAll()} disabled={busy !== null}>
                {busy === 'zip' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download all (.zip)
              </PrimaryButton>
              {shareable && (
                <SecondaryButton onClick={() => void shareAll()} disabled={busy !== null}>
                  <Share2 className="h-4 w-4" /> Share to Instagram, WhatsApp…
                </SecondaryButton>
              )}
            </div>
          )}
          <p className="text-[11px] text-navy-400">
            {SLIDE_FORMATS[format].width} × {SLIDE_FORMATS[format].height} px, with each slide's text on the image. Photos are cropped from the
            centre to fit the size.
          </p>
        </div>
      )}

      {tab === 'caption' && (
        <div className="space-y-3">
          <div className="rounded-xl border border-navy-100 bg-white p-4 text-sm text-navy-700">
            <p className="font-bold text-navy-900">{copy.phrase}</p>
            <p className="mt-2 whitespace-pre-wrap">{copy.caption}</p>
          </div>
          <SecondaryButton onClick={() => copyText(`${copy.phrase}\n\n${copy.caption}`, onCopied, 'Caption')}>
            <Copy className="h-4 w-4" /> Copy Caption
          </SecondaryButton>
        </div>
      )}

      {tab === 'hashtags' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-navy-100 bg-white p-4">
            {tags.length === 0 ? (
              <span className="text-sm text-navy-400">No hashtags yet.</span>
            ) : (
              tags.map((tag) => (
                <span key={tag} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                  {tag}
                </span>
              ))
            )}
          </div>
          <SecondaryButton onClick={() => copyText(hashtagsText, onCopied, 'Hashtags')} disabled={tags.length === 0}>
            <Copy className="h-4 w-4" /> Copy Hashtags
          </SecondaryButton>
        </div>
      )}

      {tab === 'cta' && (
        <div className="space-y-3">
          <div className="rounded-xl border border-navy-100 bg-white p-4 text-sm font-semibold text-navy-800">{copy.cta}</div>
          <SecondaryButton onClick={() => copyText(copy.cta, onCopied, 'CTA')}>
            <Copy className="h-4 w-4" /> Copy CTA
          </SecondaryButton>
        </div>
      )}

      <div className="border-t border-navy-100 pt-4">
        <SecondaryButton onClick={() => copyText(fullPost, onCopied, 'Full post')}>
          <Copy className="h-4 w-4" /> Copy Complete Post (phrase + caption + CTA + hashtags)
        </SecondaryButton>
      </div>
    </div>
  );
}
