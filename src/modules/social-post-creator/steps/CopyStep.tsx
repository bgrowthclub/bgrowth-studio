import { RefreshCw } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '../../../components/ui/Button';
import { Textarea } from '../../../components/ui/Textarea';
import { Input } from '../../../components/ui/Input';
import { FormField } from '../../../components/ui/FormField';
import { ErrorBlock, LoadingBlock } from '../components/StatusBlock';
import type { CopyTarget, GeneratedCopy } from '../types';

interface CopyStepProps {
  copy: GeneratedCopy;
  isLoading: boolean;
  regeneratingField: CopyTarget | null;
  error: string | null;
  onChange: (patch: Partial<GeneratedCopy>) => void;
  onRegenerate: (target: CopyTarget) => void;
  onContinue: () => void;
}

const FIELD_LABELS: Record<'phrase' | 'caption' | 'cta', string> = {
  phrase: 'Main Phrase / Headline',
  caption: 'Full Caption',
  cta: 'Call to Action',
};

export function CopyStep({ copy, isLoading, regeneratingField, error, onChange, onRegenerate, onContinue }: CopyStepProps) {
  if (isLoading) return <LoadingBlock message="Writing your phrase, caption, and CTA…" />;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-navy-900">Copy</h2>
        <p className="mt-1 text-sm text-navy-400">Edit any field directly, or regenerate just one part without losing the rest.</p>
      </div>

      {error && <ErrorBlock message={error} onRetry={() => onRegenerate('all')} />}

      {(['phrase', 'caption', 'cta'] as const).map((field) => (
        <FormField
          key={field}
          label={FIELD_LABELS[field]}
          icon={
            <button
              type="button"
              onClick={() => onRegenerate(field)}
              disabled={regeneratingField !== null}
              title={`Regenerate ${FIELD_LABELS[field]}`}
              className="ml-auto flex items-center gap-1 text-[11px] font-bold text-brand hover:text-brand-600 disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${regeneratingField === field ? 'animate-spin' : ''}`} />
            </button>
          }
        >
          {field === 'phrase' ? (
            <Input value={copy.phrase} onChange={(e) => onChange({ phrase: e.target.value })} placeholder="Short, high-impact phrase" />
          ) : field === 'cta' ? (
            <Input value={copy.cta} onChange={(e) => onChange({ cta: e.target.value })} placeholder="What should people do next?" />
          ) : (
            <Textarea
              value={copy.caption}
              onChange={(e) => onChange({ caption: e.target.value })}
              placeholder="Full social caption"
              className="min-h-[120px]"
            />
          )}
        </FormField>
      ))}

      <div className="flex justify-between">
        <SecondaryButton onClick={() => onRegenerate('all')} disabled={regeneratingField !== null}>
          <RefreshCw className="h-4 w-4" /> Regenerate All
        </SecondaryButton>
        <PrimaryButton onClick={onContinue}>Continue to Hashtags</PrimaryButton>
      </div>
    </div>
  );
}
