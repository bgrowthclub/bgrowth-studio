import { useState, useEffect, Component } from 'react';
import type { ReactNode } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Eye } from 'lucide-react';
import { WorkflowAccordion } from '../../engine/components/WorkflowAccordion';
import { ProgressCard } from '../../components/ProgressCard';
import { useProgress } from '../../engine/useProgress';
import { buildZodSchema } from '../../engine/schemaBuilder';
import { buildDefaultValues } from '../../engine/defaultValues';
import { applyBrandTheme } from '../../engine/theme';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ChecklistConfig } from '../../engine/types';

class PreviewErrorBoundary extends Component<
  { children: ReactNode; resetKey: string },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; resetKey: string }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidUpdate(prevProps: { resetKey: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <p className="text-sm text-navy-400">Preview updating…</p>
        </div>
      );
    }
    return this.props.children;
  }
}

interface LivePreviewProps {
  config: ChecklistConfig;
}

function PreviewInner({ config }: { config: ChecklistConfig }) {
  const methods = useForm({
    resolver: zodResolver(buildZodSchema(config)) as never,
    mode: 'onBlur',
    defaultValues: buildDefaultValues(config),
  });
  const values = methods.watch();
  const progress = useProgress(config, values);
  const [activeId, setActiveId] = useState(config.sections[0]?.id ?? '');

  useEffect(() => {
    if (!config.sections.find((s) => s.id === activeId)) {
      setActiveId(config.sections[0]?.id ?? '');
    }
  }, [config.sections, activeId]);

  if (config.sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Eye className="h-10 w-10 text-navy-200" />
        <p className="text-sm text-navy-400">Add sections on the left to see a live preview here.</p>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <div className="flex flex-col gap-4">
        <ProgressCard
          percent={progress.percent}
          completed={progress.completedFields}
          total={progress.totalFields}
        />
        <WorkflowAccordion
          config={config}
          activeId={activeId}
          onSelect={setActiveId}
          onContinue={(id) => {
            const idx = config.sections.findIndex((s) => s.id === id);
            const next = config.sections[idx + 1];
            if (next) setActiveId(next.id);
          }}
          progressBySection={progress.sections}
        />
      </div>
    </FormProvider>
  );
}

export function LivePreview({ config }: LivePreviewProps) {
  const resetKey = config.sections.map((s) => s.id).join('-') + config.sections.length;

  useEffect(() => {
    applyBrandTheme(config.brand.primaryColor);
  }, [config.brand.primaryColor]);

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex items-center gap-2 border-b border-navy-100 bg-white px-4 py-3">
        <Eye className="h-4 w-4 text-navy-400" />
        <span className="text-sm font-semibold text-navy-700">Live Preview</span>
        <span className="ml-auto rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand">
          {config.brand.primaryColor}
        </span>
      </div>
      <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#f4f6fb] p-4">
        <PreviewErrorBoundary resetKey={resetKey}>
          <PreviewInner key={resetKey} config={config} />
        </PreviewErrorBoundary>
      </div>
    </div>
  );
}
