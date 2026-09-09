import { useState } from 'react';
import { Camera, Check, Menu, X } from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Toast } from '../../components/Toast';
import { PhotoUploadStep } from './steps/PhotoUploadStep';
import { ObjectivePlatformStep } from './steps/ObjectivePlatformStep';
import { CarouselStep } from './steps/CarouselStep';
import { CopyStep } from './steps/CopyStep';
import { HashtagStep } from './steps/HashtagStep';
import { PreviewStep } from './steps/PreviewStep';
import { analyzePhotos, generateCarousel, generateCopy, generateHashtags } from './api/socialPostCreatorClient';
import {
  WIZARD_STEPS,
  type CarouselSlide,
  type CopyTarget,
  type GeneratedCopy,
  type HashtagGroups,
  type PhotoAnalysis,
  type Platform,
  type PostObjective,
  type SlideRole,
  type UploadedPhoto,
  type WizardStep,
} from './types';

interface SocialPostCreatorProps {
  ownerEmail: string;
  onHome?: () => void;
}

const EMPTY_COPY: GeneratedCopy = { phrase: '', caption: '', cta: '' };
const EMPTY_HASHTAGS: HashtagGroups = { niche: [], product: [], audience: [], location: [], brand: [] };
const KNOWN_ROLES: SlideRole[] = [
  'cover',
  'product_detail',
  'context_lifestyle',
  'feature',
  'benefit',
  'story',
  'proof',
  'closing_cta',
];

function stripDataUrlPrefix(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(',');
  return commaIndex === -1 ? dataUrl : dataUrl.slice(commaIndex + 1);
}

function newKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * BGrowth Social Post Creator — internal, admin-only module for turning
 * user-provided photos into a complete social media publication (carousel +
 * copy + hashtags). A completely separate module from Content Engine (see
 * App.tsx) — no shared state, no shared API surface, no shared data model.
 * Everything generated here is session/client-side only; nothing persists
 * once the tab closes, by design for V1.
 */
export function SocialPostCreator({ ownerEmail, onHome }: SocialPostCreatorProps) {
  const [step, setStep] = useState<WizardStep>('photos');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [analyzedPhotos, setAnalyzedPhotos] = useState<UploadedPhoto[]>([]);
  const [analysis, setAnalysis] = useState<PhotoAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<UploadedPhoto[] | null>(null);

  const [objective, setObjective] = useState<PostObjective | null>(null);
  const [customObjective, setCustomObjective] = useState('');
  const [platform, setPlatform] = useState<Platform | null>(null);

  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [isCarouselLoading, setIsCarouselLoading] = useState(false);
  const [carouselError, setCarouselError] = useState<string | null>(null);

  const [copy, setCopy] = useState<GeneratedCopy>(EMPTY_COPY);
  const [isCopyLoading, setIsCopyLoading] = useState(false);
  const [regeneratingField, setRegeneratingField] = useState<CopyTarget | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const [hashtags, setHashtags] = useState<HashtagGroups>(EMPTY_HASHTAGS);
  const [isHashtagsLoading, setIsHashtagsLoading] = useState(false);
  const [hashtagsError, setHashtagsError] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    window.setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  };

  const stepIndex = WIZARD_STEPS.findIndex((s) => s.id === step);

  // Changing the photo set after an analysis already exists would silently
  // invalidate everything built on it (carousel/copy/hashtags all reference
  // the analyzed photo set) — confirm before discarding that downstream work,
  // rather than letting it silently go stale.
  const handleChangePhotos = (nextPhotos: UploadedPhoto[]) => {
    if (analysis) {
      setPendingPhotos(nextPhotos);
      setResetConfirmOpen(true);
      return;
    }
    setPhotos(nextPhotos);
  };

  const confirmPhotosChange = () => {
    if (pendingPhotos) setPhotos(pendingPhotos);
    setPendingPhotos(null);
    setResetConfirmOpen(false);
    setAnalysis(null);
    setAnalyzedPhotos([]);
    setSlides([]);
    setCopy(EMPTY_COPY);
    setHashtags(EMPTY_HASHTAGS);
    setCarouselError(null);
    setCopyError(null);
    setHashtagsError(null);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalyzeError(null);
    try {
      const images = photos.map((p) => ({ mimeType: 'image/jpeg', data: stripDataUrlPrefix(p.dataUrl) }));
      const result = await analyzePhotos(images);
      setAnalysis(result);
      setAnalyzedPhotos(photos);
      setStep('objective');
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Could not analyze these photos.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runCarouselGeneration = async () => {
    if (!analysis || !objective || !platform) return;
    setIsCarouselLoading(true);
    setCarouselError(null);
    try {
      const raw = await generateCarousel({ analysis, objective, customObjective, platform, photoCount: analyzedPhotos.length });
      const nextSlides: CarouselSlide[] = raw.map((s) => ({
        _key: newKey('slide'),
        photoIndex: s.photoIndex,
        role: KNOWN_ROLES.includes(s.role as SlideRole) ? (s.role as SlideRole) : 'feature',
        hasText: Boolean(s.suggestedText),
        text: s.suggestedText ?? '',
      }));
      setSlides(nextSlides);
    } catch (err) {
      setCarouselError(err instanceof Error ? err.message : 'Could not generate a carousel sequence.');
    } finally {
      setIsCarouselLoading(false);
    }
  };

  const handleContinueToCarousel = () => {
    setStep('carousel');
    if (slides.length === 0) void runCarouselGeneration();
  };

  const runCopyGeneration = async (target: CopyTarget) => {
    if (!analysis || !objective || !platform) return;
    if (target === 'all') setIsCopyLoading(true);
    else setRegeneratingField(target);
    setCopyError(null);
    try {
      const result = await generateCopy({
        analysis,
        objective,
        customObjective,
        platform,
        target,
        existing: target === 'all' ? undefined : copy,
      });
      setCopy((prev) => ({ ...prev, ...result }));
    } catch (err) {
      setCopyError(err instanceof Error ? err.message : 'Could not generate copy.');
    } finally {
      setIsCopyLoading(false);
      setRegeneratingField(null);
    }
  };

  const handleContinueToCopy = () => {
    setStep('copy');
    if (!copy.phrase && !copy.caption && !copy.cta) void runCopyGeneration('all');
  };

  const runHashtagsGeneration = async () => {
    if (!analysis || !objective || !platform) return;
    setIsHashtagsLoading(true);
    setHashtagsError(null);
    try {
      const result = await generateHashtags({ analysis, objective, customObjective, platform });
      setHashtags(result);
    } catch (err) {
      setHashtagsError(err instanceof Error ? err.message : 'Could not generate hashtags.');
    } finally {
      setIsHashtagsLoading(false);
    }
  };

  const handleContinueToHashtags = () => {
    setStep('hashtags');
    const hasAny = Object.values(hashtags).some((group) => group.length > 0);
    if (!hasAny) void runHashtagsGeneration();
  };

  const handleStartOver = () => {
    setStep('photos');
    setPhotos([]);
    setAnalyzedPhotos([]);
    setAnalysis(null);
    setAnalyzeError(null);
    setObjective(null);
    setCustomObjective('');
    setPlatform(null);
    setSlides([]);
    setCarouselError(null);
    setCopy(EMPTY_COPY);
    setCopyError(null);
    setHashtags(EMPTY_HASHTAGS);
    setHashtagsError(null);
  };

  const isStepReachable = (index: number) => index <= stepIndex;

  return (
    <div className="flex h-screen bg-[#f4f6fb] overflow-hidden font-sans">
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-navy-900/40 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 border-r border-navy-100 bg-white flex flex-col shrink-0 transition-transform duration-300 lg:static lg:translate-x-0 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-navy-100 px-4 py-4">
          <button
            type="button"
            onClick={() => {
              onHome?.();
              setMobileSidebarOpen(false);
            }}
            className="flex items-center gap-2 hover:opacity-80"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-black text-navy-900 uppercase tracking-wide leading-none">Social Post</p>
              <p className="text-[9px] text-navy-400 uppercase tracking-widest font-bold">Creator</p>
            </div>
          </button>
          <button type="button" onClick={() => setMobileSidebarOpen(false)} className="lg:hidden text-navy-400 hover:text-navy-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {WIZARD_STEPS.map((s, index) => {
            const isActive = step === s.id;
            const isDone = index < stepIndex;
            const reachable = isStepReachable(index);
            return (
              <button
                key={s.id}
                type="button"
                disabled={!reachable}
                onClick={() => {
                  setStep(s.id);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-brand text-white'
                    : reachable
                      ? 'text-navy-500 hover:bg-navy-50 hover:text-navy-800'
                      : 'text-navy-300 cursor-not-allowed'
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                    isActive ? 'bg-white/20' : isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-navy-100 text-navy-400'
                  }`}
                >
                  {isDone ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                {s.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-navy-100 px-4 py-3 space-y-2">
          <button type="button" onClick={handleStartOver} className="w-full text-center text-[11px] font-bold text-navy-400 hover:text-red-600">
            Start Over
          </button>
          <p className="text-[10px] text-navy-400 font-semibold truncate text-center">{ownerEmail}</p>
        </div>
      </aside>

      <main className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <header className="flex shrink-0 items-center gap-3 border-b border-navy-100 bg-white px-4 py-3 sm:px-6">
          <button type="button" onClick={() => setMobileSidebarOpen(true)} className="lg:hidden p-2 text-navy-500 hover:text-navy-800 rounded-lg">
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">BGrowth Studio</p>
            <h1 className="text-sm font-extrabold text-navy-900">{WIZARD_STEPS[stepIndex]?.label}</h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-3xl">
            {step === 'photos' && (
              <PhotoUploadStep
                photos={photos}
                onChangePhotos={handleChangePhotos}
                onContinue={handleAnalyze}
                isAnalyzing={isAnalyzing}
                analyzeError={analyzeError}
              />
            )}
            {step === 'objective' && (
              <ObjectivePlatformStep
                objective={objective}
                customObjective={customObjective}
                platform={platform}
                onChangeObjective={setObjective}
                onChangeCustomObjective={setCustomObjective}
                onChangePlatform={setPlatform}
                onContinue={handleContinueToCarousel}
              />
            )}
            {step === 'carousel' && (
              <CarouselStep
                slides={slides}
                analyzedPhotos={analyzedPhotos}
                isLoading={isCarouselLoading}
                error={carouselError}
                onChangeSlides={setSlides}
                onRegenerate={() => void runCarouselGeneration()}
                onContinue={handleContinueToCopy}
              />
            )}
            {step === 'copy' && (
              <CopyStep
                copy={copy}
                isLoading={isCopyLoading}
                regeneratingField={regeneratingField}
                error={copyError}
                onChange={(patch) => setCopy((prev) => ({ ...prev, ...patch }))}
                onRegenerate={(target) => void runCopyGeneration(target)}
                onContinue={handleContinueToHashtags}
              />
            )}
            {step === 'hashtags' && (
              <HashtagStep
                hashtags={hashtags}
                isLoading={isHashtagsLoading}
                error={hashtagsError}
                onChange={setHashtags}
                onRegenerate={() => void runHashtagsGeneration()}
                onContinue={() => setStep('preview')}
              />
            )}
            {step === 'preview' && (
              <PreviewStep slides={slides} analyzedPhotos={analyzedPhotos} copy={copy} hashtags={hashtags} onCopied={showToast} />
            )}
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={resetConfirmOpen}
        title="Change your photos?"
        description="Changing the photo set will clear the carousel, copy, and hashtags already generated from it."
        confirmLabel="Change Photos"
        onConfirm={confirmPhotosChange}
        onCancel={() => {
          setPendingPhotos(null);
          setResetConfirmOpen(false);
        }}
      />
      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
