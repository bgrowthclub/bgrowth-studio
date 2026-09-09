import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { SLIDE_ROLE_LABELS, type CarouselSlide, type UploadedPhoto } from '../types';

interface SortableSlideCardProps {
  slide: CarouselSlide;
  index: number;
  photo: UploadedPhoto | undefined;
  onChange: (patch: Partial<CarouselSlide>) => void;
  onRemove: () => void;
}

/**
 * Vertical drag-reorder card for one carousel slide — a sibling to
 * checklist-builder's SortableRow (same grip/useSortable pattern), kept
 * local to this module rather than imported across modules, so Social Post
 * Creator has zero file-level dependency on checklist-builder.
 */
export function SortableSlideCard({ slide, index, photo, onChange, onRemove }: SortableSlideCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide._key });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex gap-3 rounded-xl border border-navy-100 bg-white p-3',
        isDragging && 'opacity-50 shadow-cardHover'
      )}
    >
      <button
        type="button"
        className="mt-1 flex h-8 w-6 shrink-0 cursor-grab items-center justify-center rounded text-navy-300 hover:text-navy-500 active:cursor-grabbing"
        aria-label="Drag to reorder slide"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-navy-100 bg-navy-50">
        {photo ? (
          <img src={photo.dataUrl} alt={photo.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-navy-300">No photo</div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-navy-800">Slide {index + 1}</span>
          <button type="button" onClick={onRemove} className="text-navy-300 hover:text-red-600" aria-label="Remove slide">
            <X className="h-4 w-4" />
          </button>
        </div>

        <Select
          value={slide.role}
          onChange={(e) => onChange({ role: e.target.value as CarouselSlide['role'] })}
          aria-label="Slide role"
        >
          {Object.entries(SLIDE_ROLE_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </Select>

        <label className="flex items-center gap-2 text-xs font-medium text-navy-600">
          <input
            type="checkbox"
            checked={slide.hasText}
            onChange={(e) => onChange({ hasText: e.target.checked })}
            className="h-4 w-4 rounded border-navy-200 text-brand focus:ring-brand/40"
          />
          Photo + text
        </label>

        {slide.hasText && (
          <Textarea
            value={slide.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Short text overlay for this slide..."
            className="min-h-[60px] text-sm"
          />
        )}
      </div>
    </div>
  );
}
