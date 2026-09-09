import { useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { ImagePlus, UploadCloud } from 'lucide-react';
import { PrimaryButton } from '../../../components/ui/Button';
import { compressImage } from '../../../lib/utils';
import { SortablePhotoThumb } from '../components/SortablePhotoThumb';
import { ErrorBlock } from '../components/StatusBlock';
import type { UploadedPhoto } from '../types';

const MAX_PHOTOS = 10;

interface PhotoUploadStepProps {
  photos: UploadedPhoto[];
  onChangePhotos: (photos: UploadedPhoto[]) => void;
  onContinue: () => void;
  isAnalyzing: boolean;
  analyzeError: string | null;
}

export function PhotoUploadStep({ photos, onChangePhotos, onContinue, isAnalyzing, analyzeError }: PhotoUploadStepProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const addFiles = async (fileList: FileList | File[]) => {
    setProcessingError(null);
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      setProcessingError(`You can upload up to ${MAX_PHOTOS} photos. Remove one before adding another.`);
      return;
    }

    try {
      const toAdd = await Promise.all(
        files.slice(0, room).map(async (file) => {
          const { base64, sizeKB } = await compressImage(file);
          const photo: UploadedPhoto = {
            _key: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            dataUrl: base64,
            sizeKB,
          };
          return photo;
        })
      );
      onChangePhotos([...photos, ...toAdd]);
    } catch (err) {
      setProcessingError(err instanceof Error ? err.message : 'Could not process one of those images.');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = photos.findIndex((p) => p._key === active.id);
    const to = photos.findIndex((p) => p._key === over.id);
    if (from === -1 || to === -1) return;
    onChangePhotos(arrayMove(photos, from, to));
  };

  const removePhoto = (key: string) => {
    onChangePhotos(photos.filter((p) => p._key !== key));
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-navy-900">Upload your photos</h2>
        <p className="mt-1 text-sm text-navy-400">
          Add the photos you want to turn into a post. We'll analyze them together as a set, then help you build a
          carousel, copy, and hashtags from them.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingOver(false);
          if (e.dataTransfer.files.length > 0) void addFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          isDraggingOver ? 'border-brand bg-brand-50' : 'border-navy-200 bg-navy-50/50 hover:border-navy-300'
        }`}
      >
        <UploadCloud className="h-8 w-8 text-navy-400" />
        <p className="text-sm font-semibold text-navy-700">Drag and drop photos here, or click to browse</p>
        <p className="text-xs text-navy-400">JPEG/PNG · up to {MAX_PHOTOS} photos</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {processingError && <ErrorBlock message={processingError} />}

      {photos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-navy-100 bg-white py-10 text-center text-sm text-navy-400">
          No photos yet — add some above to get started.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToHorizontalAxis]} onDragEnd={handleDragEnd}>
          <SortableContext items={photos.map((p) => p._key)} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {photos.map((photo, index) => (
                <SortablePhotoThumb key={photo._key} photo={photo} index={index} onRemove={() => removePhoto(photo._key)} />
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-navy-200 text-navy-300 hover:border-brand hover:text-brand sm:w-32"
                >
                  <ImagePlus className="h-6 w-6" />
                  <span className="text-[11px] font-semibold">Add</span>
                </button>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {analyzeError && <ErrorBlock message={analyzeError} />}

      <div className="flex justify-end">
        <PrimaryButton onClick={onContinue} disabled={photos.length === 0 || isAnalyzing}>
          {isAnalyzing ? 'Analyzing photos…' : 'Analyze Photos & Continue'}
        </PrimaryButton>
      </div>
    </div>
  );
}
