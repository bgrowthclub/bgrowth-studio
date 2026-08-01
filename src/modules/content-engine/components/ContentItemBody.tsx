import type { ContentItem } from '../types';

interface ContentItemBodyProps {
  item: Pick<ContentItem, 'content_type' | 'body'>;
  editable: boolean;
  onChange?: (body: Record<string, unknown>) => void;
}

function TextField({ label, value, onChange, editable, rows = 2 }: { label: string; value: string; onChange: (v: string) => void; editable: boolean; rows?: number }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-navy-400">{label}</label>
      {editable ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      ) : (
        <p className="whitespace-pre-wrap text-sm text-navy-800">{value || '—'}</p>
      )}
    </div>
  );
}

function ListField({ label, items, onChange, editable }: { label: string; items: string[]; onChange: (v: string[]) => void; editable: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-navy-400">{label}</label>
      {editable ? (
        <textarea
          value={items.join('\n')}
          onChange={(e) => onChange(e.target.value.split('\n').filter(Boolean))}
          rows={Math.max(2, items.length)}
          className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
          placeholder="One per line"
        />
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((tag, i) => (
            <span key={i} className="rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy-600">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Renders (and, when editable, edits) a content_item.body — one branch per content_type shape (see api/_lib/contentEngine/contentSpecs.js, the single source of truth for these shapes). */
export function ContentItemBody({ item, editable, onChange }: ContentItemBodyProps) {
  const body = item.body as Record<string, any>;
  const set = (patch: Record<string, unknown>) => onChange?.({ ...body, ...patch });

  if (item.content_type === 'caption') {
    return (
      <div className="space-y-3">
        <TextField label="Caption" value={body.caption ?? ''} editable={editable} rows={4} onChange={(v) => set({ caption: v })} />
        <ListField label="Hashtags" items={body.hashtags ?? []} editable={editable} onChange={(v) => set({ hashtags: v })} />
      </div>
    );
  }

  if (item.content_type === 'carousel') {
    const slides: { heading: string; body: string }[] = body.slides ?? [];
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-navy-400">Slides</label>
          {slides.map((slide, i) => (
            <div key={i} className="rounded-lg border border-navy-100 p-3">
              <p className="mb-1 text-[11px] font-bold text-navy-400">Slide {i + 1}</p>
              {editable ? (
                <div className="space-y-2">
                  <input
                    value={slide.heading}
                    onChange={(e) => {
                      const next = [...slides];
                      next[i] = { ...next[i], heading: e.target.value };
                      set({ slides: next });
                    }}
                    className="w-full rounded-lg border border-navy-100 px-3 py-1.5 text-sm font-semibold outline-none focus:border-brand-500"
                  />
                  <textarea
                    value={slide.body}
                    rows={2}
                    onChange={(e) => {
                      const next = [...slides];
                      next[i] = { ...next[i], body: e.target.value };
                      set({ slides: next });
                    }}
                    className="w-full rounded-lg border border-navy-100 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
                  />
                </div>
              ) : (
                <>
                  <p className="text-sm font-bold text-navy-900">{slide.heading}</p>
                  <p className="text-sm text-navy-600">{slide.body}</p>
                </>
              )}
            </div>
          ))}
        </div>
        <TextField label="Caption" value={body.caption ?? ''} editable={editable} rows={3} onChange={(v) => set({ caption: v })} />
        <ListField label="Hashtags" items={body.hashtags ?? []} editable={editable} onChange={(v) => set({ hashtags: v })} />
      </div>
    );
  }

  if (item.content_type === 'script') {
    const scenes: { visual: string; voiceover: string }[] = body.scenes ?? [];
    return (
      <div className="space-y-3">
        <TextField label="Hook" value={body.hook ?? ''} editable={editable} onChange={(v) => set({ hook: v })} />
        <div className="space-y-2">
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-navy-400">Scenes</label>
          {scenes.map((scene, i) => (
            <div key={i} className="rounded-lg border border-navy-100 p-3">
              <p className="mb-1 text-[11px] font-bold text-navy-400">Scene {i + 1}</p>
              {editable ? (
                <div className="space-y-2">
                  <input
                    value={scene.visual}
                    placeholder="Visual direction"
                    onChange={(e) => {
                      const next = [...scenes];
                      next[i] = { ...next[i], visual: e.target.value };
                      set({ scenes: next });
                    }}
                    className="w-full rounded-lg border border-navy-100 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
                  />
                  <textarea
                    value={scene.voiceover}
                    rows={2}
                    placeholder="Voiceover / on-screen text"
                    onChange={(e) => {
                      const next = [...scenes];
                      next[i] = { ...next[i], voiceover: e.target.value };
                      set({ scenes: next });
                    }}
                    className="w-full rounded-lg border border-navy-100 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
                  />
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold text-navy-500">{scene.visual}</p>
                  <p className="text-sm text-navy-800">{scene.voiceover}</p>
                </>
              )}
            </div>
          ))}
        </div>
        <TextField label="Call to Action" value={body.cta ?? ''} editable={editable} onChange={(v) => set({ cta: v })} />
      </div>
    );
  }

  if (item.content_type === 'hook_cta') {
    return (
      <div className="space-y-3">
        <ListField label="Hooks" items={body.hooks ?? []} editable={editable} onChange={(v) => set({ hooks: v })} />
        <ListField label="CTAs" items={body.ctas ?? []} editable={editable} onChange={(v) => set({ ctas: v })} />
      </div>
    );
  }

  return <pre className="whitespace-pre-wrap text-xs text-navy-500">{JSON.stringify(body, null, 2)}</pre>;
}
