import { LayoutGrid, ListChecks } from 'lucide-react';

// -----------------------------------------------------------------------
// First-run mode-select screen — shown only when
// planner.settings.customerExperience === 'choose' and the customer
// hasn't picked a mode for this planner yet (see loadPlannerFillMode in
// types.ts). Purely a UI decision, never touches PlannerFillData.
// -----------------------------------------------------------------------
interface PlannerModeSelectProps {
  primaryColor: string;
  onSelect: (mode: 'visual' | 'guided') => void;
}

export function PlannerModeSelect({ primaryColor, onSelect }: PlannerModeSelectProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-[#f4f6fb] p-6">
      <div className="w-full max-w-xl text-center">
        <h2 className="text-xl font-extrabold text-navy-900">How do you want to use your planner?</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button type="button" onClick={() => onSelect('visual')}
            className="group flex flex-col items-center rounded-2xl border border-navy-100 bg-white p-6 text-center shadow-card transition-colors hover:border-brand">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand">
              <LayoutGrid className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-bold text-navy-800">Visual</p>
            <p className="mt-1.5 text-xs leading-relaxed text-navy-400">
              See your complete planner and fill it directly.
            </p>
            <span className="mt-4 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-transform group-hover:scale-105"
              style={{ background: primaryColor }}>
              Use Visual
            </span>
          </button>

          <button type="button" onClick={() => onSelect('guided')}
            className="group flex flex-col items-center rounded-2xl border border-navy-100 bg-white p-6 text-center shadow-card transition-colors hover:border-brand">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand">
              <ListChecks className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-bold text-navy-800">Guided</p>
            <p className="mt-1.5 text-xs leading-relaxed text-navy-400">
              Work through your planner one section at a time.
            </p>
            <span className="mt-4 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-transform group-hover:scale-105"
              style={{ background: primaryColor }}>
              Use Guided
            </span>
          </button>
        </div>
        <p className="mt-5 text-xs text-navy-400">You can switch modes at any time.</p>
      </div>
    </div>
  );
}
