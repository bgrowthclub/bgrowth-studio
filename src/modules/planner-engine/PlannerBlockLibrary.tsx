import { useState } from 'react';
import {
  X, Search, FileText, StickyNote, Image as ImageIcon,
  CheckSquare, Target, Flag, GitBranch, TrendingUp, Calendar, File,
} from 'lucide-react';
import { type BlockType, BLOCK_TYPE_INFO } from './types';
import { cn } from '../../lib/utils';

// ─── Block category map ──────────────────────────────────────────
// 'text' and 'divider' were previously listed here with no backing
// BlockType, defaultBlock() config, Fill renderer, or Builder editor
// anywhere in the codebase — dead entries, unreachable from the "Add
// Block" modal (which iterates BLOCK_TYPE_INFO, not this map). Removed
// rather than formalized into BlockType, since there is no existing
// implementation to base a real block type on (Phase 1 audit, §10).
export type BlockCategory = 'all' | 'content' | 'planning' | 'resources' | 'media' | 'forms';

export const BLOCK_CATEGORIES: Record<BlockType, BlockCategory> = {
  notes: 'content',
  image: 'media',
  checklist: 'planning',
  goals: 'planning',
  milestones: 'planning',
  timeline: 'planning',
  progress: 'planning',
  calendar: 'planning',
  resources: 'resources',
  worksheet: 'content',
  form_fields: 'forms',
};

export const BLOCK_ICONS: Record<BlockType, React.ReactNode> = {
  notes: <StickyNote className="h-4 w-4" />,
  image: <ImageIcon className="h-4 w-4" />,
  checklist: <CheckSquare className="h-4 w-4" />,
  goals: <Target className="h-4 w-4" />,
  milestones: <Flag className="h-4 w-4" />,
  timeline: <GitBranch className="h-4 w-4" />,
  progress: <TrendingUp className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
  resources: <File className="h-4 w-4" />,
  worksheet: <FileText className="h-4 w-4" />,
  form_fields: <FileText className="h-4 w-4" />,
};

export const BLOCK_DESCRIPTIONS: Record<BlockType, string> = {
  notes: 'Add notes with formatting options',
  image: 'Add images with captions',
  checklist: 'Add a checklist with tasks',
  goals: 'Define and track goals',
  milestones: 'Add milestone items',
  timeline: 'Visual timeline of events',
  progress: 'Track progress and completion',
  calendar: 'Add calendar view',
  resources: 'Add files and documents',
  worksheet: 'Add questions for users to answer',
  form_fields: 'Mixed field types (text, select, etc.)',
};

// ─── Add Block Modal ─────────────────────────────────────────────
export function AddBlockModal({
  onAdd,
  onClose,
}: {
  onAdd: (type: BlockType) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<BlockCategory>('all');

  const categories: { key: BlockCategory; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'content', label: 'Content' },
    { key: 'planning', label: 'Planning' },
    { key: 'resources', label: 'Resources' },
    { key: 'forms', label: 'Forms' },
    { key: 'media', label: 'Media' },
  ];

  const filtered = (Object.entries(BLOCK_TYPE_INFO) as [BlockType, (typeof BLOCK_TYPE_INFO)[BlockType]][]).filter(
    ([type, info]) => {
      const matchesCategory = category === 'all' || BLOCK_CATEGORIES[type] === category;
      const matchesSearch = !search || info.label.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
          <h3 className="text-base font-bold text-navy-800">Add Block</h3>
          <button type="button" onClick={onClose} className="text-navy-400 hover:text-navy-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search blocks..."
              className="w-full rounded-xl border border-navy-100 py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-1 px-5 pt-3">
          {categories.map(c => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                category === c.key
                  ? 'bg-brand text-white'
                  : 'text-navy-500 hover:bg-navy-50'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Block grid */}
        <div className="max-h-72 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-2">
            {filtered.map(([type, info]) => (
              <button
                key={type}
                type="button"
                onClick={() => { onAdd(type); onClose(); }}
                className="flex items-start gap-3 rounded-xl border border-navy-100 bg-navy-50 p-3 text-left hover:border-brand hover:bg-brand-50 transition-colors"
              >
                <span className="mt-0.5 text-brand">{BLOCK_ICONS[type]}</span>
                <div>
                  <p className="text-sm font-semibold text-navy-800">{info.label}</p>
                  <p className="text-[11px] text-navy-400 leading-tight mt-0.5">{BLOCK_DESCRIPTIONS[type]}</p>
                </div>
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-navy-400">No blocks found</p>
          )}
        </div>
      </div>
    </div>
  );
}
