import { useState } from 'react';
import { Plus, RefreshCw, X } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { ErrorBlock, LoadingBlock } from '../components/StatusBlock';
import { HASHTAG_GROUP_LABELS, type HashtagGroups } from '../types';

interface HashtagStepProps {
  hashtags: HashtagGroups;
  isLoading: boolean;
  error: string | null;
  onChange: (hashtags: HashtagGroups) => void;
  onRegenerate: () => void;
  onContinue: () => void;
}

function normalizeTag(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, '');
  if (!trimmed) return '';
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

export function HashtagStep({ hashtags, isLoading, error, onChange, onRegenerate, onContinue }: HashtagStepProps) {
  const [drafts, setDrafts] = useState<Record<keyof HashtagGroups, string>>({
    niche: '',
    product: '',
    audience: '',
    location: '',
    brand: '',
  });

  if (isLoading) return <LoadingBlock message="Generating hashtags…" />;

  const groups = Object.keys(HASHTAG_GROUP_LABELS) as (keyof HashtagGroups)[];
  const totalCount = groups.reduce((sum, g) => sum + hashtags[g].length, 0);

  const removeTag = (group: keyof HashtagGroups, tag: string) => {
    onChange({ ...hashtags, [group]: hashtags[group].filter((t) => t !== tag) });
  };

  const addTag = (group: keyof HashtagGroups) => {
    const tag = normalizeTag(drafts[group]);
    if (!tag || hashtags[group].includes(tag)) {
      setDrafts((d) => ({ ...d, [group]: '' }));
      return;
    }
    onChange({ ...hashtags, [group]: [...hashtags[group], tag] });
    setDrafts((d) => ({ ...d, [group]: '' }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-navy-900">Hashtags</h2>
          <p className="mt-1 text-sm text-navy-400">Grouped by purpose — edit, remove, or add your own in each group.</p>
        </div>
        <SecondaryButton size="sm" onClick={onRegenerate}>
          <RefreshCw className="h-4 w-4" /> Regenerate All
        </SecondaryButton>
      </div>

      {error && <ErrorBlock message={error} onRetry={onRegenerate} />}

      {totalCount === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-navy-100 bg-white py-10 text-center text-sm text-navy-400">
          No hashtags yet.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group} className="rounded-xl border border-navy-100 bg-white p-3.5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy-400">{HASHTAG_GROUP_LABELS[group]}</p>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {hashtags[group].length === 0 && <span className="text-xs text-navy-300">None yet</span>}
                {hashtags[group].map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700"
                  >
                    {tag}
                    <button type="button" onClick={() => removeTag(group, tag)} aria-label={`Remove ${tag}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={drafts[group]}
                  onChange={(e) => setDrafts((d) => ({ ...d, [group]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(group);
                    }
                  }}
                  placeholder="Add a hashtag"
                  className="h-9"
                />
                <SecondaryButton size="sm" onClick={() => addTag(group)}>
                  <Plus className="h-4 w-4" />
                </SecondaryButton>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <PrimaryButton onClick={onContinue}>Continue to Preview</PrimaryButton>
      </div>
    </div>
  );
}
