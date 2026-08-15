import type { ChecklistConfig, SectionConfig, FieldConfig, ChecklistItemConfig } from '../../engine/types';
import type { BuilderDraft, DraftSection, DraftField, DraftItem } from './builderTypes';

function draftSectionToConfig(s: DraftSection, index: number): SectionConfig {
  const base = {
    id: s.id,
    number: index + 1,
    title: s.title,
    description: s.description,
    icon: s.icon,
    optional: s.optional,
    whyItMatters: s.whyItMatters,
    tip: s.tip,
  };

  if (s.type === 'form') {
    const fields: FieldConfig[] = (s.fields ?? []).map((f: DraftField) => {
      const { _key, ...rest } = f;
      void _key;
      return rest as FieldConfig;
    });
    return { ...base, type: 'form', fields };
  }
  if (s.type === 'checklist') {
    const items: ChecklistItemConfig[] = (s.items ?? []).map((i: DraftItem) => {
      const { _key, ...rest } = i;
      void _key;
      return rest as ChecklistItemConfig;
    });
    return { ...base, type: 'checklist', items };
  }
  if (s.type === 'outcome') {
    const items: ChecklistItemConfig[] = (s.items ?? []).map((i: DraftItem) => {
      const { _key, ...rest } = i;
      void _key;
      return rest as ChecklistItemConfig;
    });
    return { ...base, type: 'outcome', items };
  }
  return { ...base, type: 'notes' };
}

export function draftToConfig(draft: BuilderDraft): ChecklistConfig {
  return {
    productId: draft.templateId ?? `draft-${Date.now()}`,
    brand: {
      name: draft.name || 'Untitled Checklist',
      companyLabel: 'BGrowth Club',
      primaryColor: draft.primaryColor,
    },
    footer: {
      proTip: 'Complete all sections for the most accurate recordkeeping.',
      helpText: 'Visit portal.bgrowth.app for resources and support.',
      helpUrl: 'https://portal.bgrowth.app',
    },
    sections: draft.sections.map((s, i) => draftSectionToConfig(s, i)),
    // Round-trips cover image/description/price/currency/trial config/
    // publish state through Studio's own template storage (configJson) —
    // see PublishingMetadata's own docs for why this lives here rather than
    // relying on the Portal to remember it back to Studio.
    publishing: {
      shortDescription: draft.shortDescription,
      coverImageUrl: draft.coverImageUrl,
      isFree: draft.isFree ?? false,
      priceCents: draft.isFree ? null : draft.price != null ? Math.round(draft.price * 100) : null,
      currency: draft.currency ?? 'usd',
      stripePriceId: draft.stripePriceId ?? null,
      status: draft.publishStatus ?? 'draft',
      publishedAt: draft.publishedAt ?? null,
      isTrialEligible: draft.isTrialEligible ?? true,
      trialDuration: draft.trialDuration ?? null,
      trialUnit: draft.trialUnit ?? 'days',
    },
  };
}

export function draftToConfigJson(draft: BuilderDraft): string {
  return JSON.stringify(draftToConfig(draft));
}
