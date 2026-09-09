import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { RefreshCw } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '../../../components/ui/Button';
import { SortableSlideCard } from '../components/SortableSlideCard';
import { ErrorBlock, LoadingBlock } from '../components/StatusBlock';
import type { CarouselSlide, UploadedPhoto } from '../types';

interface CarouselStepProps {
  slides: CarouselSlide[];
  analyzedPhotos: UploadedPhoto[];
  isLoading: boolean;
  error: string | null;
  onChangeSlides: (slides: CarouselSlide[]) => void;
  onRegenerate: () => void;
  onContinue: () => void;
}

export function CarouselStep({ slides, analyzedPhotos, isLoading, error, onChangeSlides, onRegenerate, onContinue }: CarouselStepProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = slides.findIndex((s) => s._key === active.id);
    const to = slides.findIndex((s) => s._key === over.id);
    if (from === -1 || to === -1) return;
    onChangeSlides(arrayMove(slides, from, to));
  };

  const updateSlide = (key: string, patch: Partial<CarouselSlide>) => {
    onChangeSlides(slides.map((s) => (s._key === key ? { ...s, ...patch } : s)));
  };

  const removeSlide = (key: string) => {
    onChangeSlides(slides.filter((s) => s._key !== key));
  };

  if (isLoading) return <LoadingBlock message="Recommending your carousel sequence…" />;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-navy-900">Carousel sequence</h2>
          <p className="mt-1 text-sm text-navy-400">
            Reorder slides, change a slide's role, or turn text on/off — text is optional on every slide.
          </p>
        </div>
        <SecondaryButton size="sm" onClick={onRegenerate}>
          <RefreshCw className="h-4 w-4" /> Regenerate
        </SecondaryButton>
      </div>

      {error && <ErrorBlock message={error} onRetry={onRegenerate} />}

      {slides.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-navy-100 bg-white py-10 text-center text-sm text-navy-400">
          No carousel slides yet.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
          <SortableContext items={slides.map((s) => s._key)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {slides.map((slide, index) => (
                <SortableSlideCard
                  key={slide._key}
                  slide={slide}
                  index={index}
                  photo={analyzedPhotos[slide.photoIndex]}
                  onChange={(patch) => updateSlide(slide._key, patch)}
                  onRemove={() => removeSlide(slide._key)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="flex justify-end">
        <PrimaryButton onClick={onContinue} disabled={slides.length === 0}>
          Continue to Copy
        </PrimaryButton>
      </div>
    </div>
  );
}
