import { useMemo, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import { ZoomIn, ZoomOut, Maximize, Magnet, Plus } from 'lucide-react';
import { type PlannerSection, computeDefaultSectionLayout } from './types';
import { SectionCard, SECTION_DRAG_HANDLE_CLASS } from './PlannerSectionEditor';
import { cn } from '../../lib/utils';

const GRID = 20;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.1;
const MIN_SECTION_W = 260;
const MIN_SECTION_H = 160;
const CANVAS_PADDING = 400;

// ─── Planner Section Canvas — a genuine free-position x/y surface ────────
// SECTION = free-position canvas object (this file, via react-rnd).
// BLOCK = structured content inside a section (PlannerSectionEditor,
// unchanged whether rendered here or in the List view). Drag/resize only
// ever writes a section's `layout` — never `sections[]` array order,
// which stays what drives Fill's step order and the PDF's section order.
interface PlannerSectionCanvasProps {
  sections: PlannerSection[];
  selectedBlockId: string | null;
  selectedBlockSectionId: string | null;
  onSelectBlock: (sectionId: string, blockId: string) => void;
  onDeleteBlock: (sectionId: string, blockId: string) => void;
  onDuplicateBlock: (sectionId: string, blockId: string) => void;
  onAddBlock: (sectionId: string) => void;
  onReorderBlocks: (sectionId: string, from: number, to: number) => void;
  onUpdateSection: (sectionId: string, partial: Partial<PlannerSection>) => void;
  onDeleteSection: (sectionId: string) => void;
  onDuplicateSection: (sectionId: string) => void;
  onBringToFront: (sectionId: string) => void;
  onSendToBack: (sectionId: string) => void;
  onToggleLock: (sectionId: string) => void;
  onAddSection: () => void;
}

export function PlannerSectionCanvas({
  sections,
  selectedBlockId,
  selectedBlockSectionId,
  onSelectBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onAddBlock,
  onReorderBlocks,
  onUpdateSection,
  onDeleteSection,
  onDuplicateSection,
  onBringToFront,
  onSendToBack,
  onToggleLock,
  onAddSection,
}: PlannerSectionCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const [snap, setSnap] = useState(true);
  const viewportRef = useRef<HTMLDivElement>(null);

  const snapVal = (n: number) => Math.round(snap ? Math.round(n / GRID) * GRID : n);

  // Canvas surface grows to fit the furthest section, plus room to drag
  // sections further out — never shrinks below a comfortable default.
  const canvasSize = useMemo(() => {
    let maxX = 1000;
    let maxY = 700;
    sections.forEach((s, i) => {
      const l = s.layout ?? computeDefaultSectionLayout(i);
      maxX = Math.max(maxX, l.x + l.w);
      maxY = Math.max(maxY, l.y + l.h);
    });
    return { width: maxX + CANVAS_PADDING, height: maxY + CANVAS_PADDING };
  }, [sections]);

  const handleFit = () => {
    const el = viewportRef.current;
    if (!el || sections.length === 0) { setZoom(1); return; }
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    sections.forEach((s, i) => {
      const l = s.layout ?? computeDefaultSectionLayout(i);
      minX = Math.min(minX, l.x);
      minY = Math.min(minY, l.y);
      maxX = Math.max(maxX, l.x + l.w);
      maxY = Math.max(maxY, l.y + l.h);
    });
    const contentW = Math.max(maxX - minX + 80, 1);
    const contentH = Math.max(maxY - minY + 80, 1);
    const next = Math.min(el.clientWidth / contentW, el.clientHeight / contentH, MAX_ZOOM);
    setZoom(Math.max(MIN_ZOOM, Math.round(next * 100) / 100));
    el.scrollTo({ left: 0, top: 0 });
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b border-navy-100 bg-white px-4 py-2">
        <div className="flex items-center gap-1">
          <button type="button" title="Zoom out"
            onClick={() => setZoom(z => Math.max(MIN_ZOOM, Math.round((z - ZOOM_STEP) * 100) / 100))}
            className="rounded-lg p-1.5 text-navy-500 hover:bg-navy-50">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-xs font-semibold text-navy-500">{Math.round(zoom * 100)}%</span>
          <button type="button" title="Zoom in"
            onClick={() => setZoom(z => Math.min(MAX_ZOOM, Math.round((z + ZOOM_STEP) * 100) / 100))}
            className="rounded-lg p-1.5 text-navy-500 hover:bg-navy-50">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button type="button" onClick={handleFit} title="Fit all sections in view"
            className="ml-1.5 flex items-center gap-1.5 rounded-lg border border-navy-100 px-2.5 py-1.5 text-xs font-semibold text-navy-500 hover:bg-navy-50">
            <Maximize className="h-3.5 w-3.5" /> Fit
          </button>
          <button type="button" onClick={() => setSnap(s => !s)} title="Snap sections to a grid while dragging/resizing"
            className={cn('ml-1.5 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors',
              snap ? 'border-brand bg-brand-50 text-brand' : 'border-navy-100 text-navy-500 hover:bg-navy-50')}>
            <Magnet className="h-3.5 w-3.5" /> Snap
          </button>
        </div>
        <button type="button" onClick={onAddSection}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-navy-200 px-3 py-1.5 text-xs font-semibold text-navy-500 hover:border-brand hover:bg-brand-50 hover:text-brand transition-colors">
          <Plus className="h-3.5 w-3.5" /> Add Section
        </button>
      </div>

      {/* Scrollable canvas viewport */}
      <div ref={viewportRef} className="relative flex-1 overflow-auto bg-navy-50/50">
        {sections.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm font-semibold text-navy-500">No sections yet</p>
            <p className="mt-1 max-w-xs text-xs text-navy-400">
              Click "Add Section" to place your first section on the canvas — drag and resize it anywhere you like.
            </p>
            <button type="button" onClick={onAddSection}
              className="mt-4 flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              <Plus className="h-4 w-4" /> Add Section
            </button>
          </div>
        ) : (
          <div
            className="relative origin-top-left"
            style={{
              width: canvasSize.width,
              height: canvasSize.height,
              transform: `scale(${zoom})`,
              backgroundImage: 'radial-gradient(circle, #d7deed 1.5px, transparent 1.5px)',
              backgroundSize: `${GRID}px ${GRID}px`,
            }}
          >
            {sections.map((section, idx) => {
              const layout = section.layout ?? computeDefaultSectionLayout(idx);
              const locked = !!layout.locked;
              const zIndex = layout.z ?? idx;
              return (
                <Rnd
                  key={section.id}
                  size={{ width: layout.w, height: layout.h }}
                  position={{ x: layout.x, y: layout.y }}
                  scale={zoom}
                  bounds="parent"
                  minWidth={MIN_SECTION_W}
                  minHeight={MIN_SECTION_H}
                  dragHandleClassName={SECTION_DRAG_HANDLE_CLASS}
                  disableDragging={locked}
                  enableResizing={locked ? false : { bottom: true, right: true, bottomRight: true }}
                  style={{ zIndex }}
                  onDragStop={(_e, d) => {
                    onUpdateSection(section.id, { layout: { ...layout, x: snapVal(d.x), y: snapVal(d.y) } });
                  }}
                  onResizeStop={(_e, _dir, ref, _delta, position) => {
                    onUpdateSection(section.id, {
                      layout: {
                        ...layout,
                        x: snapVal(position.x),
                        y: snapVal(position.y),
                        w: snapVal(ref.offsetWidth),
                        h: snapVal(ref.offsetHeight),
                      },
                    });
                  }}
                >
                  <SectionCard
                    section={section}
                    variant="canvas"
                    selectedBlockId={selectedBlockSectionId === section.id ? selectedBlockId : null}
                    onSelectBlock={blockId => onSelectBlock(section.id, blockId)}
                    onDeleteBlock={blockId => onDeleteBlock(section.id, blockId)}
                    onDuplicateBlock={blockId => onDuplicateBlock(section.id, blockId)}
                    onAddBlock={onAddBlock}
                    onUpdateSection={partial => onUpdateSection(section.id, partial)}
                    onDeleteSection={() => onDeleteSection(section.id)}
                    onDuplicateSection={() => onDuplicateSection(section.id)}
                    onReorderBlocks={(from, to) => onReorderBlocks(section.id, from, to)}
                    locked={locked}
                    onToggleLock={() => onToggleLock(section.id)}
                    onBringToFront={() => onBringToFront(section.id)}
                    onSendToBack={() => onSendToBack(section.id)}
                  />
                </Rnd>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
