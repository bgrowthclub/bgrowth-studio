import { useState } from 'react';
import { Search, Plus, Pencil, Trash2, Eye, Filter } from 'lucide-react';
import type { KnowledgeItem, PublishStatus, ContentType } from './types';
import { CATEGORIES } from './mockData';

interface LibraryProps {
  items: KnowledgeItem[];
  onNew: () => void;
  onEdit: (id: string) => void;
  onPreview: (id: string) => void;
  onDelete: (id: string) => void;
}

const STATUS_COLORS: Record<PublishStatus, string> = {
  'Published': 'bg-emerald-50 text-emerald-700',
  'Draft': 'bg-amber-50 text-amber-700',
  'In Review': 'bg-blue-50 text-blue-700',
  'Approved': 'bg-teal-50 text-teal-700',
  'Scheduled': 'bg-purple-50 text-purple-700',
  'Archived': 'bg-slate-100 text-slate-600',
};

export function Library({ items, onNew, onEdit, onPreview, onDelete }: LibraryProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PublishStatus | 'All'>('All');
  const [typeFilter, setTypeFilter] = useState<ContentType | 'All'>('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const filtered = items.filter(item => {
    const matchSearch = !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.excerpt.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'All' || item.publishing.status === statusFilter;
    const matchType = typeFilter === 'All' || item.contentType === typeFilter;
    const matchCategory = categoryFilter === 'All' || item.category === categoryFilter;
    return matchSearch && matchStatus && matchType && matchCategory;
  });

  const types = Array.from(new Set(items.map(i => i.contentType)));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search assets..." className="w-full rounded-xl border border-navy-100 bg-white py-2 pl-9 pr-3 text-sm text-navy-800 placeholder-navy-300 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
        </div>
        <button type="button" onClick={onNew}
          className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
          <Plus className="h-4 w-4" /> New Asset
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-xs text-navy-400">
          <Filter className="h-3.5 w-3.5" />
        </div>
        {(['All', 'Published', 'Draft', 'In Review', 'Approved', 'Scheduled', 'Archived'] as const).map(s => (
          <button key={s} type="button" onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-semibold border transition-all ${statusFilter === s ? 'bg-brand text-white border-brand' : 'bg-white text-navy-500 border-navy-100 hover:border-brand'}`}>
            {s}
          </button>
        ))}
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}
          className="rounded-full border border-navy-100 bg-white px-3 py-1 text-xs font-semibold text-navy-600 focus:outline-none focus:border-brand">
          <option value="All">All Types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="rounded-full border border-navy-100 bg-white px-3 py-1 text-xs font-semibold text-navy-600 focus:outline-none focus:border-brand">
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Count */}
      <p className="text-xs text-navy-400">{filtered.length} asset{filtered.length !== 1 ? 's' : ''}</p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-navy-200 py-16 text-center">
          <p className="text-sm font-semibold text-navy-500">No assets found</p>
          <p className="mt-1 text-xs text-navy-400">Try adjusting your filters or create a new asset.</p>
          <button type="button" onClick={onNew} className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            New Asset
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(item => (
            <div key={item.id} className="group flex items-center gap-4 rounded-2xl border border-navy-100 bg-white p-4 shadow-card hover:shadow-cardHover transition-all">
              {item.featuredImage && (
                <img src={item.featuredImage} alt={item.title} className="h-14 w-20 shrink-0 rounded-xl object-cover border border-navy-100" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[10px] font-bold uppercase text-navy-500">{item.contentType}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[item.publishing.status] ?? STATUS_COLORS.Draft}`}>{item.publishing.status === 'In Review' ? 'Reviewed' : item.publishing.status}</span>
                  {item.publishing.access === 'everyone' && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Open to all</span>}
                  {item.language === 'pt' && <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[10px] font-bold text-navy-500">PT</span>}
                  {item.featuredOptions.featured && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">⭐ Featured</span>}
                  <span className="text-[10px] text-navy-400">{item.category}</span>
                </div>
                <h3 className="truncate text-sm font-bold text-navy-800">{item.title}</h3>
                <p className="truncate text-xs text-navy-400 mt-0.5">{item.excerpt}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {item.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="text-[10px] text-navy-400 hidden sm:block">{item.lastUpdated}</span>
                <button type="button" onClick={() => onPreview(item.id)} className="rounded-lg border border-navy-100 p-1.5 text-navy-400 hover:border-brand hover:text-brand" title="Preview">
                  <Eye className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => onEdit(item.id)} className="rounded-lg border border-navy-100 p-1.5 text-navy-400 hover:border-brand hover:text-brand" title="Edit">
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => onDelete(item.id)} className="rounded-lg border border-navy-100 p-1.5 text-navy-400 hover:border-red-200 hover:text-red-500" title="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
