import {
  Plus, Trash2, GripVertical, ChevronUp, ChevronDown, ChevronRight,
  MoreVertical, Copy, Lock, Unlock, BringToFront, SendToBack, Move,
} from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { type PlannerSection, type PlannerBlock, BLOCK_TYPE_INFO } from './types';
import { cn } from '../../lib/utils';

/**
 * Class name react-rnd's `dragHandleClassName` targets — applied only to
 * the small grip icon in the canvas variant's header, never to the whole
 * header. Every other header control (title/icon/description inputs,
 * collapse, duplicate, delete, lock, front/back) stays independently
 * clickable without starting a section drag.
 */
export const SECTION_DRAG_HANDLE_CLASS = 'planner-section-drag-handle';

// ─── Block Row (inside section) ──────────────────────────────────
function BlockRow({
  block,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
}: {
  block: PlannerBlock;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-all cursor-pointer',
        isDragging && 'opacity-50 shadow-lg',
        isSelected
          ? 'border-brand bg-brand-50'
          : 'border-navy-100 bg-white hover:border-brand/40 hover:bg-navy-50',
        !block.enabled && 'opacity-50'
      )}
      onClick={onSelect}
    >
      <button
        type="button"
        className="cursor-grab text-navy-300 active:cursor-grabbing shrink-0"
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <span className="text-base shrink-0">{block.icon}</span>
      <span className="flex-1 text-sm font-medium text-navy-800 truncate">{block.title}</span>

      <span
        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
        style={{ background: block.color }}
      >
        {BLOCK_TYPE_INFO[block.config.type]?.label ?? block.config.type}
      </span>

      <button
        type="button"
        onClick={e => { e.stopPropagation(); onDuplicate(); }}
        title="Duplicate block"
        className="shrink-0 text-navy-300 hover:text-brand transition-colors"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onDelete(); }}
        title="Delete block"
        className="shrink-0 text-navy-300 hover:text-red-500 transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Section Editor ────────────────────────────────────────────────
// The section body — header (icon/title/description), collapse, block
// list + DnD reorder, add/duplicate/delete block — used identically by
// both the List view and the Canvas view (PlannerSectionCanvas wraps
// this in an <Rnd>; the List view wraps it in a plain flow div). This is
// the single implementation of "what a section looks like while being
// edited" — SECTION positioning differs between the two callers, but the
// structured BLOCK content inside never does.
export interface SectionEditorProps {
  section: PlannerSection;
  variant: 'list' | 'canvas';
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onDeleteBlock: (id: string) => void;
  onDuplicateBlock: (id: string) => void;
  onAddBlock: (sectionId: string) => void;
  onUpdateSection: (partial: Partial<PlannerSection>) => void;
  onDeleteSection: () => void;
  onDuplicateSection: () => void;
  onReorderBlocks: (from: number, to: number) => void;
  // List-only controls
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  // Canvas-only controls
  locked?: boolean;
  onToggleLock?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
}

export function SectionCard({
  section,
  variant,
  selectedBlockId,
  onSelectBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onAddBlock,
  onUpdateSection,
  onDeleteSection,
  onDuplicateSection,
  onReorderBlocks,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  locked,
  onToggleLock,
  onBringToFront,
  onSendToBack,
}: SectionEditorProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = section.blocks.findIndex(b => b.id === active.id);
    const to = section.blocks.findIndex(b => b.id === over.id);
    onReorderBlocks(from, to);
  };

  const isCanvas = variant === 'canvas';

  return (
    <div className={cn(
      'rounded-2xl border bg-white shadow-card overflow-hidden',
      isCanvas ? 'flex h-full flex-col' : '',
      locked ? 'border-amber-300' : 'border-navy-100',
    )}>
      {/* Section header */}
      <div className="flex items-center gap-2 border-b border-navy-100 px-3 py-2.5 shrink-0">
        {isCanvas ? (
          <span
            className={cn(SECTION_DRAG_HANDLE_CLASS, 'flex shrink-0 items-center justify-center rounded p-0.5 text-navy-300',
              locked ? 'cursor-not-allowed opacity-40' : 'cursor-grab active:cursor-grabbing hover:text-navy-600')}
            title={locked ? 'Section is locked' : 'Drag to move section'}
          >
            <Move className="h-3.5 w-3.5" />
          </span>
        ) : (
          <div className="flex flex-col shrink-0">
            <button type="button" disabled={isFirst} onClick={onMoveUp} title="Move section up" className="text-navy-300 hover:text-navy-600 disabled:opacity-20">
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button type="button" disabled={isLast} onClick={onMoveDown} title="Move section down" className="text-navy-300 hover:text-navy-600 disabled:opacity-20">
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <input
          type="text"
          value={section.icon}
          maxLength={4}
          onChange={e => onUpdateSection({ icon: e.target.value })}
          title="Section icon (emoji)"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-center text-base focus:outline-none focus:ring-2 focus:ring-brand/30"
        />

        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={section.title}
            onChange={e => onUpdateSection({ title: e.target.value })}
            placeholder="Section title"
            className="w-full truncate text-sm font-bold text-navy-800 bg-transparent focus:outline-none placeholder-navy-300"
          />
          <p className="text-[11px] text-navy-400">{section.blocks.length} block{section.blocks.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {isCanvas && (
            <>
              <button type="button" onClick={onBringToFront} title="Bring to front"
                className="rounded-lg p-1 text-navy-400 hover:bg-navy-50 hover:text-navy-700">
                <BringToFront className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={onSendToBack} title="Send to back"
                className="rounded-lg p-1 text-navy-400 hover:bg-navy-50 hover:text-navy-700">
                <SendToBack className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={onToggleLock} title={locked ? 'Unlock section' : 'Lock section'}
                className={cn('rounded-lg p-1 hover:bg-navy-50', locked ? 'text-amber-500' : 'text-navy-400 hover:text-navy-700')}>
                {locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => onUpdateSection({ collapsed: !section.collapsed })}
            title={section.collapsed ? 'Expand section' : 'Collapse section'}
            className="rounded-lg p-1 text-navy-400 hover:bg-navy-50 hover:text-navy-700"
          >
            <ChevronRight className={cn('h-4 w-4 transition-transform', !section.collapsed && 'rotate-90')} />
          </button>
          <button
            type="button"
            onClick={onDuplicateSection}
            title="Duplicate section"
            className="rounded-lg p-1 text-navy-400 hover:bg-navy-50 hover:text-brand"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDeleteSection}
            title="Delete section"
            className="rounded-lg p-1 text-navy-300 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!section.collapsed && (
        <div className={cn('p-3', isCanvas && 'flex-1 overflow-y-auto')}>
          <input
            type="text"
            value={section.description}
            onChange={e => onUpdateSection({ description: e.target.value })}
            placeholder="Section description (optional)"
            className="mb-3 w-full rounded-lg border border-transparent bg-navy-50 px-2.5 py-1.5 text-xs text-navy-600 placeholder-navy-300 focus:border-brand focus:bg-white focus:outline-none"
          />

          {section.blocks.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={onDragEnd}
            >
              <SortableContext items={section.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-1.5 mb-3">
                  {section.blocks.map(block => (
                    <BlockRow
                      key={block.id}
                      block={block}
                      isSelected={selectedBlockId === block.id}
                      onSelect={() => onSelectBlock(block.id)}
                      onDelete={() => onDeleteBlock(block.id)}
                      onDuplicate={() => onDuplicateBlock(block.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <p className="mb-3 py-4 text-center text-xs text-navy-300">No blocks yet</p>
          )}

          {/* Add block button */}
          <button
            type="button"
            onClick={() => onAddBlock(section.id)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-navy-200 py-2 text-xs font-semibold text-navy-500 hover:border-brand hover:bg-brand-50 hover:text-brand transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Block Here
          </button>
        </div>
      )}
    </div>
  );
}
