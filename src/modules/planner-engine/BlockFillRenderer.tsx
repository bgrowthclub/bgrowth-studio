import { useState, useRef } from 'react';
import { type PlannerBlock, type BlockType } from './types';
import { cn } from '../../lib/utils';

// -----------------------------------------------------------------------
// The single implementation of "how each block type renders and edits" —
// extracted out of PlannerFill.tsx so Visual Mode and Guided Mode (and the
// PDF's PdfBlockContent below) share exactly one implementation per block
// type instead of two slowly-diverging copies. Pure move from the
// pre-existing PlannerFill.tsx — no behavior changes.
// -----------------------------------------------------------------------

// -----------------------------------------------------------------------
// Block fill progress calculator
// -----------------------------------------------------------------------
export function calcBlockProgress(block: any, data: any): { filled: number; total: number } {
  const cfg = block.config;
  if (!data) return { filled: 0, total: 1 };
  switch (cfg.type) {
    case 'checklist': {
      const total = cfg.items?.length ?? 0;
      const filled = Object.values(data.checked ?? {}).filter(Boolean).length;
      return { filled, total };
    }
    case 'goals': {
      const total = cfg.goals?.length ?? 0;
      const filled = cfg.goals?.filter((g: any) => data[g.id]?.text).length ?? 0;
      return { filled, total };
    }
    case 'notes': return { filled: data.text ? 1 : 0, total: 1 };
    case 'worksheet': {
      const total = cfg.questions?.length ?? 0;
      const filled = cfg.questions?.filter((q: any) => data[q.id]).length ?? 0;
      return { filled, total };
    }
    case 'milestones': {
      const total = cfg.milestones?.length ?? 0;
      const filled = cfg.milestones?.filter((m: any) => data[m.id]?.text).length ?? 0;
      return { filled, total };
    }
    case 'timeline': {
      const total = cfg.events?.length ?? 0;
      const filled = cfg.events?.filter((e: any) => data[e.id]?.text).length ?? 0;
      return { filled, total };
    }
    case 'form_fields': {
      const activeFields = cfg.fields?.filter((f: any) => f.type !== 'title' && f.type !== 'static_text') ?? [];
      const total = activeFields.length;
      const filled = activeFields.filter((f: any) => data[f.id]).length;
      return { filled, total };
    }
    case 'image': return { filled: data.image ? 1 : 0, total: 1 };
    case 'progress': return { filled: Object.keys(data.checked ?? {}).length > 0 ? 1 : 0, total: 1 };
    case 'calendar': return { filled: Object.keys(data.notes ?? {}).length > 0 ? 1 : 0, total: 1 };
    case 'resources': return { filled: 1, total: 1 };
    default: return { filled: 0, total: 1 };
  }
}

// -----------------------------------------------------------------------
// Interactive block renderers — each one owns editing UI for one block
// type. Same config/data shapes everywhere: goal.id/text/progress/
// deadline, item.id/label/checked, question.id/question, etc.
// -----------------------------------------------------------------------
function CalendarBlock({ data, onChange }: any) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
  const notes = data?.notes ?? {};
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); }} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-navy-50">←</button>
        <p className="text-sm font-bold text-navy-800">{monthName}</p>
        <button onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); }} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-navy-50">→</button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="text-center text-[10px] font-bold text-navy-400 py-1">{d}</div>)}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const key = `${currentYear}-${currentMonth}-${day}`;
          return (
            <div key={day} className="min-h-[52px] rounded-lg border border-navy-100 p-1 hover:border-brand">
              <p className={cn('text-[10px] font-bold mb-0.5', day === today.getDate() && currentMonth === today.getMonth() ? 'text-brand' : 'text-navy-500')}>{day}</p>
              <textarea rows={2} value={notes[key] ?? ''} placeholder="..." onChange={e => onChange({ notes: { ...notes, [key]: e.target.value } })} className="w-full resize-none bg-transparent text-[9px] text-navy-600 outline-none" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChecklistBlockFill({ config, data, onChange }: any) {
  const checked: Record<string, boolean> = data?.checked ?? {};
  const extraItems: string[] = data?.extraItems ?? [];
  return (
    <div className="flex flex-col gap-2">
      {config.items.map((item: any) => (
        <label key={item.id} className="flex cursor-pointer items-center gap-2.5">
          <button type="button" onClick={() => onChange({ ...data, checked: { ...checked, [item.id]: !checked[item.id] } })}
            className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors', checked[item.id] ? 'border-brand bg-brand text-white' : 'border-navy-300')}>
            {checked[item.id] && <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
          </button>
          <span className={cn('text-sm', checked[item.id] ? 'text-navy-400 line-through' : 'text-navy-800')}>{item.label}</span>
          {item.required && <span className="text-xs text-red-400">*</span>}
        </label>
      ))}
      {config.allowAddItems && (
        <div className="mt-2">
          {extraItems.map((item, idx) => (
            <label key={idx} className="flex items-center gap-2.5 mb-2">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-navy-300" />
              <span className="text-sm text-navy-800">{item}</span>
            </label>
          ))}
          <input placeholder="+ Add item" className="w-full text-sm text-brand-600 outline-none placeholder:text-brand-400"
            onKeyDown={e => { if (e.key === 'Enter') { onChange({ ...data, extraItems: [...extraItems, (e.target as HTMLInputElement).value] }); (e.target as HTMLInputElement).value = ''; } }} />
        </div>
      )}
    </div>
  );
}

function NotesBlockFill({ config, data, onChange }: any) {
  return (
    <textarea rows={8} value={data?.text ?? ''} placeholder={config.placeholder} maxLength={config.maxLength}
      onChange={e => onChange({ text: e.target.value })}
      className="w-full resize-none rounded-lg border border-navy-100 p-3 text-sm text-navy-800 focus:border-brand focus:outline-none leading-8"
      style={{ backgroundImage: config.lineRuled ? 'repeating-linear-gradient(to bottom, transparent, transparent 31px, #e2e8f0 31px, #e2e8f0 32px)' : undefined }} />
  );
}

function GoalsBlockFill({ config, data, onChange }: any) {
  return (
    <div className="flex flex-col gap-4">
      {config.goals.map((goal: any) => (
        <div key={goal.id} className="rounded-xl border border-navy-100 bg-navy-50 p-4">
          <p className="mb-2 text-sm font-semibold text-navy-800">{goal.label}</p>
          <textarea rows={2} value={data?.[goal.id]?.text ?? ''} placeholder={goal.placeholder}
            onChange={e => onChange({ ...data, [goal.id]: { ...data?.[goal.id], text: e.target.value } })}
            className="w-full resize-none rounded-lg border border-navy-100 bg-white p-2.5 text-sm text-navy-700 focus:border-brand focus:outline-none" />
          {config.showProgress && (
            <div className="mt-2">
              <div className="mb-1 flex justify-between text-xs text-navy-500">
                <span>Progress</span><span>{data?.[goal.id]?.progress ?? 0}%</span>
              </div>
              <input type="range" min={0} max={100} value={data?.[goal.id]?.progress ?? 0}
                onChange={e => onChange({ ...data, [goal.id]: { ...data?.[goal.id], progress: Number(e.target.value) } })}
                className="w-full accent-brand" />
            </div>
          )}
          {config.showDeadline && (
            <div className="mt-2">
              <label className="text-xs text-navy-500">Target Date</label>
              <input type="date" value={data?.[goal.id]?.deadline ?? ''}
                onChange={e => onChange({ ...data, [goal.id]: { ...data?.[goal.id], deadline: e.target.value } })}
                className="mt-1 w-full rounded border border-navy-100 px-2 py-1 text-xs text-navy-700 focus:outline-none" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ProgressBlockFill({ config, data, onChange }: any) {
  const days = Array.from({ length: Math.min(config.days, 31) }, (_, i) => i + 1);
  const checked: Record<string, boolean> = data?.checked ?? {};
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th className="py-1 pr-3 text-left text-navy-500 font-medium min-w-[120px]">Habit</th>
            {days.map(d => <th key={d} className="px-1 py-1 text-center text-navy-400 font-medium min-w-[28px]">{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {config.habits.map((habit: any) => (
            <tr key={habit.id} className="border-t border-navy-50">
              <td className="py-1.5 pr-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: habit.color }} />
                  <span className="text-navy-700 font-medium">{habit.label}</span>
                </div>
              </td>
              {days.map(d => {
                const key = `${habit.id}-${d}`;
                return (
                  <td key={d} className="px-1 py-1 text-center">
                    <button type="button" onClick={() => onChange({ ...data, checked: { ...checked, [key]: !checked[key] } })}
                      className={cn('h-5 w-5 rounded transition-colors mx-auto block', checked[key] ? 'opacity-100' : 'bg-navy-100 hover:bg-navy-200')}
                      style={checked[key] ? { background: habit.color } : {}}>
                      {checked[key] && <svg className="h-3 w-3 text-white mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WorksheetBlockFill({ config, data, onChange }: any) {
  return (
    <div className="flex flex-col gap-4">
      {config.questions.map((q: any) => (
        <div key={q.id}>
          <label className="mb-1.5 block text-sm font-semibold text-navy-700">{q.question}</label>
          {q.type === 'textarea' ? (
            <textarea rows={3} value={data?.[q.id] ?? ''} placeholder={q.placeholder}
              onChange={e => onChange({ ...data, [q.id]: e.target.value })}
              className="w-full resize-none rounded-lg border border-navy-100 p-2.5 text-sm text-navy-700 focus:border-brand focus:outline-none" />
          ) : (
            <input type={q.type} value={data?.[q.id] ?? ''} placeholder={q.placeholder}
              onChange={e => onChange({ ...data, [q.id]: e.target.value })}
              className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm text-navy-700 focus:border-brand focus:outline-none" />
          )}
        </div>
      ))}
    </div>
  );
}

function MilestonesBlockFill({ config, data, onChange }: any) {
  return (
    <div className="flex flex-col gap-3">
      {config.milestones.map((m: any, idx: number) => (
        <div key={m.id} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold', data?.[m.id]?.status === 'done' ? 'bg-emerald-500' : 'bg-brand')}>{idx + 1}</div>
            {idx < config.milestones.length - 1 && <div className="w-0.5 flex-1 bg-navy-200 my-1 min-h-[20px]" />}
          </div>
          <div className="flex-1 pb-4">
            <p className="text-sm font-semibold text-navy-800 mb-1">{m.label}</p>
            <textarea rows={2} value={data?.[m.id]?.text ?? ''} placeholder={m.placeholder}
              onChange={e => onChange({ ...data, [m.id]: { ...data?.[m.id], text: e.target.value } })}
              className="w-full resize-none rounded-lg border border-navy-100 p-2.5 text-sm text-navy-700 focus:border-brand focus:outline-none" />
            <div className="mt-2 flex items-center gap-3">
              {config.showDate && <input type="date" value={data?.[m.id]?.date ?? ''} onChange={e => onChange({ ...data, [m.id]: { ...data?.[m.id], date: e.target.value } })} className="rounded border border-navy-100 px-2 py-1 text-xs text-navy-700 focus:outline-none" />}
              {config.showStatus && (
                <select value={data?.[m.id]?.status ?? 'pending'} onChange={e => onChange({ ...data, [m.id]: { ...data?.[m.id], status: e.target.value } })} className="rounded border border-navy-100 px-2 py-1 text-xs text-navy-700 focus:outline-none">
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done ✓</option>
                </select>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineBlockFill({ config, data, onChange }: any) {
  return (
    <div className="flex flex-col gap-4">
      {config.events.map((event: any, idx: number) => (
        <div key={event.id} className="flex items-start gap-4">
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white text-xs font-bold">{idx + 1}</div>
            {idx < config.events.length - 1 && <div className="w-0.5 bg-navy-200 flex-1 min-h-[30px] mt-1" />}
          </div>
          <div className="flex-1 pb-4">
            <p className="text-sm font-semibold text-navy-800 mb-1">{event.label}</p>
            <textarea rows={2} value={data?.[event.id]?.text ?? ''} placeholder={event.placeholder}
              onChange={e => onChange({ ...data, [event.id]: { ...data?.[event.id], text: e.target.value } })}
              className="w-full resize-none rounded-lg border border-navy-100 p-2.5 text-sm text-navy-700 focus:border-brand focus:outline-none" />
            <input type="date" value={data?.[event.id]?.date ?? ''} onChange={e => onChange({ ...data, [event.id]: { ...data?.[event.id], date: e.target.value } })} className="mt-1 rounded border border-navy-100 px-2 py-1 text-xs text-navy-700 focus:outline-none" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ImageBlockFill({ config, data, onChange }: any) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-3">
      {/* Pre-configured image from builder */}
      {config.preImage && !data?.image && (
        <div className="rounded-xl overflow-hidden">
          <img src={config.preImage} alt="Pre-configured" className="w-full object-cover max-h-64 rounded-xl" />
          {config.preCaption && <p className="mt-2 text-xs text-navy-500 italic text-center">{config.preCaption}</p>}
        </div>
      )}

      {/* User uploaded image */}
      {data?.image ? (
        <div className="relative">
          <img src={data.image} alt="Uploaded" className="w-full rounded-xl object-cover max-h-64" />
          <button type="button" onClick={() => onChange({ ...data, image: null })}
            className="absolute right-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">Remove</button>
        </div>
      ) : (
        <div onClick={() => fileRef.current?.click()}
          className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-navy-200 bg-navy-50 hover:bg-navy-100">
          <span className="text-3xl">📷</span>
          <p className="text-sm text-navy-400">{config.prompt || 'Click to upload your image'}</p>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = ev => onChange({ ...data, image: ev.target?.result });
          reader.readAsDataURL(file);
        }} />

      {/* Caption field */}
      <div>
        <label className="mb-1 block text-xs font-medium text-navy-500">Caption / Description</label>
        <input value={data?.caption ?? ''} placeholder="Add a caption or description..."
          onChange={e => onChange({ ...data, caption: e.target.value })}
          className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm text-navy-700 focus:border-brand focus:outline-none" />
      </div>
    </div>
  );
}

function ResourcesBlockFill({ config, data, onChange }: any) {
  const extraResources: { label: string; url: string }[] = data?.extra ?? [];
  return (
    <div className="flex flex-col gap-2">
      {(config.resources ?? []).map((r: any) => (
        <div key={r.id} className="flex items-center gap-2 rounded-lg border border-navy-100 px-3 py-2">
          <span className="text-base">📎</span>
          <span className="flex-1 text-sm font-medium text-navy-700">{r.label}</span>
          {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline">Open →</a>}
        </div>
      ))}
      {extraResources.map((r, idx) => (
        <div key={idx} className="flex items-center gap-2 rounded-lg border border-navy-100 px-3 py-2">
          <span className="text-base">📎</span>
          <span className="flex-1 text-sm text-navy-700">{r.label}</span>
          {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline">Open →</a>}
        </div>
      ))}
      {config.allowAddItems && (
        <div className="rounded-lg border border-dashed border-navy-200 p-3">
          <p className="mb-2 text-xs font-medium text-navy-500">Add Resource</p>
          <div className="flex gap-2">
            <input id="res-label" placeholder="Label" className="flex-1 rounded border border-navy-100 px-2 py-1 text-xs focus:outline-none" />
            <input id="res-url" placeholder="URL" className="flex-1 rounded border border-navy-100 px-2 py-1 text-xs focus:outline-none" />
            <button type="button" onClick={() => {
              const label = (document.getElementById('res-label') as HTMLInputElement).value;
              const url = (document.getElementById('res-url') as HTMLInputElement).value;
              if (label) { onChange({ ...data, extra: [...extraResources, { label, url }] }); }
            }} className="rounded bg-brand px-2 py-1 text-xs font-semibold text-white">Add</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FormFieldsBlockFill({ config, data, onChange }: any) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {(config.fields ?? []).map((field: any) => {
        if (field.type === 'title') {
          return (
            <div key={field.id} className="sm:col-span-2 mt-4 first:mt-0 pb-1 border-b border-navy-100">
              <h3 className="text-base font-bold text-navy-800 tracking-tight">
                {field.label || 'Heading'}
              </h3>
            </div>
          );
        }

        if (field.type === 'static_text') {
          return (
            <div key={field.id} className="sm:col-span-2 text-sm text-navy-600 whitespace-pre-wrap leading-relaxed bg-navy-50/50 p-3.5 rounded-xl border border-navy-100/70">
              <p className="text-navy-600 font-normal">{field.label || 'Paragraph text...'}</p>
            </div>
          );
        }

        const isFullWidth = field.type === 'textarea';

        return (
          <div key={field.id} className={isFullWidth ? 'sm:col-span-2' : ''}>
            <label className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-navy-700">
              {field.label}
              {field.required && <span className="text-red-500">*</span>}
            </label>
            {field.type === 'textarea' ? (
              <textarea rows={3} value={data?.[field.id] ?? ''} placeholder={field.placeholder}
                onChange={e => onChange({ ...data, [field.id]: e.target.value })}
                className="w-full resize-none rounded-lg border border-navy-100 p-2.5 text-sm text-navy-700 focus:border-brand focus:outline-none" />
            ) : field.type === 'select' ? (
              <select value={data?.[field.id] ?? ''} onChange={e => onChange({ ...data, [field.id]: e.target.value })}
                className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm text-navy-700 focus:border-brand focus:outline-none">
                <option value="">Select...</option>
                {(field.options ?? []).map((opt: string) => <option key={opt}>{opt}</option>)}
              </select>
            ) : field.type === 'checkbox' ? (
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-navy-100 px-3 py-2 text-sm text-navy-700 hover:bg-navy-50/50">
                <input type="checkbox" checked={!!data?.[field.id]} onChange={e => onChange({ ...data, [field.id]: e.target.checked })}
                  className="h-4 w-4 rounded border-navy-300 text-brand focus:ring-brand accent-brand" />
                <span>{field.placeholder || 'Check this box'}</span>
              </label>
            ) : (
              <input type={field.type} value={data?.[field.id] ?? ''} placeholder={field.placeholder}
                onChange={e => onChange({ ...data, [field.id]: e.target.value })}
                className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm text-navy-700 focus:border-brand focus:outline-none" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function BlockRenderer({ block, data, onChange }: { block: any; data: any; onChange: (d: any) => void }) {
  const props = { config: block.config, data, onChange };
  switch (block.config.type as BlockType | 'form_fields') {
    case 'calendar': return <CalendarBlock {...props} />;
    case 'checklist': return <ChecklistBlockFill {...props} />;
    case 'notes': return <NotesBlockFill {...props} />;
    case 'goals': return <GoalsBlockFill {...props} />;
    case 'progress': return <ProgressBlockFill {...props} />;
    case 'worksheet': return <WorksheetBlockFill {...props} />;
    case 'milestones': return <MilestonesBlockFill {...props} />;
    case 'timeline': return <TimelineBlockFill {...props} />;
    case 'image': return <ImageBlockFill {...props} />;
    case 'resources': return <ResourcesBlockFill {...props} />;
    case 'form_fields': return <FormFieldsBlockFill {...props} />;
    default: return <p className="text-sm text-navy-400">Block type not supported</p>;
  }
}

// -----------------------------------------------------------------------
// PDF / printable block content — human-readable per block type, reusing
// exactly the same config/data shapes the interactive *BlockFill
// components above already read (goal.id/text/progress/deadline,
// item.id/label/checked, question.id/question, etc.) — never a second,
// parallel data model. Inline styles throughout (html2canvas rasterizes
// this hidden node — plain inline styles render reliably there).
// -----------------------------------------------------------------------
const pdfLabelStyle = { fontSize: '12px', fontWeight: 700, color: '#334155', margin: '0 0 2px' };
const pdfValueStyle = { fontSize: '12px', color: '#475569', whiteSpace: 'pre-wrap' as const, margin: 0 };
const pdfEmptyStyle = { fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' as const, margin: 0 };
const pdfRowStyle = { marginBottom: '10px' };

function PdfEmpty({ text = 'No response provided' }: { text?: string }) {
  return <p style={pdfEmptyStyle}>{text}</p>;
}

function formatPdfDate(value?: string): string {
  if (!value) return '';
  const d = new Date(`${value}T00:00:00`);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function PdfBlockContent({ block, data }: { block: PlannerBlock; data: any }) {
  const cfg: any = block.config;
  const d = data ?? {};

  switch (cfg.type) {
    case 'checklist': {
      const checked: Record<string, boolean> = d.checked ?? {};
      const extraItems: string[] = d.extraItems ?? [];
      const items = cfg.items ?? [];
      if (items.length === 0 && extraItems.length === 0) return <PdfEmpty text="No checklist items" />;
      return (
        <div>
          {items.map((item: any) => (
            <p key={item.id} style={{ ...pdfValueStyle, marginBottom: '4px' }}>
              {checked[item.id] ? '☑' : '☐'} {item.label}{item.required ? ' *' : ''}
            </p>
          ))}
          {extraItems.map((label, idx) => (
            <p key={idx} style={{ ...pdfValueStyle, marginBottom: '4px' }}>☐ {label}</p>
          ))}
        </div>
      );
    }

    case 'goals': {
      const goals = cfg.goals ?? [];
      if (goals.length === 0) return <PdfEmpty text="No goals defined" />;
      return (
        <div>
          {goals.map((goal: any) => {
            const gd = d[goal.id] ?? {};
            return (
              <div key={goal.id} style={pdfRowStyle}>
                <p style={pdfLabelStyle}>{goal.label}</p>
                {gd.text ? <p style={pdfValueStyle}>{gd.text}</p> : <PdfEmpty />}
                {(cfg.showProgress || cfg.showDeadline) && (
                  <p style={{ ...pdfValueStyle, marginTop: '2px', color: '#94a3b8' }}>
                    {cfg.showProgress ? `Progress: ${gd.progress ?? 0}%` : ''}
                    {cfg.showProgress && cfg.showDeadline && gd.deadline ? '  ·  ' : ''}
                    {cfg.showDeadline && gd.deadline ? `Target date: ${formatPdfDate(gd.deadline)}` : ''}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    case 'notes':
      return d.text ? <p style={pdfValueStyle}>{d.text}</p> : <PdfEmpty text="No notes added" />;

    case 'worksheet': {
      const questions = cfg.questions ?? [];
      if (questions.length === 0) return <PdfEmpty text="No questions defined" />;
      return (
        <div>
          {questions.map((q: any) => (
            <div key={q.id} style={pdfRowStyle}>
              <p style={pdfLabelStyle}>{q.question}</p>
              {d[q.id] ? <p style={pdfValueStyle}>{d[q.id]}</p> : <PdfEmpty />}
            </div>
          ))}
        </div>
      );
    }

    case 'milestones': {
      const milestones = cfg.milestones ?? [];
      if (milestones.length === 0) return <PdfEmpty text="No milestones defined" />;
      const statusLabel: Record<string, string> = { pending: 'Pending', 'in-progress': 'In Progress', done: 'Done' };
      return (
        <div>
          {milestones.map((m: any, idx: number) => {
            const md = d[m.id] ?? {};
            return (
              <div key={m.id} style={pdfRowStyle}>
                <p style={pdfLabelStyle}>{idx + 1}. {m.label}</p>
                {md.text ? <p style={pdfValueStyle}>{md.text}</p> : <PdfEmpty />}
                {(cfg.showDate || cfg.showStatus) && (
                  <p style={{ ...pdfValueStyle, marginTop: '2px', color: '#94a3b8' }}>
                    {cfg.showDate && md.date ? `Date: ${formatPdfDate(md.date)}` : ''}
                    {cfg.showDate && md.date && cfg.showStatus ? '  ·  ' : ''}
                    {cfg.showStatus ? `Status: ${statusLabel[md.status ?? 'pending']}` : ''}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    case 'timeline': {
      const events = cfg.events ?? [];
      if (events.length === 0) return <PdfEmpty text="No timeline events defined" />;
      return (
        <div>
          {events.map((event: any, idx: number) => {
            const ed = d[event.id] ?? {};
            return (
              <div key={event.id} style={pdfRowStyle}>
                <p style={pdfLabelStyle}>{idx + 1}. {event.label}{ed.date ? ` — ${formatPdfDate(ed.date)}` : ''}</p>
                {ed.text ? <p style={pdfValueStyle}>{ed.text}</p> : <PdfEmpty />}
              </div>
            );
          })}
        </div>
      );
    }

    case 'image': {
      const src = d.image || cfg.preImage;
      const caption = d.caption || cfg.preCaption;
      if (!src) return <PdfEmpty text="No image uploaded" />;
      return (
        <div>
          <img src={src} alt="" style={{ maxWidth: '100%', maxHeight: '260px', borderRadius: '8px', display: 'block' }} />
          {caption && <p style={{ ...pdfValueStyle, marginTop: '6px', fontStyle: 'italic' }}>{caption}</p>}
        </div>
      );
    }

    case 'resources': {
      const all = [...(cfg.resources ?? []), ...(d.extra ?? [])];
      if (all.length === 0) return <PdfEmpty text="No resources added" />;
      return (
        <div>
          {all.map((r: any, idx: number) => (
            <p key={r.id ?? idx} style={{ ...pdfValueStyle, marginBottom: '4px' }}>
              📎 {r.label}{r.url ? ` — ${r.url}` : ''}
            </p>
          ))}
        </div>
      );
    }

    case 'form_fields': {
      const fields = (cfg.fields ?? []).filter((f: any) => f.type !== 'title' && f.type !== 'static_text');
      if (fields.length === 0) return <PdfEmpty text="No fields defined" />;
      return (
        <div>
          {fields.map((field: any) => (
            <div key={field.id} style={pdfRowStyle}>
              <p style={pdfLabelStyle}>{field.label}{field.required ? ' *' : ''}</p>
              {field.type === 'checkbox'
                ? <p style={pdfValueStyle}>{d[field.id] ? 'Yes' : 'No'}</p>
                : d[field.id] ? <p style={pdfValueStyle}>{String(d[field.id])}</p> : <PdfEmpty />}
            </div>
          ))}
        </div>
      );
    }

    case 'progress': {
      const habits = cfg.habits ?? [];
      const checked: Record<string, boolean> = d.checked ?? {};
      if (habits.length === 0) return <PdfEmpty text="No habits defined" />;
      const days = Math.min(cfg.days ?? 30, 31);
      return (
        <div>
          {habits.map((habit: any) => {
            const doneDays = Array.from({ length: days }, (_, i) => i + 1).filter(day => checked[`${habit.id}-${day}`]);
            return (
              <p key={habit.id} style={{ ...pdfValueStyle, marginBottom: '4px' }}>
                {habit.label}: {doneDays.length > 0 ? `${doneDays.length} of ${days} days completed` : 'No days marked'}
              </p>
            );
          })}
        </div>
      );
    }

    case 'calendar': {
      const notes: Record<string, string> = d.notes ?? {};
      const entries = Object.entries(notes).filter(([, v]) => v);
      if (entries.length === 0) return <PdfEmpty text="No calendar notes added" />;
      return (
        <div>
          {entries.map(([key, text]) => {
            const [year, month, day] = key.split('-').map(Number);
            const label = new Date(year, month, day).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
            return (
              <p key={key} style={{ ...pdfValueStyle, marginBottom: '4px' }}>
                <strong>{label}:</strong> {text}
              </p>
            );
          })}
        </div>
      );
    }

    default:
      return <PdfEmpty text="No data" />;
  }
}
