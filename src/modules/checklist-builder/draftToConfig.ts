import type { ChecklistConfig, SectionConfig, FieldConfig, ChecklistItemConfig } from '../../engine/types';
import type { BuilderDraft, DraftSection, DraftField, DraftItem } from './builderTypes';

function draftSectionToConfig(s: DraftSection, index: number): SectionConfig {
  const base = {
    id: s.id,
    number: index + 1,
    // The Portal requires these as text — an imported template can leave
    // them out, which used to fail the whole publish.
    title: s.title ?? '',
    description: s.description ?? '',
    icon: s.icon || 'file-text',
    optional: s.optional,
    whyItMatters: s.whyItMatters,
    tip: s.tip,
  };

  if (s.type === 'form') {
    const fields: FieldConfig[] = (s.fields ?? []).map((f: DraftField) => {
      const { _key, ...rest } = f;
      void _key;
      return { ...rest, label: rest.label ?? '', icon: rest.icon || 'type' } as FieldConfig;
    });
    return { ...base, type: 'form', fields };
  }
  if (s.type === 'checklist') {
    const items: ChecklistItemConfig[] = (s.items ?? []).map((i: DraftItem) => {
      const { _key, ...rest } = i;
      void _key;
      return { ...rest, label: rest.label ?? '' } as ChecklistItemConfig;
    });
    return { ...base, type: 'checklist', items };
  }
  if (s.type === 'outcome') {
    const items: ChecklistItemConfig[] = (s.items ?? []).map((i: DraftItem) => {
      const { _key, ...rest } = i;
      void _key;
      return { ...rest, label: rest.label ?? '' } as ChecklistItemConfig;
    });
    return { ...base, type: 'outcome', items };
  }
  if (s.type === 'notes') {
    return { ...base, type: 'notes' };
  }

  // Unrecognized type — never silently coerce this to 'notes'. That used to
  // happen here (the fallback below every other branch), which silently
  // dropped the section's fields/items and relabeled it, with no error and
  // no trace, the moment a section's type was anything other than exactly
  // 'form'/'checklist'/'outcome'. Fail loudly and explicitly instead, so a
  // caller (Save Template, Publish — both already wrap draftToConfig in a
  // try/catch and surface e.message via a toast) gets a clear, actionable
  // error naming the exact section, instead of Studio quietly publishing
  // content it silently rewrote.
  throw new Error(
    `Section "${s.title || s.id}" has an unrecognized type ("${String((s as { type?: unknown }).type)}") — expected "form", "checklist", "notes", or "outcome". Refusing to save/publish with corrupted section data.`
  );
}

export function draftToConfig(draft: BuilderDraft): ChecklistConfig {
  return {
    productId: draft.templateId ?? `draft-${Date.now()}`,
    brand: {
      name: draft.name || 'Untitled Checklist',
      companyLabel: 'BGrowth',
      // The Portal accepts only a hex color.
      primaryColor: /^#[0-9a-fA-F]{3,8}$/.test(draft.primaryColor ?? '') ? draft.primaryColor : '#1061EC',
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
      categorySlug: draft.category || null,
    },
  };
}

export function draftToConfigJson(draft: BuilderDraft): string {
  return JSON.stringify(draftToConfig(draft));
}

interface PublishIssue {
  path?: (string | number)[];
  message?: string;
}

// Turns the Portal's validation issues ("sections.2.fields.1.type: Invalid
// enum value") into words a person can act on: which section, which field
// or item, and what is wrong. The first issue goes in the toast; all of
// them go to the console.
export function describePublishIssues(issues: unknown, config: ReturnType<typeof draftToConfig>): string | null {
  if (!Array.isArray(issues) || issues.length === 0) return null;
  const describe = (issue: PublishIssue): string => {
    const path = issue.path ?? [];
    const parts: string[] = [];
    if (path[0] === 'sections' && typeof path[1] === 'number') {
      const section = config.sections[path[1]];
      parts.push(`Section ${path[1] + 1}${section?.title ? ` "${section.title}"` : ''}`);
      if ((path[2] === 'fields' || path[2] === 'items') && typeof path[3] === 'number') {
        const list = (section as unknown as Record<string, { label?: string }[] | undefined>)?.[path[2]];
        const label = list?.[path[3]]?.label;
        parts.push(`${path[2] === 'fields' ? 'field' : 'item'} ${path[3] + 1}${label ? ` "${label}"` : ''}`);
        if (path[4] !== undefined) parts.push(String(path[4]));
      } else if (path[2] !== undefined) {
        parts.push(String(path[2]));
      }
    } else if (path.length > 0) {
      parts.push(path.join(' › '));
    }
    return `${parts.join(' › ')}${parts.length ? ': ' : ''}${issue.message ?? 'invalid value'}`;
  };
  const list = (issues as PublishIssue[]).map(describe);
  console.error('Publish validation issues', list);
  return list.length > 1 ? `${list[0]} (+${list.length - 1} more — see console)` : list[0];
}
