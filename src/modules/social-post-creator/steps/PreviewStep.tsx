import { useState } from 'react';
import { Copy, Download } from 'lucide-react';
import { SecondaryButton } from '../../../components/ui/Button';
import { SLIDE_ROLE_LABELS, type CarouselSlide, type GeneratedCopy, type HashtagGroups, type PreviewTab, type UploadedPhoto } from '../types';

interface PreviewStepProps {
  slides: CarouselSlide[];
  analyzedPhotos: UploadedPhoto[];
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

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function PreviewStep({ slides, analyzedPhotos, copy, hashtags, onCopied }: PreviewStepProps) {
  const [tab, setTab] = useState<PreviewTab>('carousel');
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
        <div className="space-y-3">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {slides.map((slide, index) => {
              const photo = analyzedPhotos[slide.photoIndex];
              return (
                <div key={slide._key} className="w-40 shrink-0">
                  <div className="relative aspect-square overflow-hidden rounded-xl border border-navy-100 bg-navy-50">
                    {photo && <img src={photo.dataUrl} alt="" className="h-full w-full object-cover" />}
                    {slide.hasText && slide.text && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-900/80 to-transparent p-2">
                        <p className="text-[11px] font-bold leading-snug text-white">{slide.text}</p>
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-navy-400">
                    {index + 1} · {SLIDE_ROLE_LABELS[slide.role]}
                  </p>
                  {photo && (
                    <SecondaryButton
                      size="sm"
                      className="mt-1 w-full"
                      onClick={() => downloadDataUrl(photo.dataUrl, `slide-${index + 1}.jpg`)}
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </SecondaryButton>
                  )}
                </div>
              );
            })}
          </div>
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
