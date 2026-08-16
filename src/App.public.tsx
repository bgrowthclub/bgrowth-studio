/**
 * App.public.tsx
 *
 * Public-facing fill page. Accessed via:
 *   https://your-vercel-url.vercel.app/?template=TEMPLATE_ID
 *
 * No login required — anyone with the link can fill out the checklist.
 * Data is saved to localStorage (anonymous users don't have an account).
 * The owner can share this link on Wix, email, or any website.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProductHeader } from './components/ProductHeader';
import { Sidebar } from './components/Sidebar';
import { WorkflowAccordion } from './engine/components/WorkflowAccordion';
import { Footer } from './components/Footer';
import { PrintableSummary } from './engine/components/PrintableSummary';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Toast } from './components/Toast';
import { useProgress } from './engine/useProgress';
import { buildZodSchema, requiredFieldPaths } from './engine/schemaBuilder';
import { buildDefaultValues } from './engine/defaultValues';
import { applyBrandTheme } from './engine/theme';
import { loadFormData, saveFormData, clearFormData, loadOpenSection, saveOpenSection } from './lib/storage';
import { downloadElementAsPdf } from './lib/pdf';
import { api_getTemplate } from './modules/checklist-builder/api';
import type { ChecklistConfig, ChecklistData } from './engine/types';

interface PublicFillAppProps {
  templateId: string;
}

export function PublicFillApp({ templateId }: PublicFillAppProps) {
  const [config, setConfig] = useState<ChecklistConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api_getTemplate(templateId)
      .then((t) => {
        const parsed = JSON.parse(t.configJson) as ChecklistConfig;
        setConfig(parsed);
        applyBrandTheme(parsed.brand.primaryColor);
        // Set page title to the checklist name
        document.title = `${parsed.brand.name} | BGrowth`;
      })
      .catch(() => setError('Checklist not found or unavailable.'))
      .finally(() => setLoading(false));
  }, [templateId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f6fb]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#f4f6fb] text-center">
        <p className="text-lg font-bold text-navy-800">Checklist not found</p>
        <p className="text-sm text-navy-400">{error ?? 'The link may be invalid or expired.'}</p>
      </div>
    );
  }

  return <PublicFillInner config={config} templateId={templateId} />;
}

function PublicFillInner({ config, templateId }: { config: ChecklistConfig; templateId: string }) {
  // Use templateId as the storage key so each public checklist
  // is saved independently in the visitor's browser.
  const storageId = `public-${templateId}`;

  const methods = useForm<ChecklistData>({
    resolver: zodResolver(buildZodSchema(config)) as never,
    mode: 'onBlur',
    defaultValues: loadFormData(storageId) ?? buildDefaultValues(config),
  });

  const { watch, trigger, reset } = methods;
  const values = watch();
  const progress = useProgress(config, values);

  const [activeId, setActiveId] = useState<string>(
    () => loadOpenSection(storageId) ?? config.sections[0].id
  );
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    window.setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  }, []);

  // Autosave to localStorage as the user types
  useEffect(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      saveFormData(storageId, values);
    }, 500);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values)]);

  useEffect(() => {
    saveOpenSection(storageId, activeId);
  }, [storageId, activeId]);

  const handleContinue = async (id: string) => {
    const section = config.sections.find((s) => s.id === id);
    const fieldPaths = section ? requiredFieldPaths(section) : [];
    if (fieldPaths.length > 0) {
      const valid = await trigger(fieldPaths as Parameters<typeof trigger>[0]);
      if (!valid) return;
    }
    saveFormData(storageId, methods.getValues());
    const currentIndex = config.sections.findIndex((s) => s.id === id);
    const next = config.sections[currentIndex + 1];
    if (next) {
      setActiveId(next.id);
    } else {
      showToast('Checklist complete — nice work!');
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    saveFormData(storageId, methods.getValues());
    window.setTimeout(() => { setIsSaving(false); showToast('Saved to this browser'); }, 350);
  };

  const handleDownloadPdf = async () => {
    if (!printableRef.current) return;
    setIsGeneratingPdf(true);
    try {
      await downloadElementAsPdf(printableRef.current, `${config.brand.name.replace(/\s+/g, '-')}.pdf`);
      showToast('PDF downloaded');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const stepListItems = config.sections.map((section) => {
    const p = progress.sections[section.id];
    const status = section.id === activeId ? ('active' as const) : p.isComplete ? ('completed' as const) : ('pending' as const);
    return { id: section.id, number: section.number, title: section.title, subtitle: p.isOptional ? 'Optional' : `${p.filled} / ${p.total} completed`, status };
  });

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-[#f4f6fb]">
        <ProductHeader
          title={config.brand.name}
          onSave={handleSave}
          onPrint={() => window.print()}
          onDownloadPdf={handleDownloadPdf}
          onReset={() => setResetDialogOpen(true)}
          isSaving={isSaving}
          isGeneratingPdf={isGeneratingPdf}
        />

        <main className="no-print mx-auto flex max-w-[1280px] flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:items-start">
          <Sidebar
            percent={progress.percent}
            completed={progress.completedFields}
            total={progress.totalFields}
            items={stepListItems}
            activeId={activeId}
            onSelect={setActiveId}
          />
          <section className="min-w-0 flex-1">
            <WorkflowAccordion
              config={config}
              activeId={activeId}
              onSelect={setActiveId}
              onContinue={handleContinue}
              progressBySection={progress.sections}
            />
          </section>
        </main>

        <Footer footer={config.footer} />
        <div className="no-print printable-summary-container">   <PrintableSummary ref={printableRef} config={config} data={values} percent={progress.percent} /> </div>

        <ConfirmDialog
          open={resetDialogOpen}
          title="Reset the entire checklist?"
          description="This clears every field and checklist item stored in this browser."
          confirmLabel="Reset Form"
          onConfirm={() => { clearFormData(storageId); reset(buildDefaultValues(config)); setActiveId(config.sections[0].id); setResetDialogOpen(false); showToast('Form has been reset'); }}
          onCancel={() => setResetDialogOpen(false)}
        />
        <Toast message={toast.message} visible={toast.visible} />
      </div>
    </FormProvider>
  );
}
