import { useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProductHeader } from '../components/ProductHeader';
import { WorkflowAccordion } from '../engine/components/WorkflowAccordion';
import { useProgress } from '../engine/useProgress';
import { buildZodSchema, requiredFieldPaths } from '../engine/schemaBuilder';
import { buildDefaultValues } from '../engine/defaultValues';
import { notaryConfig } from '../configs/notary.config';
import type { ChecklistData } from '../engine/types';

/**
 * Isolated, dev-only preview for the interactive Save & Continue flow (see
 * ../../workflow-preview.html — not part of the production build's entry
 * graph, same as dev-preview.html/templates-preview.html).
 *
 * App.tsx's own PublicFillInner (the real Studio Direct Link component) is
 * not importable here without also importing all of App.tsx's module graph,
 * which includes an unrelated, pre-existing Calculator Builder bug that
 * crashes `npm run dev` (see TemplatesScreenDevPreview.tsx's doc comment).
 * This mirrors PublicFillInner's essential structure — the same real
 * WorkflowAccordion, ProductHeader, and the same activeSectionRef +
 * requestAnimationFrame scroll fix App.tsx/FillScreen.tsx both use — purely
 * so the Save & Continue scroll-position fix can be exercised and screenshot
 * against a live sticky header, without a GAS backend.
 */
export function WorkflowFillDevPreview() {
  const config = notaryConfig;
  const methods = useForm<ChecklistData>({
    resolver: zodResolver(buildZodSchema(config)) as never,
    mode: 'onBlur',
    defaultValues: buildDefaultValues(config),
  });
  const { watch, trigger } = methods;
  const values = watch();
  const progress = useProgress(config, values);
  const [activeId, setActiveId] = useState(config.sections[0].id);
  const activeSectionRef = useRef<HTMLDivElement>(null);

  const handleContinue = async (id: string) => {
    const section = config.sections.find((s) => s.id === id);
    const fieldPaths = section ? requiredFieldPaths(section) : [];
    if (fieldPaths.length > 0) {
      const valid = await trigger(fieldPaths as Parameters<typeof trigger>[0]);
      if (!valid) return;
    }
    const next = config.sections[config.sections.findIndex((s) => s.id === id) + 1];
    if (next) {
      setActiveId(next.id);
      requestAnimationFrame(() => {
        activeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-[#f4f6fb]">
        <ProductHeader
          title={config.brand.name}
          onSave={() => {}}
          onPrint={() => {}}
          onDownloadPdf={async () => {}}
          onReset={() => {}}
        />
        <main className="mx-auto max-w-[900px] px-4 py-6 sm:px-6">
          <WorkflowAccordion
            config={config}
            activeId={activeId}
            onSelect={setActiveId}
            onContinue={handleContinue}
            progressBySection={progress.sections}
            activeSectionRef={activeSectionRef}
          />
        </main>
      </div>
    </FormProvider>
  );
}
