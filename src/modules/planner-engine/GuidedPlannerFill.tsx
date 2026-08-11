import { useState } from 'react';
import { CheckSquare } from 'lucide-react';
import { type PlannerConfig, type PlannerBlock, type PlannerFillData } from './types';
import { BlockRenderer, calcBlockProgress } from './BlockFillRenderer';
import { cn } from '../../lib/utils';

// -----------------------------------------------------------------------
// Guided Mode — one section/block at a time, Previous / Save & Continue.
// This is today's PlannerFill wizard experience, preserved near-verbatim
// (moved out of PlannerFill.tsx, which is now the shared container that
// also renders Visual Mode and the mode-select screen off the exact same
// `fillData`/`onBlockChange`). No behavior change from a customer's
// perspective when Customer Experience = Guided Only or Let Customer
// Choose -> Guided.
// -----------------------------------------------------------------------
function ProgressCircle({ percent, color }: { percent: number; color: string }) {
  const R = 30;
  const C = 2 * Math.PI * R;
  const offset = C - (percent / 100) * C;
  return (
    <div className="relative h-20 w-20 mx-auto">
      <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
        <circle cx="40" cy="40" r={R} fill="none" stroke="#E7ECF5" strokeWidth="8" />
        <circle cx="40" cy="40" r={R} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 400ms ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-extrabold text-navy-800">{percent}%</span>
        <span className="text-[9px] text-navy-400">completed</span>
      </div>
    </div>
  );
}

/** One fillable step: a block plus which section it belongs to, so the
 * sidebar can group by section while stepping through every block in the
 * planner in flat, global Previous/Next order (unaffected by section
 * boundaries). */
interface FillStep {
  block: PlannerBlock;
  sectionId: string;
  sectionTitle: string;
  sectionIcon: string;
}

interface GuidedPlannerFillProps {
  planner: PlannerConfig;
  fillData: PlannerFillData;
  onBlockChange: (blockId: string, data: any) => void;
  onSave: () => void;
  overallPercent: number;
}

export function GuidedPlannerFill({ planner, fillData, onBlockChange, onSave, overallPercent }: GuidedPlannerFillProps) {
  // Section-aware step list — the SAME canonical planner.sections the
  // Builder edits and Visual Mode renders, flattened in section order for
  // the one-block-at-a-time wizard flow. Each step still carries its
  // section, so the sidebar can show "Section 1 / Block A / Block B /
  // Section 2 / Block C / Block D" grouping instead of a flat list.
  const steps: FillStep[] = planner.sections.flatMap(section =>
    section.blocks
      .filter(b => b.enabled)
      .map(block => ({ block, sectionId: section.id, sectionTitle: section.title, sectionIcon: section.icon }))
  );

  const [activeBlockId, setActiveBlockId] = useState<string | null>(steps[0]?.block.id ?? null);

  const activeStep = steps.find(s => s.block.id === activeBlockId);
  const activeBlock = activeStep?.block;
  const activeIndex = steps.findIndex(s => s.block.id === activeBlockId);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left sidebar — Progress + Navigation */}
      <aside className="w-60 shrink-0 overflow-y-auto border-r border-navy-100 bg-white p-4 no-print">
        {/* Progress card */}
        <div className="mb-4 rounded-2xl border border-navy-100 bg-navy-50 p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-navy-400">Your Progress</p>
          <ProgressCircle percent={overallPercent} color={planner.settings.primaryColor} />
        </div>

        {/* Section-grouped navigation — same steps, grouped by the
            section they belong to (Section 1 / Block A / Block B /
            Section 2 / Block C / Block D), step numbers stay global. */}
        <div className="flex flex-col gap-3">
          {planner.sections.map(section => {
            const sectionSteps = steps.filter(s => s.sectionId === section.id);
            if (sectionSteps.length === 0) return null;
            return (
              <div key={section.id}>
                <p className="mb-1 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-navy-400">
                  <span>{section.icon}</span> {section.title || 'Untitled Section'}
                </p>
                <div className="flex flex-col gap-1">
                  {sectionSteps.map(step => {
                    const globalIndex = steps.indexOf(step);
                    const { filled, total } = calcBlockProgress(step.block, fillData[step.block.id]);
                    const isActive = activeBlockId === step.block.id;
                    const isDone = filled === total && total > 0;
                    return (
                      <button key={step.block.id} type="button" onClick={() => setActiveBlockId(step.block.id)}
                        className={cn('flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors',
                          isActive ? 'bg-brand text-white' : 'hover:bg-navy-50')}>
                        <div className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold mt-0.5',
                          isActive ? 'bg-white text-brand' : isDone ? 'bg-emerald-500 text-white' : 'bg-navy-200 text-navy-600')}>
                          {isDone && !isActive ? '✓' : globalIndex + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-xs font-semibold truncate', isActive ? 'text-white' : 'text-navy-800')}>
                            {step.block.title}
                          </p>
                          <p className={cn('text-[10px]', isActive ? 'text-white/70' : 'text-navy-400')}>
                            {filled} / {total} completed
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto bg-[#f4f6fb] p-6">
        {activeBlock && activeStep ? (
          <div className="mx-auto max-w-3xl">
            {/* Step badge */}
            <div className="mb-4 flex items-center gap-3">
              <span className="rounded-full px-3 py-1 text-xs font-bold text-white"
                style={{ background: planner.settings.primaryColor }}>
                STEP {activeIndex + 1} OF {steps.length}
              </span>
              <span className="text-xs font-semibold text-navy-400">
                {activeStep.sectionIcon} {activeStep.sectionTitle || 'Untitled Section'}
              </span>
            </div>

            {/* Block header */}
            <div className="mb-4 flex items-center gap-3">
              <span className="text-3xl">{activeBlock.icon}</span>
              <div>
                <h2 className="text-xl font-extrabold text-navy-900">{activeBlock.title}</h2>
                {activeBlock.description && <p className="text-sm text-navy-400">{activeBlock.description}</p>}
              </div>
            </div>

            {/* Block content */}
            <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-card">
              <BlockRenderer
                block={activeBlock}
                data={fillData[activeBlock.id]}
                onChange={(data) => onBlockChange(activeBlock.id, data)}
              />
            </div>

            {/* Navigation */}
            <div className="mt-5 flex items-center justify-between">
              {activeIndex > 0 ? (
                <button type="button" onClick={() => setActiveBlockId(steps[activeIndex - 1].block.id)}
                  className="rounded-xl border border-navy-200 px-5 py-2.5 text-sm font-medium text-navy-700 hover:bg-navy-50">
                  ← Previous
                </button>
              ) : <div />}
              {activeIndex < steps.length - 1 ? (
                <button type="button" onClick={() => {
                  onSave();
                  setActiveBlockId(steps[activeIndex + 1].block.id);
                }} className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                  style={{ background: planner.settings.primaryColor }}>
                  Save & Continue →
                </button>
              ) : (
                <button type="button" onClick={onSave}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600">
                  <CheckSquare className="h-4 w-4" /> Complete Planner
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-navy-400">Select a section to start.</p>
          </div>
        )}
      </div>
    </div>
  );
}
