import { useState } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { ChevronDown, ChevronUp, Trash2, Plus, Copy, MoreVertical, Pencil } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { SortableRow } from './SortableRow';
import { IconPicker } from './IconPicker';
import { FieldEditor } from './FieldEditor';
import { ChecklistItemEditor } from './ChecklistItemEditor';
import { getIcon } from '../../engine/icons';
import { SECTION_TYPE_LABELS, SECTION_TYPE_DESCRIPTIONS } from './builderTypes';
import type { DraftSection, DraftField, DraftItem } from './builderTypes';
import type { SectionType } from '../../engine/types';
import { newKey } from '../../lib/utils';
// cn is used in the section header className

function defaultField(): DraftField {
  return { _key: newKey(), id: newKey(), label: '', type: 'text', icon: 'file-text', required: false };
}

function defaultItem(): DraftItem {
  return { _key: newKey(), id: newKey(), label: '' };
}

interface SectionEditorProps {
  section: DraftSection;
  index: number;
  onChange: (updated: DraftSection) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function SectionEditor({ section, index, onChange, onDelete, onDuplicate, onMoveUp, onMoveDown, isFirst, isLast }: SectionEditorProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [open, setOpen] = useState(index === 0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const SectionIcon = getIcon(section.icon);

  const set = <K extends keyof DraftSection>(key: K, val: DraftSection[K]) =>
    onChange({ ...section, [key]: val });

  const changeType = (type: SectionType) => {
    const base = { ...section, type };
    if (type === 'form' && !base.fields) base.fields = [defaultField()];
    if ((type === 'checklist' || type === 'outcome') && !base.items) base.items = [defaultItem()];
    onChange(base);
    setOpen(true); // garantir que a seção abre após trocar o tipo
  };

  /* ---- Fields (form sections) ---- */
  const addField = () => onChange({ ...section, fields: [...(section.fields ?? []), defaultField()] });
  const duplicateField = (fi: number) => {
    const fields = [...(section.fields ?? [])];
    // newKey() (random, not Date.now()-based) for both — `id` ends up as the
    // React key everywhere this content renders (builder AND, once
    // published, every customer-facing Workspace/Checklist screen), so two
    // fields duplicated within the same millisecond must never collide.
    const clone = { ...fields[fi], _key: newKey(), id: newKey() };
    fields.splice(fi + 1, 0, clone);
    onChange({ ...section, fields });
  };
  const updateField = (idx: number, f: DraftField) => {
    const fields = [...(section.fields ?? [])];
    fields[idx] = f;
    onChange({ ...section, fields });
  };
  const deleteField = (idx: number) => {
    const fields = (section.fields ?? []).filter((_, i) => i !== idx);
    onChange({ ...section, fields });
  };
  const onFieldsDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const fields = section.fields ?? [];
    const from = fields.findIndex((f) => f._key === active.id);
    const to = fields.findIndex((f) => f._key === over.id);
    onChange({ ...section, fields: arrayMove(fields, from, to) });
  };

  /* ---- Items (checklist/outcome sections) ---- */
  const addItem = () => onChange({ ...section, items: [...(section.items ?? []), defaultItem()] });
  const duplicateItem = (ii: number) => {
    const items = [...(section.items ?? [])];
    // Same reasoning as duplicateField above: newKey() for both, never
    // Date.now() alone.
    const clone = { ...items[ii], _key: newKey(), id: newKey() };
    items.splice(ii + 1, 0, clone);
    onChange({ ...section, items });
  };
  const updateItem = (idx: number, item: DraftItem) => {
    const items = [...(section.items ?? [])];
    items[idx] = item;
    onChange({ ...section, items });
  };
  const deleteItem = (idx: number) => {
    const items = (section.items ?? []).filter((_, i) => i !== idx);
    onChange({ ...section, items });
  };
  const onItemsDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const items = section.items ?? [];
    const from = items.findIndex((i) => i._key === active.id);
    const to = items.findIndex((i) => i._key === over.id);
    onChange({ ...section, items: arrayMove(items, from, to) });
  };

  return (
    <SortableRow id={section._key} className="p-0 items-stretch">
      <div className="flex flex-1 flex-col">
        {/* Section header bar (always visible) */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-3 rounded-t-xl px-4 py-3 text-left hover:bg-navy-50"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand">
            <SectionIcon className="h-4 w-4" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block truncate text-[14px] font-semibold text-navy-800">
              {section.title || `Section ${index + 1}`}
            </span>
            <span className="block text-[11px] text-navy-400">
              {SECTION_TYPE_LABELS[section.type]}
              {section.type === 'form' && ` · ${(section.fields ?? []).length} field(s)`}
              {(section.type === 'checklist' || section.type === 'outcome') && ` · ${(section.items ?? []).length} item(s)`}
            </span>
          </span>
          <div className="relative flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpen(v => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-navy-300 hover:bg-navy-50 hover:text-navy-600"
              title="Expand / Collapse"
            >
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setShowMenu(v => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-navy-300 hover:bg-navy-50 hover:text-navy-600"
              title="More actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 z-20 min-w-[160px] rounded-xl border border-navy-100 bg-white shadow-lg py-1">
                <button type="button" onClick={() => { setOpen(true); setShowMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-brand-50 hover:text-brand">
                  <Pencil className="h-3.5 w-3.5" /> Rename
                </button>
                {onDuplicate && (
                  <button type="button" onClick={() => { onDuplicate(); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-brand-50 hover:text-brand">
                    <Copy className="h-3.5 w-3.5" /> Duplicate
                  </button>
                )}
                {!isFirst && onMoveUp && (
                  <button type="button" onClick={() => { onMoveUp(); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-brand-50 hover:text-brand">
                    <ChevronUp className="h-3.5 w-3.5" /> Move Up
                  </button>
                )}
                {!isLast && onMoveDown && (
                  <button type="button" onClick={() => { onMoveDown(); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-brand-50 hover:text-brand">
                    <ChevronDown className="h-3.5 w-3.5" /> Move Down
                  </button>
                )}
                {open && (
                  <button type="button" onClick={() => { setOpen(false); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-brand-50 hover:text-brand">
                    <ChevronUp className="h-3.5 w-3.5" /> Collapse
                  </button>
                )}
                <div className="my-1 border-t border-navy-100" />
                <button type="button" onClick={() => { onDelete(); setShowMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </button>

        {/* Expanded body */}
        {open && (
          <div className="flex flex-col gap-5 border-t border-navy-100 p-4">
            {/* Basic info */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Section Title *</label>
                <Input value={section.title} placeholder="e.g. Client Information" onChange={(e) => set('title', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Section Type</label>
                <Select value={section.type} onChange={(e) => changeType(e.target.value as SectionType)}>
                  {(Object.entries(SECTION_TYPE_LABELS) as [SectionType, string][]).map(([val, label]) => (
                    <option key={val} value={val}>{label} — {SECTION_TYPE_DESCRIPTIONS[val]}</option>
                  ))}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Short Description</label>
                <Input value={section.description} placeholder="e.g. Basic contact details for this appointment." onChange={(e) => set('description', e.target.value)} />
              </div>
            </div>

            {/* Icon */}
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Section Icon</label>
              <IconPicker value={section.icon} onChange={(v) => set('icon', v)} />
            </div>

            {/* Why it matters / Tip */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Why it matters (optional)</label>
                <Textarea rows={2} value={section.whyItMatters ?? ''} placeholder="Explains to the user why this section is important." onChange={(e) => set('whyItMatters', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Tip (optional)</label>
                <Textarea rows={2} value={section.tip ?? ''} placeholder="A practical tip shown at the bottom of the section." onChange={(e) => set('tip', e.target.value)} />
              </div>
            </div>

            {/* Optional toggle */}
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-navy-600">
              <input type="checkbox" checked={!!section.optional} onChange={(e) => set('optional', e.target.checked)} className="h-4 w-4 rounded accent-brand" />
              Mark this section as optional (doesn't count toward progress)
            </label>

            {/* Form fields editor */}
            {section.type === 'form' && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">Fields</p>
                  <button type="button" onClick={addField} className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-semibold text-brand hover:bg-brand-50">
                    <Plus className="h-3.5 w-3.5" /> Add field
                  </button>
                </div>
                {(section.fields ?? []).length > 0 && (
                  <button type="button" onClick={addField} className="mb-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-brand/30 px-2.5 py-1.5 text-[11px] font-semibold text-brand hover:bg-brand-50">
                    <Plus className="h-3 w-3" /> Add field above
                  </button>
                )}
                <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onFieldsDragEnd}>
                  <SortableContext items={(section.fields ?? []).map((f) => f._key)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-2">
                      {(section.fields ?? []).map((field, fi) => (
                        <FieldEditor key={field._key} field={field} onChange={(updated) => updateField(fi, updated)} onDelete={() => deleteField(fi)} onDuplicate={() => duplicateField(fi)} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                {(section.fields ?? []).length === 0 && (
                  <p className="rounded-lg border border-dashed border-navy-200 py-4 text-center text-sm text-navy-400">No fields yet — click "Add field" to start.</p>
                )}
              </div>
            )}

            {/* Checklist / Outcome items editor */}
            {(section.type === 'checklist' || section.type === 'outcome') && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">Items</p>
                  <button type="button" onClick={addItem} className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-semibold text-brand hover:bg-brand-50">
                    <Plus className="h-3.5 w-3.5" /> Add item
                  </button>
                </div>
                {(section.items ?? []).length > 0 && (
                  <button type="button" onClick={addItem} className="mb-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-brand/30 px-2.5 py-1.5 text-[11px] font-semibold text-brand hover:bg-brand-50">
                    <Plus className="h-3 w-3" /> Add item above
                  </button>
                )}
                <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onItemsDragEnd}>
                  <SortableContext items={(section.items ?? []).map((i) => i._key)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-2">
                      {(section.items ?? []).map((item, ii) => (
                        <ChecklistItemEditor key={item._key} item={item} onChange={(updated) => updateItem(ii, updated)} onDelete={() => deleteItem(ii)} onDuplicate={() => duplicateItem(ii)} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                {(section.items ?? []).length === 0 && (
                  <p className="rounded-lg border border-dashed border-navy-200 py-4 text-center text-sm text-navy-400">No items yet — click "Add item" to start.</p>
                )}
              </div>
            )}

            {section.type === 'notes' && (
              <p className="rounded-lg bg-navy-50 px-3 py-2.5 text-sm text-navy-500">
                Notes sections render as a single free-text area — no additional configuration needed.
              </p>
            )}
          </div>
        )}
      </div>
    </SortableRow>
  );
}
