import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { UploadedPhoto } from '../types';

interface SortablePhotoThumbProps {
  photo: UploadedPhoto;
  index: number;
  onRemove: () => void;
}

/**
 * Horizontal drag-reorder thumbnail — a sibling to checklist-builder's
 * SortableRow (same useSortable/grip pattern), not a shared import: that
 * component is a vertical list row, this is an image-first horizontal
 * thumbnail, a genuinely different layout per the Component Evolution Rule.
 */
export function SortablePhotoThumb({ photo, index, onRemove }: SortablePhotoThumbProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo._key });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group relative aspect-square w-28 shrink-0 overflow-hidden rounded-xl border border-navy-100 bg-white shadow-sm sm:w-32',
        isDragging && 'opacity-50 shadow-cardHover'
      )}
    >
      <img src={photo.dataUrl} alt={photo.name} className="h-full w-full object-cover" />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-1">
        <button
          type="button"
          className="flex h-6 w-6 cursor-grab items-center justify-center rounded-md bg-navy-900/60 text-white active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-6 w-6 items-center justify-center rounded-md bg-navy-900/60 text-white hover:bg-red-600"
          aria-label="Remove photo"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <span className="absolute bottom-1 left-1 rounded bg-navy-900/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
        {index + 1}
      </span>
    </div>
  );
}
