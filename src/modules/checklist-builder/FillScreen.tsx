import { useCallback, useEffect, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Cloud, Printer, Download, Check, AlertCircle } from 'lucide-react';
import { WorkflowAccordion } from '../../engine/components/WorkflowAccordion';
import { PrintableSummary } from '../../engine/components/PrintableSummary';
import { ProgressCard } from '../../components/ProgressCard';
import { StepList } from '../../components/StepList';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Toast } from '../../components/Toast';
import { SecondaryButton } from '../../components/ui/Button';
import { Menu } from '../../components/ui/Menu';
import { useBackendAutosave } from './useBackendAutosave';
import { useProgress } from '../../engine/useProgress';
import { buildZodSchema, requiredFieldPaths } from '../../engine/schemaBuilder';
import { buildDefaultValues } from '../../engine/defaultValues';
import { applyBrandTheme } from '../../engine/theme';
import { deserializeData } from './api';
import { downloadElementAsPdf } from '../../lib/pdf';
import type { ChecklistInstance, ParsedTemplate } from './types';
import type { ChecklistData } from '../../engine/types';
import { cn } from '../../lib/utils';

interface FillScreenProps {
  template: ParsedTemplate;
  instance: ChecklistInstance;
  ownerEmail: string;
  onBack: () => void;
}

export function FillScreen({ template, instance, ownerEmail, onBack }: FillScreenProps) {
  const config = template.config;

  // Apply the template's brand theme.
  useEffect(() => {
    applyBrandTheme(config.brand.primaryColor);
    return () => applyBrandTheme('#1061EC'); // restore default on unmount
  }, [config.brand.primaryColor]);

  const methods = useForm<ChecklistData>({
    resolver: zodResolver(buildZodSchema(config)) as never,
    mode: 'onBlur',
    defaultValues: instance.dataJson ? deserializeData(instance.dataJson) : buildDefaultValues(config),
  });

  const { watch, trigger } = methods;
  const values = watch();
  const progress = useProgress(config, values);

  // Live instance id may be assigned by the backend on first autosave
  // (when this is a brand-new instance, dataJson may be '{}').
  const [instanceId, setInstanceId] = useState<string>(instance.instanceId);
  const [activeId, setActiveId] = useState<string>(config.sections[0].id);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isRenderBlank, setIsRenderBlank] = useState(false);
  const [isGeneratingBlankPdf, setIsGeneratingBlankPdf] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    window.setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  }, []);

  const { isSaving, saveError, lastSavedAt, saveNow } = useBackendAutosave({
    instanceId,
    templateId: template.templateId,
    ownerEmail,
    clientOrJobRef: instance.clientOrJobRef,
    data: values,
    progressPercent: progress.percent,
    onInstanceCreated: (newId) => setInstanceId(newId),
  });

  const handleContinue = async (id: string) => {
    const section = config.sections.find((s) => s.id === id);
    const fieldPaths = section ? requiredFieldPaths(section) : [];
    if (fieldPaths.length > 0) {
      const valid = await trigger(fieldPaths as Parameters<typeof trigger>[0]);
      if (!valid) return;
    }
    await saveNow();
    const currentIndex = config.sections.findIndex((s) => s.id === id);
    const next = config.sections[currentIndex + 1];
    if (next) {
      setActiveId(next.id);
    } else {
      showToast('Checklist complete — nice work!');
    }
  };

  const handleSaveNow = async () => {
    await saveNow();
    showToast('Saved to server');
  };

  const handlePrint = () => window.print();

  const handlePrintBlank = () => {
    setIsRenderBlank(true);
    setTimeout(() => {
      const handleAfterPrint = () => {
        setIsRenderBlank(false);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
      window.addEventListener('afterprint', handleAfterPrint);
      window.print();
    }, 250);
  };

  const handleDownloadBlankPdf = async () => {
    if (!printableRef.current) return;
    setIsGeneratingBlankPdf(true);
    setIsRenderBlank(true);
    setTimeout(async () => {
      try {
        const filename = `${config.brand.name.replace(/\s+/g, '-')}-Blank.pdf`;
        await downloadElementAsPdf(printableRef.current!, filename, {
          pagebreakMode: ['css', 'legacy'],
          margin: [5, 10, 5, 10],
        });
        showToast('Blank PDF downloaded');
      } catch (err) {
        showToast('Error generating PDF');
      } finally {
        setIsRenderBlank(false);
        setIsGeneratingBlankPdf(false);
      }
    }, 250);
  };

const handleDownloadPdf = async () => {
    if (!printableRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const filename = `${config.brand.name.replace(/\s+/g, '-')}-${instance.clientOrJobRef?.replace(/\s+/g, '-') || instanceId}.pdf`;
      await downloadElementAsPdf(printableRef.current, filename, {
        pagebreakMode: ['css', 'legacy'],
        margin: [5, 10, 5, 10],
      });
      showToast('PDF downloaded');
    } finally {
      setIsGeneratingPdf(false);
    }
  };
  const handleResetConfirm = () => {
    methods.reset(buildDefaultValues(config));
    setActiveId(config.sections[0].id);
    setResetDialogOpen(false);
    showToast('Form cleared');
  };

  const stepListItems = config.sections.map((section) => {
    const p = progress.sections[section.id];
    const status =
      section.id === activeId ? ('active' as const) : p.isComplete ? ('completed' as const) : ('pending' as const);
    const subtitle = p.isOptional ? 'Optional' : `${p.filled} / ${p.total} completed`;
    return { id: section.id, number: section.number, title: section.title, subtitle, status };
  });

  const savedLabel = lastSavedAt
    ? `Saved ${new Date(lastSavedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
    : null;

  return (
    <FormProvider {...methods}>
      <div className="flex h-full flex-col">
        {/* Sub-header specific to fill mode */}
        <div className="no-print flex items-center justify-between gap-3 border-b border-navy-100 bg-white px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="text-sm font-medium text-navy-500 hover:text-navy-800"
            >
              ← {template.name}
            </button>
            {instance.clientOrJobRef && (
              <>
                <span className="text-navy-200">/</span>
                <span className="truncate text-sm font-semibold text-navy-800">{instance.clientOrJobRef}</span>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Save status indicator */}
            <span
              className={cn(
                'hidden items-center gap-1.5 text-xs sm:flex',
                isSaving ? 'text-navy-400' : saveError ? 'text-red-500' : 'text-emerald-600'
              )}
            >
              {isSaving ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
              ) : saveError ? (
                <AlertCircle className="h-3.5 w-3.5" />
              ) : savedLabel ? (
                <Check className="h-3.5 w-3.5" />
              ) : null}
              {isSaving ? 'Saving…' : saveError ? 'Save error' : savedLabel}
            </span>

            <SecondaryButton size="sm" onClick={handleSaveNow} disabled={isSaving}>
              <Cloud className="h-4 w-4" />
              Save
            </SecondaryButton>
            <Menu
              trigger={
                <>
                  <Printer className="h-4 w-4" />
                  Print
                </>
              }
              items={[
                { label: 'Print filled', description: 'Prints your current answers', onSelect: handlePrint },
                { label: 'Print blank', description: 'Prints an empty copy to fill by hand', onSelect: handlePrintBlank },
              ]}
            />
            <Menu
              trigger={
                <>
                  <Download className="h-4 w-4" />
                  {isGeneratingPdf || isGeneratingBlankPdf ? 'Preparing…' : 'PDF'}
                </>
              }
              items={[
                { label: 'Download PDF', description: 'Includes your current answers', onSelect: handleDownloadPdf, disabled: isGeneratingPdf },
                {
                  label: 'Download blank PDF',
                  description: 'An empty copy to fill by hand',
                  onSelect: handleDownloadBlankPdf,
                  disabled: isGeneratingBlankPdf,
                },
              ]}
            />
          </div>
        </div>

        {/* Main content: sidebar + workflow */}
        <div className="no-print flex flex-1 flex-col gap-5 overflow-y-auto p-4 sm:p-6 lg:flex-row lg:items-start">
          <aside className="no-print flex w-full flex-col gap-4 lg:w-[240px] lg:shrink-0">
            <ProgressCard
              percent={progress.percent}
              completed={progress.completedFields}
              total={progress.totalFields}
            />
            <StepList items={stepListItems} activeId={activeId} onSelect={setActiveId} />
          </aside>

          <section className="min-w-0 flex-1">
            <WorkflowAccordion
              config={config}
              activeId={activeId}
              onSelect={setActiveId}
              onContinue={handleContinue}
              progressBySection={progress.sections}
            />
          </section>
        </div>
      </div>

      {/* Hidden printable summary */}
     <div className="printable-summary-container">
        <PrintableSummary ref={printableRef} config={config} data={isRenderBlank ? {} : values} percent={isRenderBlank ? 0 : progress.percent} />
      </div>

      <ConfirmDialog
        open={resetDialogOpen}
        title="Clear all answers?"
        description="This clears every field and checklist item on screen. The saved version on the server remains until you save again."
        confirmLabel="Clear form"
        onConfirm={handleResetConfirm}
        onCancel={() => setResetDialogOpen(false)}
      />

      <Toast message={toast.message} visible={toast.visible} />
    </FormProvider>
  );
}
