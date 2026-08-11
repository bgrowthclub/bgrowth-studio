import { useCallback, useRef, useState } from 'react';
import { ArrowLeft, Download, Printer, Save, LayoutGrid, ListChecks } from 'lucide-react';
import {
  type PlannerConfig, type PlannerFillData,
  loadPlannerFillMode, savePlannerFillMode, getEffectiveSectionLayout, computeCanvasBounds,
} from './types';
import { calcBlockProgress, PdfBlockContent } from './BlockFillRenderer';
import { GuidedPlannerFill } from './GuidedPlannerFill';
import { PlannerVisualFill } from './PlannerVisualFill';
import { PlannerModeSelect } from './PlannerModeSelect';
import { Toast } from '../../components/Toast';
import { cn } from '../../lib/utils';

// -----------------------------------------------------------------------
// PlannerFill — the shared customer-facing container.
//
// Owns the ONE canonical `fillData` state (PlannerFillData, keyed by
// block id) and the current experience mode, and renders one of three
// bodies below a shared header (Save/Print/PDF + progress + the
// Visual/Guided switcher when applicable):
//
//   customerExperience === 'visual'  -> always PlannerVisualFill
//   customerExperience === 'guided'  -> always GuidedPlannerFill
//   customerExperience === 'choose'  -> PlannerModeSelect until a mode is
//                                       picked (remembered per-planner via
//                                       loadPlannerFillMode/savePlannerFillMode,
//                                       its own localStorage key — never
//                                       mixed into fillData), then whichever
//                                       mode was picked, with a switcher.
//
// Both mode renderers receive the exact same `fillData` and the exact
// same `handleBlockChange` callback — switching modes is a render swap in
// this one component, never a remount of two independently-initialized
// state trees, which is what guarantees a value entered in one mode is
// immediately visible in the other.
// -----------------------------------------------------------------------

type FillMode = 'visual' | 'guided';

interface PlannerFillProps {
  planner: PlannerConfig;
  /** Omit to hide the Back button entirely — used by the public
   * ?planner=ID route, which must never expose a path back into Studio's
   * own navigation (see PlannerEngine.tsx's isPublic mode). */
  onBack?: () => void;
}

export function PlannerFill({ planner, onBack }: PlannerFillProps) {
  const STORAGE_KEY = `bgrowth.planner.fill.${planner.id}`;
  const [fillData, setFillData] = useState<PlannerFillData>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); } catch { return {}; }
  });

  const customerExperience = planner.settings.customerExperience ?? 'choose';
  const [mode, setMode] = useState<FillMode | null>(() => {
    if (customerExperience === 'visual') return 'visual';
    if (customerExperience === 'guided') return 'guided';
    return loadPlannerFillMode(planner.id);
  });
  const showSwitcher = customerExperience === 'choose' && mode !== null;

  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToast({ message: msg, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2200);
  };

  const handleBlockChange = useCallback((blockId: string, data: any) => {
    setFillData(prev => {
      const updated = { ...prev, [blockId]: data };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [STORAGE_KEY]);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fillData));
    showToast('Progress saved ✓');
  };

  const handleChooseMode = (m: FillMode) => {
    // Preference lives in its own key, never inside fillData — a UI
    // choice, not customer-entered planner content.
    if (customerExperience === 'choose') savePlannerFillMode(planner.id, m);
    setMode(m);
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      // Explicit width/windowWidth — without it, html2canvas captures at
      // whatever ambient width it defaults to inside the zero-sized,
      // overflow:hidden .printable-summary-container (see that div's own
      // comment), which happens to be narrower than this node's own
      // declared width. A single-column vertical report never reached
      // that edge so it went unnoticed, but the Visual arrangement's
      // side-by-side positioned cards do — without this, content on the
      // right gets silently cropped out of the captured image entirely.
      const printWidth = printRef.current.scrollWidth;
      html2pdf().set({
        margin: 10, filename: `${planner.settings.name.replace(/\s+/g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, width: printWidth, windowWidth: printWidth },
        jsPDF: { unit: 'mm', format: planner.settings.pageSize.toLowerCase(), orientation: planner.settings.pageOrientation },
      }).from(printRef.current).save().then(() => { setIsGeneratingPdf(false); showToast('PDF downloaded ✓'); });
    } catch { setIsGeneratingPdf(false); window.print(); }
  };

  // Overall progress — computed once here so the header and Guided Mode's
  // sidebar always show the exact same number, never two separate
  // computations that could drift.
  const allEnabledBlocks = planner.sections.flatMap(section => section.blocks.filter(b => b.enabled));
  const totalProgress = allEnabledBlocks.reduce((acc, block) => {
    const { filled, total } = calcBlockProgress(block, fillData[block.id]);
    return { filled: acc.filled + filled, total: acc.total + total };
  }, { filled: 0, total: 0 });
  const overallPercent = totalProgress.total > 0 ? Math.round((totalProgress.filled / totalProgress.total) * 100) : 0;
  const canvasBounds = computeCanvasBounds(planner.sections);

  return (
    <>
    <div className="flex h-full flex-col overflow-hidden" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-navy-100 bg-white px-4 py-2.5 no-print">
        <div className="flex items-center gap-3">
          {onBack && (
            <>
              <button type="button" onClick={onBack}
                className="flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <span className="text-navy-200">/</span>
            </>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xl">{planner.settings.icon}</span>
            <span className="text-sm font-bold text-navy-800">{planner.settings.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {mode !== null && (
            <div className="hidden items-center gap-2 sm:flex">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-navy-100">
                <div className="h-full rounded-full transition-[width]" style={{ width: `${overallPercent}%`, background: planner.settings.primaryColor }} />
              </div>
              <span className="text-[11px] font-semibold text-navy-500">{overallPercent}%</span>
            </div>
          )}

          {showSwitcher && (
            <div className="flex items-center gap-0.5 rounded-lg border border-navy-100 bg-navy-50 p-0.5">
              <button type="button" onClick={() => handleChooseMode('visual')} title="Visual mode"
                className={cn('flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors',
                  mode === 'visual' ? 'bg-white shadow-sm text-brand' : 'text-navy-500 hover:text-navy-700')}>
                <LayoutGrid className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Visual</span>
              </button>
              <button type="button" onClick={() => handleChooseMode('guided')} title="Guided mode"
                className={cn('flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors',
                  mode === 'guided' ? 'bg-white shadow-sm text-brand' : 'text-navy-500 hover:text-navy-700')}>
                <ListChecks className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Guided</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button type="button" onClick={handleSave}
              className="flex items-center gap-1.5 rounded-lg border border-navy-100 px-3 py-1.5 text-xs font-medium text-navy-600 hover:bg-navy-50">
              <Save className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Save</span>
            </button>
            <button type="button" onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg border border-navy-100 px-3 py-1.5 text-xs font-medium text-navy-600 hover:bg-navy-50">
              <Printer className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Print</span>
            </button>
            {planner.settings.exportPdf && (
              <button type="button" onClick={handleDownloadPdf} disabled={isGeneratingPdf}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
                <Download className="h-3.5 w-3.5" /> {isGeneratingPdf ? 'Generating...' : 'PDF'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body — exactly one of: mode-select, Visual, Guided */}
      {mode === null ? (
        <PlannerModeSelect primaryColor={planner.settings.primaryColor} onSelect={handleChooseMode} />
      ) : mode === 'visual' ? (
        <PlannerVisualFill planner={planner} fillData={fillData} onBlockChange={handleBlockChange} />
      ) : (
        <GuidedPlannerFill
          planner={planner}
          fillData={fillData}
          onBlockChange={handleBlockChange}
          onSave={handleSave}
          overallPercent={overallPercent}
        />
      )}
    </div>

    {/* Hidden printable — deliberately a SIBLING of the visible app shell
        above (not nested inside it), matching the proven pattern already
        used by Checklist's own printable summary (App.tsx, App.public.tsx,
        checklist-builder/FillScreen.tsx all place their printable-summary-
        container as a top-level sibling, never inside the visible flex
        shell). .printable-summary-container (src/index.css) is what
        actually keeps this off-screen during normal Fill usage
        (width/height: 0, overflow: hidden, position: absolute — not
        display: none, which html2canvas can't capture). @media print in
        index.css restores normal document flow for real printing.

        Arrangement depends on Customer Experience: 'guided' keeps the
          original vertical section-by-section report (unchanged — a
          Guided Only planner's customers never see a spatial composition,
          so there's nothing to "resemble"). 'visual'/'choose' render the
          same positioned-card composition Visual Mode uses, so the PDF
          reads as a finished version of the planner they actually filled
          in — same PdfBlockContent per block either way, only the
          section-level arrangement differs. */}
      <div className="printable-summary-container">
        {customerExperience === 'guided' ? (
          <div ref={printRef} className="printable-summary" style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
            <PrintableHeader planner={planner} overallPercent={overallPercent} />
            {planner.sections.map(section => {
              const sectionBlocks = section.blocks.filter(b => b.enabled);
              if (sectionBlocks.length === 0) return null;
              return (
                <div key={section.id} style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
                  <h1 style={{ fontSize: '15px', color: planner.settings.accentColor, margin: '0 0 10px' }}>
                    {section.icon} {section.title || 'Untitled Section'}
                  </h1>
                  {sectionBlocks.map(block => {
                    const { filled, total } = calcBlockProgress(block, fillData[block.id]);
                    return (
                      <div key={block.id} style={{ marginBottom: '18px', pageBreakInside: 'avoid', paddingLeft: '8px' }}>
                        <h2 style={{ fontSize: '16px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', margin: '0 0 4px' }}>
                          {block.icon} {block.title}
                        </h2>
                        {total > 0 && (
                          <p style={{ fontSize: '10px', color: '#94a3b8', margin: '0 0 8px' }}>{filled} of {total} completed</p>
                        )}
                        <PdfBlockContent block={block} data={fillData[block.id]} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
            <PrintableFooter />
          </div>
        ) : (
          <div ref={printRef} className="printable-summary" style={{ fontFamily: 'Arial, sans-serif', padding: '20px', width: Math.max(800, canvasBounds.width + 40) }}>
            <PrintableHeader planner={planner} overallPercent={overallPercent} />
            <div style={{ position: 'relative', width: canvasBounds.width, height: canvasBounds.height }}>
              {planner.sections.map((section, idx) => {
                const sectionBlocks = section.blocks.filter(b => b.enabled);
                if (sectionBlocks.length === 0) return null;
                const layout = getEffectiveSectionLayout(section, idx);
                return (
                  <div key={section.id} style={{
                    position: 'absolute', left: layout.x, top: layout.y, width: layout.w, height: layout.h,
                    border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', background: '#ffffff',
                    pageBreakInside: 'avoid', display: 'flex', flexDirection: 'column',
                  }}>
                    <div style={{ borderBottom: `2px solid ${planner.settings.accentColor}`, padding: '8px 12px', background: '#f8fafc', flexShrink: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        {section.icon} {section.title || 'Untitled Section'}
                      </p>
                    </div>
                    <div style={{ padding: '10px 12px', overflow: 'hidden' }}>
                      {sectionBlocks.map(block => (
                        <div key={block.id} style={{ marginBottom: '10px' }}>
                          <p style={{ fontSize: '11px', fontWeight: 700, color: '#334155', margin: '0 0 3px' }}>
                            {block.icon} {block.title}
                          </p>
                          <PdfBlockContent block={block} data={fillData[block.id]} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <PrintableFooter />
          </div>
        )}
    </div>

    <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}

function PrintableHeader({ planner, overallPercent }: { planner: PlannerConfig; overallPercent: number }) {
  return (
    <div style={{ borderBottom: `3px solid ${planner.settings.primaryColor}`, paddingBottom: '12px', marginBottom: '20px' }}>
      <h1 style={{ color: planner.settings.primaryColor, fontSize: '24px', margin: 0 }}>{planner.settings.icon} {planner.settings.name}</h1>
      <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>{planner.settings.description}</p>
      <p style={{ color: '#94a3b8', fontSize: '11px', margin: '4px 0 0' }}>Generated: {new Date().toLocaleDateString()} · Progress: {overallPercent}%</p>
    </div>
  );
}

function PrintableFooter() {
  return <p style={{ textAlign: 'center', fontSize: '10px', color: '#94a3b8', marginTop: '24px' }}>Generated by BGrowth Studio™</p>;
}
