import { safeHtml } from '../../lib/safeContent';
import { Trash2, Copy } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { SortableRow } from './SortableRow';
import { IconPicker } from './IconPicker';
import { FIELD_TYPE_LABELS } from './builderTypes';
import type { DraftField } from './builderTypes';
import type { FieldType } from '../../engine/types';

interface FieldEditorProps {
  field: DraftField;
  onChange: (updated: DraftField) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}

const FIELD_TYPES = Object.entries(FIELD_TYPE_LABELS) as [FieldType, string][];

export function FieldEditor({ field, onChange, onDelete, onDuplicate }: FieldEditorProps) {
  const set = <K extends keyof DraftField>(key: K, val: DraftField[K]) =>
    onChange({ ...field, [key]: val });

  const isStatic = field.type === 'title' || field.type === 'static_text';

  return (
    <SortableRow id={field._key} className="p-0">
      <div className="flex flex-col gap-3">
        {/* Row 1: label + type + required toggle */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">
              {field.type === 'title' ? 'Heading Text' : field.type === 'static_text' ? 'Paragraph Text' : 'Field Label'}
            </label>
            {field.type === 'static_text' ? (
              <div className="flex flex-col gap-1">
                <div className="flex gap-1">
                  {[
                    { title: 'Bold', syntax: ['<b>', '</b>'], icon: '𝐁' },
                    { title: 'Italic', syntax: ['<i>', '</i>'], icon: '𝘐' },
                    { title: 'Link', syntax: ['<a href="URL">', '</a>'], icon: '🔗' },
                  ].map((btn) => (
                    <button key={btn.title} type="button" title={btn.title}
                      onClick={() => {
                        const ta = document.activeElement as HTMLTextAreaElement;
                        const start = ta?.selectionStart ?? field.label.length;
                        const end = ta?.selectionEnd ?? field.label.length;
                        const selected = field.label.slice(start, end);
                        const newVal = field.label.slice(0, start) + btn.syntax[0] + selected + btn.syntax[1] + field.label.slice(end);
                        set('label', newVal);
                      }}
                      className="flex h-7 items-center justify-center rounded border border-navy-100 bg-white px-2 text-xs text-navy-500 hover:bg-navy-50 hover:text-navy-800">
                      {btn.icon}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  className="w-full resize-y rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm text-navy-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  value={field.label}
                  placeholder="Enter information or paragraph text... Use toolbar for formatting."
                  onChange={(e) => set('label', e.target.value)}
                />
                {field.label && (
                  <div className="rounded-lg border border-navy-100 bg-navy-50 px-3 py-2 text-sm text-navy-600"
                    dangerouslySetInnerHTML={{ __html: safeHtml(field.label) }} />
                )}
              </div>
            ) : (
              <Input
                value={field.label}
                placeholder={field.type === 'title' ? 'Enter heading title...' : 'e.g. Client Name'}
                onChange={(e) => set('label', e.target.value)}
              />
            )}
          </div>
          <div className="w-full sm:w-32">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">
              Type
            </label>
            <Select
              value={field.type}
              onChange={(e) => set('type', e.target.value as FieldType)}
            >
              {FIELD_TYPES.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2 pb-1">
            {!isStatic && (
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-navy-600">
                <input
                  type="checkbox"
                  checked={!!field.required}
                  onChange={(e) => set('required', e.target.checked)}
                  className="h-4 w-4 rounded accent-brand"
                />
                Required
              </label>
            )}
            {onDuplicate && (
              <button
                type="button"
                onClick={onDuplicate}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-300 hover:bg-brand-50 hover:text-brand"
                aria-label="Duplicate field"
                title="Duplicate field"
              >
                <Copy className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-navy-300 hover:bg-red-50 hover:text-red-500"
              aria-label="Delete field"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

     {/* Row 2: link URL (only for link type) */}
        {field.type === 'link' && (
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">
              URL
            </label>
            <Input
              value={field.placeholder ?? ''}
              placeholder="https://..."
              onChange={(e) => set('placeholder', e.target.value)}
            />
          </div>
        )}

        {/* Row 2: placeholder */}
        {!isStatic && (
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">
              Placeholder (optional)
            </label>
            <Input
              value={field.placeholder ?? ''}
              placeholder="e.g. John Smith"
              onChange={(e) => set('placeholder', e.target.value)}
            />
          </div>
        )}

        {/* Row 3: dropdown options (only for select type) */}
        {field.type === 'select' && (
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">
              Options (one per line)
            </label>
            <textarea
              rows={3}
              className="w-full resize-y rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm text-navy-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              placeholder={"Option A\nOption B\nOption C"}
              value={(field.options ?? []).join('\n')}
              onChange={(e) =>
                set('options', (() => {
                const raw = e.target.value.split('\n').map((s) => s.trim()).filter(Boolean);
                return [...new Set(raw)]; // remove duplicatas mantendo ordem
              })())
              }
            />
            {(field.options ?? []).length !== new Set(field.options ?? []).size && (
              <p className="mt-1 text-[10px] text-amber-500 font-semibold">⚠ Duplicate options removed automatically.</p>
            )}
          </div>
        )}

      {/* Image upload/URL */}
        {field.type === 'image' && (
          <div className="flex flex-col gap-2">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Image</label>
            {field.placeholder && field.placeholder.startsWith('data:') ? (
              <div className="relative">
                <img src={field.placeholder} alt={field.label} className="h-32 w-full rounded-lg object-cover border border-navy-100" />
                <button type="button" onClick={() => set('placeholder', '')}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs shadow">✕</button>
              </div>
            ) : (
              <div>
                <input type="file" accept="image/*" className="hidden" id={`img-upload-${field._key}`}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => set('placeholder', reader.result as string);
                    reader.readAsDataURL(file);
                  }} />
                <label htmlFor={`img-upload-${field._key}`}
                  className="flex h-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-navy-200 bg-navy-50 hover:bg-navy-100 text-xs text-navy-400 gap-1.5">
                  📷 Upload image
                </label>
                <Input className="mt-2" value={field.placeholder?.startsWith('data:') ? '' : (field.placeholder ?? '')}
                  placeholder="Or paste image URL..."
                  onChange={(e) => set('placeholder', e.target.value)} />
              </div>
            )}
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Caption (optional)</label>
            <Input value={field.label} placeholder="Image caption..." onChange={(e) => set('label', e.target.value)} />
          </div>
        )}

        {/* File upload/URL */}
        {field.type === 'file' && (
          <div className="flex flex-col gap-2">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">File</label>
            <input type="file" className="hidden" id={`file-upload-${field._key}`}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  set('placeholder', reader.result as string);
                  if (!field.label) set('label', file.name);
                };
                reader.readAsDataURL(file);
              }} />
            <label htmlFor={`file-upload-${field._key}`}
              className="flex h-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-navy-200 bg-navy-50 hover:bg-navy-100 text-xs text-navy-400 gap-1.5">
              📎 Upload file
            </label>
            {field.placeholder && !field.placeholder.startsWith('data:') && (
              <Input value={field.placeholder} placeholder="Or paste file URL..."
                onChange={(e) => set('placeholder', e.target.value)} />
            )}
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Label</label>
            <Input value={field.label} placeholder="e.g. Download Contract Template"
              onChange={(e) => set('label', e.target.value)} />
            {field.placeholder && (
              <div className="flex items-center gap-1.5 rounded-lg border border-navy-100 bg-navy-50 px-3 py-2 text-xs text-navy-600">
                📎 {field.label || 'File'} — <button type="button" onClick={() => set('placeholder', '')} className="text-red-400 hover:text-red-600">Remove</button>
              </div>
            )}
          </div>
        )}

        {/* Row 4: icon picker — oculto para title e static_text */}
        {field.type !== 'title' && field.type !== 'static_text' && (          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">
              Field Icon
            </label>
            <IconPicker value={field.icon} onChange={(v) => set('icon', v)} />
          </div>
        )}
      </div>
    </SortableRow>
  );
}
