import { X } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { FormFieldsBlockEditor, type FormFieldsConfig } from './FormFieldsBlockEditor';
import { type PlannerBlock, newId } from './types';

// ─── Block Editor Panel ───────────────────────────────────────────
// Per-block-type editor switch, moved verbatim out of PlannerBuilder.tsx.
// Used identically by both the List and Canvas structure views — the
// block editing surface (Col 3) never changes based on how the parent
// section is positioned.
export function BlockEditorPanel({
  block,
  onUpdate,
  onClose,
}: {
  block: PlannerBlock;
  onUpdate: (partial: Partial<PlannerBlock>) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-navy-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{block.icon}</span>
          <p className="text-sm font-bold text-navy-800">Edit Block</p>
        </div>
        <button type="button" onClick={onClose} className="text-navy-400 hover:text-navy-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Title</label>
            <Input value={block.title} onChange={e => onUpdate({ title: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Description</label>
            <Input value={block.description} onChange={e => onUpdate({ description: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Icon</label>
            <Input value={block.icon} maxLength={4} onChange={e => onUpdate({ icon: e.target.value })} />
          </div>

          {/* Checklist items */}
          {block.config.type === 'checklist' && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Items</label>
              {(block.config as any).items.map((item: any, idx: number) => (
                <div key={item.id} className="flex items-center gap-1.5 mb-1.5">
                  <Input value={item.label} onChange={e => {
                    const items = [...(block.config as any).items];
                    items[idx] = { ...item, label: e.target.value };
                    onUpdate({ config: { ...block.config, items } as any });
                  }} />
                  <button type="button" onClick={() => {
                    const items = (block.config as any).items.filter((_: any, i: number) => i !== idx);
                    onUpdate({ config: { ...block.config, items } as any });
                  }} className="text-navy-300 hover:text-red-500 shrink-0"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              <button type="button" onClick={() => {
                const items = [...(block.config as any).items, { id: newId(), label: 'New item', required: false }];
                onUpdate({ config: { ...block.config, items } as any });
              }} className="text-[11px] font-semibold text-brand hover:underline">+ Add item</button>
            </div>
          )}

          {/* Goals */}
          {block.config.type === 'goals' && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Goals</label>
              {(block.config as any).goals.map((goal: any, idx: number) => (
                <div key={goal.id} className="flex items-center gap-1.5 mb-1.5">
                  <Input value={goal.label} onChange={e => {
                    const goals = [...(block.config as any).goals];
                    goals[idx] = { ...goal, label: e.target.value };
                    onUpdate({ config: { ...block.config, goals } as any });
                  }} />
                  <button type="button" onClick={() => {
                    const goals = (block.config as any).goals.filter((_: any, i: number) => i !== idx);
                    onUpdate({ config: { ...block.config, goals } as any });
                  }} className="text-navy-300 hover:text-red-500 shrink-0"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              <button type="button" onClick={() => {
                const goals = [...(block.config as any).goals, { id: newId(), label: 'New Goal', placeholder: '' }];
                onUpdate({ config: { ...block.config, goals } as any });
              }} className="text-[11px] font-semibold text-brand hover:underline">+ Add goal</button>
            </div>
          )}

          {/* Notes */}
          {block.config.type === 'notes' && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Placeholder</label>
              <Input value={(block.config as any).placeholder}
                onChange={e => onUpdate({ config: { ...block.config, placeholder: e.target.value } as any })} />
            </div>
          )}

          {/* Progress */}
          {block.config.type === 'progress' && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Habits</label>
              {(block.config as any).habits.map((habit: any, idx: number) => (
                <div key={habit.id} className="flex items-center gap-1.5 mb-1.5">
                  <Input value={habit.label} onChange={e => {
                    const habits = [...(block.config as any).habits];
                    habits[idx] = { ...habit, label: e.target.value };
                    onUpdate({ config: { ...block.config, habits } as any });
                  }} />
                  <button type="button" onClick={() => {
                    const habits = (block.config as any).habits.filter((_: any, i: number) => i !== idx);
                    onUpdate({ config: { ...block.config, habits } as any });
                  }} className="text-navy-300 hover:text-red-500 shrink-0"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              <button type="button" onClick={() => {
                const habits = [...(block.config as any).habits, { id: newId(), label: 'New Habit', color: '#1061EC' }];
                onUpdate({ config: { ...block.config, habits } as any });
              }} className="text-[11px] font-semibold text-brand hover:underline">+ Add habit</button>
            </div>
          )}

          {/* Resources */}
          {block.config.type === 'resources' && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Resources</label>
              {(block.config as any).resources.map((res: any, idx: number) => (
                <div key={res.id} className="mb-2 rounded-lg border border-navy-100 bg-navy-50 p-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Input value={res.label} placeholder="Label" onChange={e => {
                      const resources = [...(block.config as any).resources];
                      resources[idx] = { ...res, label: e.target.value };
                      onUpdate({ config: { ...block.config, resources } as any });
                    }} />
                    <button type="button" onClick={() => {
                      const resources = (block.config as any).resources.filter((_: any, i: number) => i !== idx);
                      onUpdate({ config: { ...block.config, resources } as any });
                    }} className="text-navy-300 hover:text-red-500 shrink-0"><X className="h-3.5 w-3.5" /></button>
                  </div>
                  <Input value={res.url ?? ''} placeholder="https://..." onChange={e => {
                    const resources = [...(block.config as any).resources];
                    resources[idx] = { ...res, url: e.target.value };
                    onUpdate({ config: { ...block.config, resources } as any });
                  }} />
                </div>
              ))}
              <button type="button" onClick={() => {
                const resources = [...(block.config as any).resources, { id: newId(), label: 'New Resource', url: '' }];
                onUpdate({ config: { ...block.config, resources } as any });
              }} className="text-[11px] font-semibold text-brand hover:underline">+ Add resource</button>
            </div>
          )}

          {/* Milestones */}
          {block.config.type === 'milestones' && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Milestones</label>
              {(block.config as any).milestones.map((m: any, idx: number) => (
                <div key={m.id} className="flex items-center gap-1.5 mb-1.5">
                  <Input value={m.label} onChange={e => {
                    const milestones = [...(block.config as any).milestones];
                    milestones[idx] = { ...m, label: e.target.value };
                    onUpdate({ config: { ...block.config, milestones } as any });
                  }} />
                  <button type="button" onClick={() => {
                    const milestones = (block.config as any).milestones.filter((_: any, i: number) => i !== idx);
                    onUpdate({ config: { ...block.config, milestones } as any });
                  }} className="text-navy-300 hover:text-red-500 shrink-0"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              <button type="button" onClick={() => {
                const milestones = [...(block.config as any).milestones, { id: newId(), label: 'New Milestone', placeholder: '' }];
                onUpdate({ config: { ...block.config, milestones } as any });
              }} className="text-[11px] font-semibold text-brand hover:underline">+ Add milestone</button>
            </div>
          )}

          {/* Timeline */}
          {block.config.type === 'timeline' && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Events</label>
              {(block.config as any).events.map((ev: any, idx: number) => (
                <div key={ev.id} className="flex items-center gap-1.5 mb-1.5">
                  <Input value={ev.label} onChange={e => {
                    const events = [...(block.config as any).events];
                    events[idx] = { ...ev, label: e.target.value };
                    onUpdate({ config: { ...block.config, events } as any });
                  }} />
                  <button type="button" onClick={() => {
                    const events = (block.config as any).events.filter((_: any, i: number) => i !== idx);
                    onUpdate({ config: { ...block.config, events } as any });
                  }} className="text-navy-300 hover:text-red-500 shrink-0"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              <button type="button" onClick={() => {
                const events = [...(block.config as any).events, { id: newId(), label: 'New Event', placeholder: '' }];
                onUpdate({ config: { ...block.config, events } as any });
              }} className="text-[11px] font-semibold text-brand hover:underline">+ Add event</button>
            </div>
          )}

          {/* Worksheet */}
          {block.config.type === 'worksheet' && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Questions</label>
              {(block.config as any).questions.map((q: any, idx: number) => (
                <div key={q.id} className="flex items-center gap-1.5 mb-1.5">
                  <Input value={q.question} onChange={e => {
                    const questions = [...(block.config as any).questions];
                    questions[idx] = { ...q, question: e.target.value };
                    onUpdate({ config: { ...block.config, questions } as any });
                  }} />
                  <button type="button" onClick={() => {
                    const questions = (block.config as any).questions.filter((_: any, i: number) => i !== idx);
                    onUpdate({ config: { ...block.config, questions } as any });
                  }} className="text-navy-300 hover:text-red-500 shrink-0"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              <button type="button" onClick={() => {
                const questions = [...(block.config as any).questions, { id: newId(), question: 'New Question', type: 'textarea', placeholder: '' }];
                onUpdate({ config: { ...block.config, questions } as any });
              }} className="text-[11px] font-semibold text-brand hover:underline">+ Add question</button>
            </div>
          )}

         {/* Image */}
          {block.config.type === 'image' && (
            <div className="flex flex-col gap-2">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Image</label>
              {(block.config as any).imageData ? (
                <div className="relative">
                  <img src={(block.config as any).imageData} alt="block" className="h-32 w-full rounded-lg object-cover border border-navy-100" />
                  <button type="button" onClick={() => onUpdate({ config: { ...block.config, imageData: null } as any })}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs shadow">✕</button>
                </div>
              ) : (
                <div>
                  <input type="file" accept="image/*" className="hidden" id={`img-${block.id}`}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => onUpdate({ config: { ...block.config, imageData: reader.result } as any });
                      reader.readAsDataURL(file);
                    }} />
                  <label htmlFor={`img-${block.id}`}
                    className="flex h-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-navy-200 bg-navy-50 hover:bg-navy-100 text-xs text-navy-400 gap-1.5">
                    📷 Upload image
                  </label>
                  <Input className="mt-2" value={(block.config as any).imageUrl ?? ''} placeholder="Or paste image URL..."
                    onChange={e => onUpdate({ config: { ...block.config, imageUrl: e.target.value } as any })} />
                </div>
              )}
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Caption</label>
              <Input value={(block.config as any).preCaption ?? ''} placeholder="Image caption..."
                onChange={e => onUpdate({ config: { ...block.config, preCaption: e.target.value } as any })} />
            </div>
          )}

          {/* File */}
          {block.config.type === 'resources' && (
            <div className="flex flex-col gap-2">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Upload File</label>
              <input type="file" className="hidden" id={`file-${block.id}`}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const resources = [...((block.config as any).resources ?? []), {
                      id: newId(), label: file.name, url: reader.result as string, fileData: true
                    }];
                    onUpdate({ config: { ...block.config, resources } as any });
                  };
                  reader.readAsDataURL(file);
                }} />
              <label htmlFor={`file-${block.id}`}
                className="flex h-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-navy-200 bg-navy-50 hover:bg-navy-100 text-xs text-navy-400 gap-1.5">
                📎 Upload file
              </label>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Resources</label>
              {(block.config as any).resources.map((res: any, idx: number) => (
                <div key={res.id} className="mb-2 rounded-lg border border-navy-100 bg-navy-50 p-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Input value={res.label} placeholder="Label" onChange={e => {
                      const resources = [...(block.config as any).resources];
                      resources[idx] = { ...res, label: e.target.value };
                      onUpdate({ config: { ...block.config, resources } as any });
                    }} />
                    <button type="button" onClick={() => {
                      const resources = (block.config as any).resources.filter((_: any, i: number) => i !== idx);
                      onUpdate({ config: { ...block.config, resources } as any });
                    }} className="text-navy-300 hover:text-red-500 shrink-0"><X className="h-3.5 w-3.5" /></button>
                  </div>
                  {!res.fileData && (
                    <Input value={res.url ?? ''} placeholder="https://..." onChange={e => {
                      const resources = [...(block.config as any).resources];
                      resources[idx] = { ...res, url: e.target.value };
                      onUpdate({ config: { ...block.config, resources } as any });
                    }} />
                  )}
                  {res.fileData && <p className="text-[10px] text-navy-400">📎 Uploaded file</p>}
                </div>
              ))}
              <button type="button" onClick={() => {
                const resources = [...(block.config as any).resources, { id: newId(), label: 'New Resource', url: '' }];
                onUpdate({ config: { ...block.config, resources } as any });
              }} className="text-[11px] font-semibold text-brand hover:underline">+ Add link</button>
            </div>
          )}
          {/* Form Fields */}
          {block.config.type === 'form_fields' && (
            <FormFieldsBlockEditor
              config={block.config as unknown as FormFieldsConfig}
              onChange={cfg => onUpdate({ config: cfg as any })}
            />
          )}
        </div>
      </div>
    </div>
  );
}
