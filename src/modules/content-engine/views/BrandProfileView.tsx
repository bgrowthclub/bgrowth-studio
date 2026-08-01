import { useEffect, useState } from 'react';
import { fetchBrandProfile, updateBrandProfile } from '../api/contentEngineClient';
import type { BrandProfile } from '../types';

type FormState = {
  name: string;
  tagline: string;
  default_language: string;
  tone_voice: string;
  messaging_principles: string;
  prohibited_styles: string;
  preferred_cta_styles: string;
  target_audience: string;
  social_content_rules: string;
};

function toForm(profile: BrandProfile): FormState {
  return {
    name: profile.name,
    tagline: profile.tagline ?? '',
    default_language: profile.default_language,
    tone_voice: JSON.stringify(profile.tone_voice ?? {}, null, 2),
    messaging_principles: (profile.messaging_principles ?? []).join('\n'),
    prohibited_styles: (profile.prohibited_styles ?? []).join('\n'),
    preferred_cta_styles: (profile.preferred_cta_styles ?? []).join('\n'),
    target_audience: JSON.stringify(profile.target_audience ?? {}, null, 2),
    social_content_rules: JSON.stringify(profile.social_content_rules ?? {}, null, 2),
  };
}

/**
 * Edits the single BGrowth brand_profile row every generation prompt draws
 * on server-side (see api/_lib/contentEngine/promptBuilder.js) — this is
 * the one place that voice/tone/messaging rules live, so no individual
 * campaign or generation call has to redefine them.
 */
export function BrandProfileView() {
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchBrandProfile()
      .then((profile) => setForm(toForm(profile)))
      .catch((err) => setError(err.message));
  }, []);

  const handleSave = async () => {
    if (!form) return;
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      let toneVoice: Record<string, unknown>;
      let targetAudience: Record<string, unknown>;
      let socialRules: Record<string, unknown>;
      try {
        toneVoice = JSON.parse(form.tone_voice || '{}');
        targetAudience = JSON.parse(form.target_audience || '{}');
        socialRules = JSON.parse(form.social_content_rules || '{}');
      } catch {
        throw new Error('Tone/Voice, Target Audience, and Social Content Rules must each be valid JSON.');
      }

      const updated = await updateBrandProfile({
        name: form.name,
        tagline: form.tagline || null,
        default_language: form.default_language,
        tone_voice: toneVoice,
        messaging_principles: form.messaging_principles.split('\n').filter(Boolean),
        prohibited_styles: form.prohibited_styles.split('\n').filter(Boolean),
        preferred_cta_styles: form.preferred_cta_styles.split('\n').filter(Boolean),
        target_audience: targetAudience,
        social_content_rules: socialRules,
      });
      setForm(toForm(updated));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save brand profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (error && !form) return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>;
  if (!form) return <p className="text-sm text-navy-400">Loading brand profile…</p>;

  const field = (key: keyof FormState, label: string, rows = 1) => (
    <div>
      <label className="mb-1 block text-xs font-semibold text-navy-600">{label}</label>
      {rows > 1 ? (
        <textarea
          value={form[key]}
          rows={rows}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className="w-full rounded-lg border border-navy-100 px-3 py-2 font-mono text-xs outline-none focus:border-brand-500"
        />
      ) : (
        <input
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
      <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card space-y-4">
        {field('name', 'Brand Name')}
        {field('tagline', 'Tagline')}
        {field('default_language', 'Default Language')}
        {field('messaging_principles', 'Messaging Principles (one per line)', 4)}
        {field('prohibited_styles', 'Prohibited / Avoided Styles (one per line)', 3)}
        {field('preferred_cta_styles', 'Preferred CTA Styles (one per line)', 3)}
        {field('tone_voice', 'Tone / Voice Rules (JSON)', 4)}
        {field('target_audience', 'Target Audience Guidance (JSON)', 4)}
        {field('social_content_rules', 'Social Content Rules (JSON)', 4)}

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save Brand Profile'}
          </button>
          {saved && <span className="text-xs font-semibold text-success">Saved</span>}
        </div>
      </div>
    </div>
  );
}
