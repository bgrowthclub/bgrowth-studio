import { useEffect, useMemo, useRef, useState } from 'react';
import { type PlannerConfig, type PlannerSection, type PlannerFillData, getEffectiveSectionLayout, computeCanvasBounds } from './types';
import { BlockRenderer } from './BlockFillRenderer';

// -----------------------------------------------------------------------
// Visual Mode — the complete planner as a dashboard, using the exact
// section composition authored in the Builder canvas (x/y/w/h/z). This is
// a customer-facing READ/FILL surface only: no dragging, no resizing, no
// react-rnd — sections are rendered at fixed positions computed from
// `section.layout` (falling back through the same getEffectiveSectionLayout
// the Builder canvas uses for sections with no layout yet). Every field
// inside every card is the same BlockRenderer Guided Mode uses, wired to
// the exact same fillData/onBlockChange the container owns — there is no
// second copy of customer data here.
//
// Responsive strategy (desktop / tablet / mobile):
//   - Desktop (>=1024px): the authored composition, unscaled.
//   - Tablet (640-1023px): the SAME composition, uniformly scaled down to
//     fit the available width (same technique as the Builder canvas's own
//     "Fit" zoom) — proportions and hierarchy stay intact.
//   - Mobile (<640px): absolute positioning is abandoned outright. Sections
//     stack full-width in canvas reading order (top-to-bottom, left-to-
//     right ties) with native-sized fields — a scaled-down canvas would be
//     unreadable/untappable at phone widths, so fidelity is traded for
//     usability below tablet width.
// -----------------------------------------------------------------------

const MOBILE_BREAKPOINT = 640;
const TABLET_BREAKPOINT = 1024;
const CANVAS_EDGE_PADDING = 40;

interface PlannerVisualFillProps {
  planner: PlannerConfig;
  fillData: PlannerFillData;
  onBlockChange: (blockId: string, data: any) => void;
}

function useViewportWidth(): number {
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : TABLET_BREAKPOINT));
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

function VisualSectionCard({ section, fillData, onBlockChange, accentColor }: {
  section: PlannerSection;
  fillData: PlannerFillData;
  onBlockChange: (blockId: string, data: any) => void;
  accentColor: string;
}) {
  const enabledBlocks = section.blocks.filter(b => b.enabled);
  return (
    <div className="flex h-full flex-col rounded-2xl border border-navy-100 bg-white shadow-card overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-navy-100 px-4 py-3 shrink-0" style={{ borderTopColor: accentColor }}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-base">{section.icon}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-navy-800">{section.title || 'Untitled Section'}</p>
          {section.description && <p className="truncate text-[11px] text-navy-400">{section.description}</p>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {enabledBlocks.length === 0 ? (
          <p className="py-6 text-center text-xs text-navy-300">No blocks in this section</p>
        ) : (
          <div className="flex flex-col gap-5">
            {enabledBlocks.map(block => (
              <div key={block.id}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-lg">{block.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-navy-800">{block.title}</p>
                    {block.description && <p className="text-[11px] text-navy-400">{block.description}</p>}
                  </div>
                </div>
                <BlockRenderer block={block} data={fillData[block.id]} onChange={(data) => onBlockChange(block.id, data)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function PlannerVisualFill({ planner, fillData, onBlockChange }: PlannerVisualFillProps) {
  const viewportWidth = useViewportWidth();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    setAvailableWidth(el.clientWidth);
    const onResize = () => setAvailableWidth(el.clientWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const sections = planner.sections;

  const layouts = useMemo(
    () => sections.map((section, idx) => ({ section, layout: getEffectiveSectionLayout(section, idx) })),
    [sections]
  );

  if (viewportWidth < MOBILE_BREAKPOINT) {
    // Mobile — vertical stack, canvas reading order (y, then x as tiebreak).
    const ordered = [...layouts].sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x);
    return (
      <div className="flex-1 overflow-y-auto bg-[#f4f6fb] p-3">
        <div className="flex flex-col gap-4">
          {ordered.map(({ section }) => (
            <VisualSectionCard key={section.id} section={section} fillData={fillData} onBlockChange={onBlockChange} accentColor={planner.settings.accentColor} />
          ))}
        </div>
      </div>
    );
  }

  // Desktop / tablet — the authored x/y/w/h composition, uniformly scaled
  // down to fit when the available width is narrower than the design
  // (tablet), left at 1:1 when there's room (desktop).
  const bounds = computeCanvasBounds(sections);
  const contentWidth = bounds.width + CANVAS_EDGE_PADDING;
  const contentHeight = bounds.height + CANVAS_EDGE_PADDING;
  const isTablet = viewportWidth < TABLET_BREAKPOINT;
  const scale = isTablet && availableWidth > 0 ? Math.min(1, (availableWidth - 24) / contentWidth) : 1;

  return (
    <div ref={viewportRef} className="flex-1 overflow-auto bg-[#f4f6fb] p-3">
      <div
        className="relative origin-top-left"
        style={{ width: contentWidth, height: contentHeight, transform: scale !== 1 ? `scale(${scale})` : undefined }}
      >
        {layouts.map(({ section, layout }) => (
          <div key={section.id} className="absolute" style={{ left: layout.x, top: layout.y, width: layout.w, height: layout.h, zIndex: layout.z ?? 0 }}>
            <VisualSectionCard section={section} fillData={fillData} onBlockChange={onBlockChange} accentColor={planner.settings.accentColor} />
          </div>
        ))}
      </div>
    </div>
  );
}
