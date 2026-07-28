import { useEffect, useRef } from 'react';
import { X, ShieldCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button';
import type { TemplateIntegrityReport, IdRepair } from './templateIntegrity';

interface TemplateIntegrityModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: TemplateIntegrityReport;
  onFixIds: () => void;
  isFixing: boolean;
  /** Set once a fix has actually run this session — switches the modal to a success view. */
  lastFixSummary: IdRepair[] | null;
}

const SCOPE_LABELS: Record<IdRepair['scope'], string> = {
  section: 'Section',
  field: 'Field',
  item: 'Checklist item',
};

export function TemplateIntegrityModal({
  isOpen,
  onClose,
  report,
  onFixIds,
  isFixing,
  lastFixSummary,
}: TemplateIntegrityModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    dialogRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-xs"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-integrity-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-navy-100 bg-white shadow-xl focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-navy-50 px-5 py-4">
          <div>
            <h3 id="template-integrity-title" className="text-base font-semibold text-navy-900">
              Template Integrity
            </h3>
            <p className="text-xs text-navy-400">
              Checks every section, field, and checklist item id for duplicates before you publish.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-navy-400 hover:bg-navy-50 hover:text-navy-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {lastFixSummary ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Repaired {lastFixSummary.length} duplicate ID{lastFixSummary.length === 1 ? '' : 's'} and saved the template.
                  </p>
                  <p className="mt-1 text-xs text-emerald-700">
                    The first occurrence of each duplicated id was kept as-is; every id below was regenerated.
                  </p>
                </div>
              </div>
              {lastFixSummary.length > 0 && (
                <div className="flex flex-col gap-2">
                  {lastFixSummary.map((repair, idx) => (
                    <div key={idx} className="rounded-xl border border-navy-100 bg-navy-50/50 p-3 text-xs">
                      <p className="font-semibold text-navy-700">
                        {SCOPE_LABELS[repair.scope]} — {repair.location}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-navy-400">
                        {repair.oldId} <span className="text-navy-300">→</span> {repair.newId}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : report.isValid ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">No duplicate IDs found</p>
                <p className="mt-1 text-xs text-emerald-700">
                  {report.totalSections} section{report.totalSections === 1 ? '' : 's'} checked — every section, field, and
                  checklist item id is unique. Safe to publish.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
                <ShieldAlert className="h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="text-sm font-semibold text-red-700">
                    Found {report.duplicates.length} duplicate ID{report.duplicates.length === 1 ? '' : 's'}
                  </p>
                  <p className="mt-1 text-xs text-red-600">
                    A duplicate id becomes a duplicate React key wherever this content renders — this is the exact cause of
                    the "Save & Continue" insertBefore crash. Use Fix IDs below to repair it.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {report.duplicates.map((dup, idx) => (
                  <div key={idx} className="rounded-xl border border-navy-100 bg-navy-50/50 p-3 text-xs">
                    <p className="font-semibold text-navy-700">
                      {SCOPE_LABELS[dup.scope]} — Section {dup.sectionNumber} ("{dup.sectionTitle}")
                      {dup.label ? ` → "${dup.label}"` : ''}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-navy-400">
                      id: {dup.id} <span className="text-navy-300">(occurrence #{dup.occurrence})</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-navy-50 px-5 py-4 bg-navy-50/30">
          <SecondaryButton size="sm" onClick={onClose}>
            Close
          </SecondaryButton>
          {!lastFixSummary && !report.isValid && (
            <PrimaryButton size="sm" onClick={onFixIds} disabled={isFixing}>
              {isFixing ? 'Fixing…' : 'Fix IDs'}
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}
