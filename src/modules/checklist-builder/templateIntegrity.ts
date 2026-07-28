import { newKey } from '../../lib/utils';
import type { BuilderDraft, DraftSection } from './builderTypes';

/**
 * The Template Integrity Validator — scans a draft for duplicate
 * section/field/item ids (the root cause traced in the "Save & Continue"
 * insertBefore crash: two entries sharing an id also share a React key
 * everywhere this content renders, corrupting reconciliation) and repairs
 * them, keeping the first occurrence of any duplicated id untouched.
 *
 * Scope rules (matching how the renderer actually keys these lists):
 * - `section.id` must be unique across the whole `sections[]` array.
 * - `field.id` only needs to be unique within its OWN section's `fields[]`
 *   — the same field id repeated in a different section is not a bug,
 *   since only one section's fields ever render as siblings at a time.
 * - `item.id` only needs to be unique within its own section's `items[]`,
 *   same reasoning.
 */

export type DuplicateScope = 'section' | 'field' | 'item';

export interface DuplicateIdLocation {
  scope: DuplicateScope;
  id: string;
  sectionIndex: number;
  sectionNumber: number;
  sectionTitle: string;
  /** The field/item's own label — only present for scope 'field' | 'item'. */
  label?: string;
  /** 2nd, 3rd, ... occurrence of this id within its scope (the 1st occurrence is never reported — it's the one that's kept). */
  occurrence: number;
}

export interface TemplateIntegrityReport {
  isValid: boolean;
  duplicates: DuplicateIdLocation[];
  totalSections: number;
}

export interface IdRepair {
  scope: DuplicateScope;
  oldId: string;
  newId: string;
  location: string;
}

export interface TemplateIntegrityRepairResult {
  draft: BuilderDraft;
  repairs: IdRepair[];
}

/** Groups an array's indices by id — the shared core both scan and repair walk. */
function indicesById<T>(list: T[], getId: (item: T) => string): Map<string, number[]> {
  const map = new Map<string, number[]>();
  list.forEach((item, idx) => {
    const id = getId(item);
    const arr = map.get(id);
    if (arr) arr.push(idx);
    else map.set(id, [idx]);
  });
  return map;
}

/** Read-only scan — reports every duplicate's exact location without changing anything. */
export function scanTemplateIntegrity(draft: BuilderDraft): TemplateIntegrityReport {
  const duplicates: DuplicateIdLocation[] = [];

  const sectionGroups = indicesById(draft.sections, (s) => s.id);
  for (const indices of sectionGroups.values()) {
    if (indices.length < 2) continue;
    indices.slice(1).forEach((sectionIndex, i) => {
      const section = draft.sections[sectionIndex];
      duplicates.push({
        scope: 'section',
        id: section.id,
        sectionIndex,
        sectionNumber: section.number,
        sectionTitle: section.title || '(untitled section)',
        occurrence: i + 2,
      });
    });
  }

  draft.sections.forEach((section, sectionIndex) => {
    if (section.fields) {
      const fieldGroups = indicesById(section.fields, (f) => f.id);
      for (const indices of fieldGroups.values()) {
        if (indices.length < 2) continue;
        indices.slice(1).forEach((fieldIndex, i) => {
          const field = section.fields![fieldIndex];
          duplicates.push({
            scope: 'field',
            id: field.id,
            sectionIndex,
            sectionNumber: section.number,
            sectionTitle: section.title || '(untitled section)',
            label: field.label || '(untitled field)',
            occurrence: i + 2,
          });
        });
      }
    }

    if (section.items) {
      const itemGroups = indicesById(section.items, (it) => it.id);
      for (const indices of itemGroups.values()) {
        if (indices.length < 2) continue;
        indices.slice(1).forEach((itemIndex, i) => {
          const item = section.items![itemIndex];
          duplicates.push({
            scope: 'item',
            id: item.id,
            sectionIndex,
            sectionNumber: section.number,
            sectionTitle: section.title || '(untitled section)',
            label: item.label || '(untitled item)',
            occurrence: i + 2,
          });
        });
      }
    }
  });

  return { isValid: duplicates.length === 0, duplicates, totalSections: draft.sections.length };
}

/**
 * Repairs every duplicate found by scanTemplateIntegrity(): the first
 * occurrence of each duplicated id is left completely untouched (any
 * already-saved instance data for this template is keyed by that id — see
 * ChecklistInstance.dataJson — so changing it would silently orphan real
 * customer answers). Every subsequent occurrence gets a brand-new id (and
 * `_key`, its dnd-kit sortable identity) via the same newKey() helper
 * every non-duplicated section/field/item already uses.
 */
export function repairTemplateIntegrity(draft: BuilderDraft): TemplateIntegrityRepairResult {
  const repairs: IdRepair[] = [];

  const sectionGroups = indicesById(draft.sections, (s) => s.id);
  const sectionIndicesToRepair = new Set<number>();
  for (const indices of sectionGroups.values()) {
    if (indices.length < 2) continue;
    indices.slice(1).forEach((idx) => sectionIndicesToRepair.add(idx));
  }

  const sections: DraftSection[] = draft.sections.map((section, sectionIndex) => {
    let repaired = section;

    if (sectionIndicesToRepair.has(sectionIndex)) {
      const oldId = section.id;
      const newId = newKey();
      repairs.push({
        scope: 'section',
        oldId,
        newId,
        location: `Section ${section.number}: "${section.title || '(untitled section)'}"`,
      });
      repaired = { ...repaired, id: newId, _key: newKey() };
    }

    if (repaired.fields) {
      const fieldGroups = indicesById(repaired.fields, (f) => f.id);
      const fieldIndicesToRepair = new Set<number>();
      for (const indices of fieldGroups.values()) {
        if (indices.length < 2) continue;
        indices.slice(1).forEach((idx) => fieldIndicesToRepair.add(idx));
      }
      if (fieldIndicesToRepair.size > 0) {
        repaired = {
          ...repaired,
          fields: repaired.fields.map((field, fieldIndex) => {
            if (!fieldIndicesToRepair.has(fieldIndex)) return field;
            const oldId = field.id;
            const newId = newKey();
            repairs.push({
              scope: 'field',
              oldId,
              newId,
              location: `Section ${repaired.number} ("${repaired.title || '(untitled section)'}") → Field "${field.label || '(untitled field)'}"`,
            });
            return { ...field, id: newId, _key: newKey() };
          }),
        };
      }
    }

    if (repaired.items) {
      const itemGroups = indicesById(repaired.items, (it) => it.id);
      const itemIndicesToRepair = new Set<number>();
      for (const indices of itemGroups.values()) {
        if (indices.length < 2) continue;
        indices.slice(1).forEach((idx) => itemIndicesToRepair.add(idx));
      }
      if (itemIndicesToRepair.size > 0) {
        repaired = {
          ...repaired,
          items: repaired.items.map((item, itemIndex) => {
            if (!itemIndicesToRepair.has(itemIndex)) return item;
            const oldId = item.id;
            const newId = newKey();
            repairs.push({
              scope: 'item',
              oldId,
              newId,
              location: `Section ${repaired.number} ("${repaired.title || '(untitled section)'}") → Item "${item.label || '(untitled item)'}"`,
            });
            return { ...item, id: newId, _key: newKey() };
          }),
        };
      }
    }

    return repaired;
  });

  return { draft: { ...draft, sections }, repairs };
}
