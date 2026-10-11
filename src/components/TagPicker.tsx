import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { tagSlug, useTagList } from '../lib/workspaceTags';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Where the list is managed (the Website's Admin → Catalog → Tags). */
  manageUrl?: string;
}

/**
 * Tags for a product, picked from the shared list (portal.tags). Typing
 * suggests existing tags; Enter adds the typed one (it joins the list on
 * publish). A tag with the same key as one already chosen isn't added twice.
 */
export default function TagPicker({ value, onChange, manageUrl }: Props) {
  const list = useTagList();
  const [text, setText] = useState('');
  const chosen = useMemo(() => new Set(value.map(tagSlug)), [value]);
  const query = tagSlug(text);
  const suggestions = query
    ? list.filter((t) => !chosen.has(t.slug) && (t.slug.includes(query) || t.name.toLowerCase().includes(text.toLowerCase()))).slice(0, 8)
    : [];

  const add = (name: string) => {
    const clean = name.trim().slice(0, 60);
    const slug = tagSlug(clean);
    if (!slug || chosen.has(slug) || value.length >= 20) return;
    // Use the list's own spelling when the tag already exists.
    const existing = list.find((t) => t.slug === slug);
    onChange([...value, existing ? existing.name : clean]);
    setText('');
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">
            {tag}
            <button type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(value.filter((t) => t !== tag))} className="opacity-70 hover:opacity-100">
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="relative mt-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(suggestions[0] && tagSlug(suggestions[0].name) === query ? suggestions[0].name : text);
            }
          }}
          placeholder={value.length >= 20 ? 'Up to 20 tags' : 'Type a tag and press Enter'}
          disabled={value.length >= 20}
          className="w-full rounded-xl border border-navy-100 bg-white px-3 py-2 text-sm text-navy-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        {suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-navy-100 bg-white py-1 shadow-lg">
            {suggestions.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => add(t.name)} className="block w-full px-3 py-1.5 text-left text-sm text-navy-700 hover:bg-navy-50">
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-1 text-xs text-navy-300">
        Same list as the website. A new tag joins the list when you publish.{' '}
        {manageUrl && (
          <a href={manageUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand hover:underline">
            Manage tags
          </a>
        )}
      </p>
    </div>
  );
}
