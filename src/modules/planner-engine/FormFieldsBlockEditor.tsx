import { useState } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { newId, type FormFieldType } from './types';
import { cn } from '../../lib/utils';

// -----------------------------------------------------------------------
// Field type picker modal — like Wix
// -----------------------------------------------------------------------
const FIELD_TYPE_GROUPS = [
  {
    label: 'Essentials',
    types: [
      { type: 'text' as FormFieldType, icon: 'T', label: 'Text', description: 'Short text, titles, names' },
      { type: 'textarea' as FormFieldType, icon: '✎', label: 'Long Text', description: 'Paragraphs, detailed answers' },
      { type: 'number' as FormFieldType, icon: '#', label: 'Number', description: 'Quantities, amounts, ratings' },
      { type: 'email' as FormFieldType, icon: '✉', label: 'Email', description: 'Email addresses' },
      { type: 'phone' as FormFieldType, icon: '📞', label: 'Phone', description: 'Phone numbers' },
      { type: 'date' as FormFieldType, icon: '📅', label: 'Date', description: 'Dates and deadlines' },
      { type: 'time' as FormFieldType, icon: '⏰', label: 'Time', description: 'Time values' },
      { type: 'checkbox' as FormFieldType, icon: '☑', label: 'Checkbox', description: 'Yes or no, true or false' },
    ],
  },
  {
    label: 'Selection',
    types: [
      { type: 'select' as FormFieldType, icon: '▾', label: 'Dropdown', description: 'Choose from a list of options' },
    ],
  },
  {
    label: 'Layout & Content',
    types: [
      { type: 'title' as FormFieldType, icon: 'H', label: 'Title', description: 'Heading for visual organization' },
      { type: 'static_text' as FormFieldType, icon: '¶', label: 'Text Block', description: 'Static paragraph or instructions' },
    ],
  },
];

function FieldTypePicker({ onSelect, onClose }: { onSelect: (type: FormFieldType) => void; onClose: () => void }) {
  const [hovered, setHovered] = useState<FormFieldType | null>(null);
  const [selected, setSelected] = useState<FormFieldType | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-navy-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-navy-900">Choose field type</h2>
            <p className="mt-0.5 text-sm text-navy-400">Select the type that best fits your field.</p>
          </div>
          <button type="button" onClick={onClose} className="text-navy-300 hover:text-navy-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Field types */}
        <div className="max-h-[400px] overflow-y-auto px-6 py-4">
          {FIELD_TYPE_GROUPS.map(group => (
            <div key={group.label} className="mb-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-400">{group.label}</p>
              <div className="grid grid-cols-3 gap-2">
                {group.types.map(ft => (
                  <button
                    key={ft.type}
                    type="button"
                    onClick={() => setSelected(ft.type)}
                    onMouseEnter={() => setHovered(ft.type)}
                    onMouseLeave={() => setHovered(null)}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all',
                      selected === ft.type
                        ? 'border-brand bg-brand-50 shadow-sm'
                        : 'border-navy-100 hover:border-brand-200 hover:bg-brand-50/40'
                    )}
                  >
                    <span className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
                      selected === ft.type ? 'bg-brand text-white' : 'bg-navy-100 text-navy-600'
                    )}>
                      {ft.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-navy-800 truncate">{ft.label}</p>
                      <p className="text-[10px] text-navy-400 leading-tight">{ft.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-navy-100 px-6 py-4">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50">
            Cancel
          </button>
          <button type="button" disabled={!selected}
            onClick={() => selected && onSelect(selected)}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40">
            Choose Field Type
          </button>
        </div>
      </div>
    </div>
  );
}

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Text', email: 'Email', phone: 'Phone', number: 'Number',
  date: 'Date', time: 'Time', textarea: 'Long Text', select: 'Dropdown', checkbox: 'Checkbox',
  title: 'Title (Heading)', static_text: 'Text Block (Static Paragraph)',
};

export interface PlannerFormField {
  id: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  required: boolean;
  options?: string[];
  icon?: string;
}

export interface FormFieldsConfig {
  type: 'form_fields';
  sectionTitle: string;
  description: string;
  icon: string;
  whyItMatters?: string;
  tip?: string;
  optional: boolean;
  fields: PlannerFormField[];
}

function defaultField(type: FormFieldType = 'text'): PlannerFormField {
  return { id: newId(), label: '', type, required: false, placeholder: '' };
}

// -----------------------------------------------------------------------
// Sortable Field Row
// -----------------------------------------------------------------------
function SortableFieldRow({
  field,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  field: PlannerFormField;
  onChange: (f: PlannerFormField) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });

  const isStatic = field.type === 'title' || field.type === 'static_text';

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('rounded-xl border border-navy-100 bg-white p-3 shadow-card', isDragging && 'opacity-50 shadow-cardHover')}>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-end gap-2">
          <div className="flex items-center gap-0.5 shrink-0 pb-1">
            <button type="button" className="cursor-grab p-1.5 text-navy-300 hover:text-navy-500 active:cursor-grabbing"
              {...attributes} {...listeners}>
              <GripVertical className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={isFirst}
              onClick={e => { e.stopPropagation(); onMoveUp?.(); }}
              title="Move Up"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-navy-300 hover:bg-navy-50 hover:text-navy-700 disabled:opacity-25"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={isLast}
              onClick={e => { e.stopPropagation(); onMoveDown?.(); }}
              title="Move Down"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-navy-300 hover:bg-navy-50 hover:text-navy-700 disabled:opacity-25"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-navy-400">
              {field.type === 'title' ? 'Heading Text' : field.type === 'static_text' ? 'Paragraph Text' : 'Field Label'}
            </label>
            {field.type === 'static_text' ? (
              <textarea
                rows={2}
                className="w-full resize-y rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm text-navy-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                value={field.label}
                placeholder="Enter instructions or information paragraph text..."
                onChange={e => onChange({ ...field, label: e.target.value })}
              />
            ) : (
              <Input
                value={field.label}
                placeholder={field.type === 'title' ? 'Enter heading title...' : 'e.g. Client Name'}
                onChange={e => onChange({ ...field, label: e.target.value })}
              />
            )}
          </div>
          <div className="w-28 pb-1">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-navy-400">Type</label>
            <Select value={field.type} onChange={e => onChange({ ...field, type: e.target.value as FormFieldType })}>
              {(Object.entries(FIELD_TYPE_LABELS) as [FormFieldType, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2 pb-1.5 shrink-0">
            {!isStatic && (
              <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-navy-600 whitespace-nowrap">
                <input type="checkbox" checked={!!field.required}
                  onChange={e => onChange({ ...field, required: e.target.checked })}
                  className="h-3.5 w-3.5 rounded accent-brand" />
                Required
              </label>
            )}
            <button type="button" onClick={onDelete}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-navy-300 hover:bg-red-50 hover:text-red-500">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {!isStatic && (
          <div className="pl-24">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-navy-400">Placeholder (optional)</label>
            <Input value={field.placeholder ?? ''} placeholder="e.g. John Smith"
              onChange={e => onChange({ ...field, placeholder: e.target.value })} />
          </div>
        )}
        {field.type === 'select' && (
          <div className="pl-24">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-navy-400">Options (one per line)</label>
            <textarea rows={3}
              className="w-full resize-y rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm text-navy-800 focus:border-brand focus:outline-none"
              placeholder={"Option A\nOption B\nOption C"}
              value={(field.options ?? []).join('\n')}
              onChange={e => onChange({ ...field, options: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })} />
          </div>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------
// Main Form Fields Block Editor
// -----------------------------------------------------------------------
interface FormFieldsBlockEditorProps {
  config: FormFieldsConfig;
  onChange: (config: FormFieldsConfig) => void;
}

const SECTION_ICONS = ['📋', '👤', '📅', '📞', '📧', '🏠', '💼', '📝', '🔒', '💳', '📍', '⏰', '🎯', '📊', '✅', '📄'];

export function FormFieldsBlockEditor({ config, onChange }: FormFieldsBlockEditorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const set = <K extends keyof FormFieldsConfig>(key: K, val: FormFieldsConfig[K]) =>
    onChange({ ...config, [key]: val });

  const addField = (type: FormFieldType) => {
    onChange({ ...config, fields: [...config.fields, defaultField(type)] });
    setShowPicker(false);
  };

  const updateField = (idx: number, f: PlannerFormField) => {
    const fields = [...config.fields]; fields[idx] = f; onChange({ ...config, fields });
  };

  const deleteField = (idx: number) => onChange({ ...config, fields: config.fields.filter((_, i) => i !== idx) });

  const moveFieldUp = (idx: number) => {
    if (idx === 0) return;
    const fields = [...config.fields];
    const temp = fields[idx];
    fields[idx] = fields[idx - 1];
    fields[idx - 1] = temp;
    onChange({ ...config, fields });
  };

  const moveFieldDown = (idx: number) => {
    if (idx === config.fields.length - 1) return;
    const fields = [...config.fields];
    const temp = fields[idx];
    fields[idx] = fields[idx + 1];
    fields[idx + 1] = temp;
    onChange({ ...config, fields });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = config.fields.findIndex(f => f.id === active.id);
    const to = config.fields.findIndex(f => f.id === over.id);
    onChange({ ...config, fields: arrayMove(config.fields, from, to) });
  };

  return (
    <div className="flex flex-col gap-4">
      {showPicker && <FieldTypePicker onSelect={addField} onClose={() => setShowPicker(false)} />}

      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-navy-400">Section Title *</label>
        <Input value={config.sectionTitle} placeholder="e.g. Client Information"
          onChange={e => set('sectionTitle', e.target.value)} />
      </div>

      <div className="rounded-lg border border-navy-100 bg-navy-50 px-3 py-2 text-xs text-navy-500">
        <span className="font-semibold">Section Type:</span> Form Fields
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-navy-400">Short Description</label>
        <Input value={config.description} placeholder="e.g. Basic contact details."
          onChange={e => set('description', e.target.value)} />
      </div>

      <div>
        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-navy-400">Section Icon</label>
        <div className="grid grid-cols-8 gap-1">
          {SECTION_ICONS.map(icon => (
            <button key={icon} type="button" onClick={() => set('icon', icon)}
              className={cn('flex h-8 w-8 items-center justify-center rounded-lg text-base transition-colors',
                config.icon === icon ? 'bg-brand text-white' : 'bg-navy-50 hover:bg-navy-100')}>
              {icon}
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={() => setShowAdvanced(v => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-navy-500 hover:text-navy-800">
        {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        Advanced options
      </button>

      {showAdvanced && (
        <div className="flex flex-col gap-3 rounded-xl border border-navy-100 bg-navy-50 p-3">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-navy-400">Why It Matters (optional)</label>
            <Textarea rows={2} value={config.whyItMatters ?? ''} placeholder="Explains why this section matters."
              onChange={e => set('whyItMatters', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-navy-400">Tip (optional)</label>
            <Textarea rows={2} value={config.tip ?? ''} placeholder="A practical tip for the user."
              onChange={e => set('tip', e.target.value)} />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-navy-700">
            <input type="checkbox" checked={config.optional}
              onChange={e => set('optional', e.target.checked)} className="h-3.5 w-3.5 rounded accent-brand" />
            Mark as optional (doesn't count toward progress)
          </label>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[10px] font-bold uppercase tracking-wide text-navy-400">
            Fields ({config.fields.length})
          </label>
          <button type="button" onClick={() => setShowPicker(true)}
            className="flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-600">
            <Plus className="h-3 w-3" /> Add field
          </button>
        </div>

        {config.fields.length === 0 ? (
          <div className="rounded-xl border border-dashed border-navy-200 py-6 text-center">
            <p className="text-xs text-navy-400">No fields yet — click "Add field" to start.</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
            <SortableContext items={config.fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {config.fields.map((field, idx) => (
                  <SortableFieldRow key={field.id} field={field}
                    onChange={f => updateField(idx, f)} onDelete={() => deleteField(idx)}
                    onMoveUp={() => moveFieldUp(idx)} onMoveDown={() => moveFieldDown(idx)}
                    isFirst={idx === 0} isLast={idx === config.fields.length - 1} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
