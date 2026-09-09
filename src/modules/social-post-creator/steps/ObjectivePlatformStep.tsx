import { PrimaryButton } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { FormField } from '../../../components/ui/FormField';
import {
  PLATFORM_LABELS,
  POST_OBJECTIVE_LABELS,
  type Platform,
  type PostObjective,
} from '../types';

interface ObjectivePlatformStepProps {
  objective: PostObjective | null;
  customObjective: string;
  platform: Platform | null;
  onChangeObjective: (objective: PostObjective) => void;
  onChangeCustomObjective: (value: string) => void;
  onChangePlatform: (platform: Platform) => void;
  onContinue: () => void;
}

export function ObjectivePlatformStep({
  objective,
  customObjective,
  platform,
  onChangeObjective,
  onChangeCustomObjective,
  onChangePlatform,
  onContinue,
}: ObjectivePlatformStepProps) {
  const canContinue = Boolean(objective) && (objective !== 'other' || customObjective.trim().length > 0) && Boolean(platform);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-navy-900">What's this post for?</h2>
        <p className="mt-1 text-sm text-navy-400">Pick the objective and platform — both shape how the copy and hashtags get written.</p>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy-400">Post Objective</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.entries(POST_OBJECTIVE_LABELS) as [PostObjective, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onChangeObjective(id)}
              className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                objective === id
                  ? 'border-brand bg-brand-50 text-brand-700'
                  : 'border-navy-100 bg-white text-navy-600 hover:border-navy-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {objective === 'other' && (
          <div className="mt-3">
            <FormField label="Describe your objective" required>
              <Input
                value={customObjective}
                onChange={(e) => onChangeCustomObjective(e.target.value)}
                placeholder="e.g. Announce a new location"
              />
            </FormField>
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy-400">Platform</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.entries(PLATFORM_LABELS) as [Platform, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onChangePlatform(id)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                platform === id
                  ? 'border-brand bg-brand-50 text-brand-700'
                  : 'border-navy-100 bg-white text-navy-600 hover:border-navy-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <PrimaryButton onClick={onContinue} disabled={!canContinue}>
          Continue to Carousel
        </PrimaryButton>
      </div>
    </div>
  );
}
