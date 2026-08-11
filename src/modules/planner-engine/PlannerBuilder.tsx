import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Save, Eye, Plus, ChevronRight, Settings, Upload,
  LayoutGrid, Rows3,
} from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { AddBlockModal } from './PlannerBlockLibrary';
import { BlockEditorPanel } from './BlockEditorPanel';
import { SectionCard } from './PlannerSectionEditor';
import { PlannerSectionCanvas } from './PlannerSectionCanvas';
import { PlannerPreview } from './PlannerPreview';
import {
  type PlannerConfig, type PlannerSection, type PlannerBlock, type BlockType,
  THEME_COLORS, PLANNER_CATEGORIES,
  defaultBlock, newSection, normalizePlanner, validatePlanner,
  computeDefaultSectionLayout, cloneSectionWithNewIds, cloneBlockWithNewIds,
} from './types';
import { cn } from '../../lib/utils';

// ─── Types ───────────────────────────────────────────────────────
type Tab = 'builder' | 'preview' | 'fill';
type ViewMode = 'canvas' | 'list';

// ─── Settings Panel ───────────────────────────────────────────────
function SettingsPanel({
  settings,
  onUpdate,
  fileRef,
  onCoverUpload,
}: {
  settings: PlannerConfig['settings'];
  onUpdate: (partial: Partial<PlannerConfig['settings']>) => void;
  fileRef: React.RefObject<HTMLInputElement>;
  onCoverUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [openSections, setOpenSections] = useState({ basic: true, branding: false, experience: true, export: false });
  const toggle = (key: keyof typeof openSections) => setOpenSections(s => ({ ...s, [key]: !s[key] }));

  return (
    <div className="flex flex-col gap-0">
      {/* Basic Information */}
      <div className="border-b border-navy-100">
        <button type="button" onClick={() => toggle('basic')}
          className="flex w-full items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider text-navy-500 hover:bg-navy-50">
          Basic Information
          <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', openSections.basic && 'rotate-90')} />
        </button>
        {openSections.basic && (
          <div className="flex flex-col gap-3 px-4 pb-4">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-navy-500">Planner Name</label>
              <Input value={settings.name} placeholder="My Planner" onChange={e => onUpdate({ name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-navy-500">Description</label>
              <Textarea rows={2} value={settings.description} placeholder="What will users achieve?" onChange={e => onUpdate({ description: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-navy-500">Category</label>
              <Select value={settings.category} onChange={e => onUpdate({ category: e.target.value as any })}>
                {PLANNER_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-navy-500">Difficulty</label>
                <Select value={settings.difficulty} onChange={e => onUpdate({ difficulty: e.target.value as any })}>
                  {['Beginner', 'Intermediate', 'Advanced'].map(d => <option key={d}>{d}</option>)}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-navy-500">Language</label>
                <Select value={settings.language} onChange={e => onUpdate({ language: e.target.value as any })}>
                  {['English', 'Portuguese', 'Spanish'].map(l => <option key={l}>{l}</option>)}
                </Select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-navy-500">Estimated Time</label>
              <Input value={settings.estimatedDuration} placeholder="30 minutes/day" onChange={e => onUpdate({ estimatedDuration: e.target.value })} />
            </div>
          </div>
        )}
      </div>

      {/* Branding */}
      <div className="border-b border-navy-100">
        <button type="button" onClick={() => toggle('branding')}
          className="flex w-full items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider text-navy-500 hover:bg-navy-50">
          Branding
          <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', openSections.branding && 'rotate-90')} />
        </button>
        {openSections.branding && (
          <div className="flex flex-col gap-3 px-4 pb-4">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-navy-500">Icon (emoji)</label>
              <Input value={settings.icon} maxLength={4} onChange={e => onUpdate({ icon: e.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-semibold text-navy-500">Theme Color</label>
              <div className="flex flex-wrap gap-1.5">
                {THEME_COLORS.map(color => (
                  <button key={color} type="button" onClick={() => onUpdate({ primaryColor: color })}
                    className={cn('h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                      settings.primaryColor === color ? 'border-navy-800 scale-110' : 'border-white shadow')}
                    style={{ background: color }} />
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-navy-500">Cover Image</label>
              {settings.coverImage ? (
                <div className="relative">
                  <img src={settings.coverImage} alt="Cover" className="h-24 w-full rounded-lg object-cover" />
                  <button type="button" onClick={() => onUpdate({ coverImage: null })}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow">
                    ✕
                  </button>
                </div>
              ) : (
                <div onClick={() => fileRef.current?.click()}
                  className="flex h-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-navy-200 bg-navy-50 hover:bg-navy-100">
                  <p className="flex items-center gap-1.5 text-xs text-navy-400"><Upload className="h-3.5 w-3.5" /> Upload cover</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onCoverUpload} />
            </div>
          </div>
        )}
      </div>

      {/* Customer Experience */}
      <div className="border-b border-navy-100">
        <button type="button" onClick={() => toggle('experience')}
          className="flex w-full items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider text-navy-500 hover:bg-navy-50">
          Customer Experience
          <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', openSections.experience && 'rotate-90')} />
        </button>
        {openSections.experience && (
          <div className="flex flex-col gap-2 px-4 pb-4">
            {([
              { value: 'choose' as const, label: 'Let Customer Choose', description: 'Customers can choose Visual or Guided mode and switch between them.' },
              { value: 'visual' as const, label: 'Visual Only', description: 'Customers see and fill the complete planner visually.' },
              { value: 'guided' as const, label: 'Guided Only', description: 'Customers complete the planner one section at a time.' },
            ]).map(opt => {
              const isSelected = (settings.customerExperience ?? 'choose') === opt.value;
              return (
                <label key={opt.value}
                  className={cn('flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors',
                    isSelected ? 'border-brand bg-brand-50' : 'border-navy-100 hover:bg-navy-50')}>
                  <input type="radio" name="customerExperience" checked={isSelected}
                    onChange={() => onUpdate({ customerExperience: opt.value })}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-brand" />
                  <div>
                    <p className="text-xs font-semibold text-navy-800">{opt.label}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-navy-400">{opt.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Export & Share */}
      <div className="border-b border-navy-100">
        <button type="button" onClick={() => toggle('export')}
          className="flex w-full items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider text-navy-500 hover:bg-navy-50">
          Export & Share
          <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', openSections.export && 'rotate-90')} />
        </button>
        {openSections.export && (
          <div className="flex flex-col gap-2 px-4 pb-4">
            <div className="grid grid-cols-2 gap-2 mb-1">
              <div>
                <label className="mb-1 block text-[10px] font-semibold text-navy-400">Page Size</label>
                <Select value={settings.pageSize} onChange={e => onUpdate({ pageSize: e.target.value as any })}>
                  {['A4', 'Letter', 'A5'].map(s => <option key={s}>{s}</option>)}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold text-navy-400">Orientation</label>
                <Select value={settings.pageOrientation} onChange={e => onUpdate({ pageOrientation: e.target.value as any })}>
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </Select>
              </div>
            </div>
            {[
              { key: 'exportPdf' as const, label: 'PDF Export' },
              { key: 'exportPrint' as const, label: 'Print' },
              { key: 'allowShare' as const, label: 'Share Link' },
            ].map(opt => (
              <label key={opt.key} className="flex cursor-pointer items-center gap-2 text-xs text-navy-700">
                <input type="checkbox" checked={settings[opt.key] as boolean}
                  onChange={e => onUpdate({ [opt.key]: e.target.checked })}
                  className="h-3.5 w-3.5 rounded accent-brand" />
                {opt.label}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Cover Preview ────────────────────────────────────────────────
function CoverPreview({ settings, totalBlocks, totalSections }: {
  settings: PlannerConfig['settings'];
  totalBlocks: number;
  totalSections: number;
}) {
  return (
    <div className="rounded-2xl overflow-hidden border border-navy-100 shadow-card mb-4">
      <div
        className="relative flex min-h-[140px] items-end p-5"
        style={{ background: `linear-gradient(135deg, ${settings.primaryColor}dd, ${settings.primaryColor}88)` }}
      >
        {settings.coverImage && (
          <img src={settings.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        )}
        <div className="relative z-10">
          <span className="text-3xl">{settings.icon}</span>
          <h2 className="mt-1 text-xl font-extrabold text-white leading-tight">
            {settings.name || 'Your Planner Name'}
          </h2>
          {settings.description && (
            <p className="mt-1 text-sm text-white/80 line-clamp-2">{settings.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white">{settings.category}</span>
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white">Difficulty: {settings.difficulty}</span>
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white">⏱ {settings.estimatedDuration}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 divide-x divide-navy-100 border-t border-navy-100 bg-white">
        {[
          { label: 'Sections', value: totalSections },
          { label: 'Blocks', value: totalBlocks },
          { label: 'Est. Time', value: settings.estimatedDuration.split('/')[0] },
          { label: 'Language', value: settings.language.slice(0, 3) },
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center py-3">
            <p className="text-base font-extrabold text-brand">{s.value}</p>
            <p className="text-[10px] text-navy-400">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Builder ─────────────────────────────────────────────────
interface PlannerBuilderProps {
  planner: PlannerConfig;
  onSave: (planner: PlannerConfig) => void;
  onBack: () => void;
  onPreview: () => void;
}

export function PlannerBuilder({ planner, onSave, onBack, onPreview }: PlannerBuilderProps) {
  // normalizePlanner() is the single canonical source for "sections may be
  // missing, or the planner may still be in the legacy flat blocks[]
  // shape" — replaces this file's own former local migrateToSections().
  // `planner` reaching here should already be normalized by PlannerEngine,
  // but normalizing again is cheap and defends against any caller that
  // isn't (e.g. a directly-pasted JSON import).
  const [draft, setDraft] = useState<PlannerConfig>(() => normalizePlanner({ ...planner, settings: { ...planner.settings } }));
  const [sections, setSections] = useState<PlannerSection[]>(() => normalizePlanner(planner).sections);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedBlockSectionId, setSelectedBlockSectionId] = useState<string | null>(null);
  const [addBlockSectionId, setAddBlockSectionId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('builder');
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (typeof window !== 'undefined' && window.innerWidth < 1024 ? 'list' : 'canvas')
  );
  const [publishErrors, setPublishErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Canvas layout gap-fill: any section that reaches the Builder without a
  // `layout` (a legacy template, a flat-blocks import, a hand-pasted JSON
  // import) gets a real grid position once, on mount, so the Canvas view
  // never needs an "if no layout" branch and Preview/Fill (which never
  // read `layout` at all) stay completely unaffected. Sections added via
  // "Add Section" below already get a layout at creation time.
  useEffect(() => {
    setSections(prev => {
      let changed = false;
      const next = prev.map((sec, idx) => {
        if (sec.layout) return sec;
        changed = true;
        return { ...sec, layout: computeDefaultSectionLayout(idx) };
      });
      return changed ? next : prev;
    });
  }, []); // once on mount only — addSection() assigns layout directly for new sections

  const updateSettings = (partial: Partial<typeof draft.settings>) => {
    setDraft(d => ({ ...d, settings: { ...d.settings, ...partial }, updatedAt: new Date().toISOString() }));
  };

  const addSection = () => {
    setSections(s => [...s, { ...newSection('New Section'), layout: computeDefaultSectionLayout(s.length) }]);
  };

  const deleteSection = (sectionId: string) => {
    setSections(s => s.filter(sec => sec.id !== sectionId));
  };

  const updateSection = (sectionId: string, partial: Partial<PlannerSection>) => {
    setSections(s => s.map(sec => sec.id === sectionId ? { ...sec, ...partial } : sec));
  };

  const moveSectionUp = (idx: number) => {
    if (idx === 0) return;
    setSections(s => {
      const arr = [...s];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  };

  const moveSectionDown = (idx: number) => {
    setSections(s => {
      if (idx >= s.length - 1) return s;
      const arr = [...s];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  };

  // Bring to front / send to back only ever touch layout.z — never
  // `sections[]` array order, which stays what drives Fill's step order
  // and the PDF's section order. A visual restacking on the canvas must
  // never silently reorder a member's Fill flow.
  const bringSectionToFront = (sectionId: string) => {
    setSections(s => {
      const maxZ = Math.max(0, ...s.map((sec, i) => sec.layout?.z ?? i));
      return s.map(sec => sec.id === sectionId
        ? { ...sec, layout: { ...(sec.layout ?? computeDefaultSectionLayout(0)), z: maxZ + 1 } }
        : sec);
    });
  };

  const sendSectionToBack = (sectionId: string) => {
    setSections(s => {
      const minZ = Math.min(0, ...s.map((sec, i) => sec.layout?.z ?? i));
      return s.map(sec => sec.id === sectionId
        ? { ...sec, layout: { ...(sec.layout ?? computeDefaultSectionLayout(0)), z: minZ - 1 } }
        : sec);
    });
  };

  const toggleSectionLock = (sectionId: string) => {
    setSections(s => s.map(sec => sec.id === sectionId
      ? { ...sec, layout: { ...(sec.layout ?? computeDefaultSectionLayout(0)), locked: !sec.layout?.locked } }
      : sec));
  };

  // Duplicate section: new section id + a new id for every block it
  // contains (so the copy and the original never collide within this
  // planner), inserted immediately after the original. Nested config ids
  // (e.g. a checklist's own item ids) are intentionally left as-is — fill
  // data is addressed per-block first (fillData[block.id]...), so two
  // different blocks sharing the same internal item id never collide.
  const duplicateSection = (sectionId: string) => {
    setSections(s => {
      const idx = s.findIndex(sec => sec.id === sectionId);
      if (idx === -1) return s;
      const clone = cloneSectionWithNewIds(s[idx]);
      const next = [...s];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  };

  const duplicateBlock = (sectionId: string, blockId: string) => {
    setSections(s => s.map(sec => {
      if (sec.id !== sectionId) return sec;
      const idx = sec.blocks.findIndex(b => b.id === blockId);
      if (idx === -1) return sec;
      const clone = cloneBlockWithNewIds(sec.blocks[idx]);
      const blocks = [...sec.blocks];
      blocks.splice(idx + 1, 0, clone);
      return { ...sec, blocks };
    }));
  };

  const addBlock = (sectionId: string, type: BlockType) => {
    const block = defaultBlock(type);
    setSections(s => s.map(sec =>
      sec.id === sectionId ? { ...sec, blocks: [...sec.blocks, block] } : sec
    ));
    setSelectedBlockId(block.id);
    setSelectedBlockSectionId(sectionId);
    setAddBlockSectionId(null);
  };

  const deleteBlock = (sectionId: string, blockId: string) => {
    setSections(s => s.map(sec =>
      sec.id === sectionId ? { ...sec, blocks: sec.blocks.filter(b => b.id !== blockId) } : sec
    ));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
      setSelectedBlockSectionId(null);
    }
  };

  const updateBlock = (sectionId: string, blockId: string, partial: Partial<PlannerBlock>) => {
    setSections(s => s.map(sec =>
      sec.id === sectionId
        ? { ...sec, blocks: sec.blocks.map(b => b.id === blockId ? { ...b, ...partial } : b) }
        : sec
    ));
  };

  const reorderBlocks = (sectionId: string, from: number, to: number) => {
    setSections(s => s.map(sec =>
      sec.id === sectionId ? { ...sec, blocks: arrayMove(sec.blocks, from, to) } : sec
    ));
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 800;
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL('image/jpeg', 0.7);
      URL.revokeObjectURL(url);
      updateSettings({ coverImage: compressed });
    };
    img.src = url;
  };

  const handleSave = (publishStatus: 'draft' | 'published') => {
    const next: PlannerConfig = { ...draft, sections, publishStatus };

    // Draft saves are never blocked — an incomplete planner must always be
    // saveable. Only the transition to 'published' is validated.
    if (publishStatus === 'published') {
      const errors = validatePlanner(next);
      if (errors.length > 0) {
        setPublishErrors(errors);
        return;
      }
    }
    setPublishErrors([]);
    onSave(next);
  };

  const totalBlocks = sections.reduce((sum, s) => sum + s.blocks.length, 0);

  const selectedBlock = selectedBlockSectionId && selectedBlockId
    ? sections.find(s => s.id === selectedBlockSectionId)?.blocks.find(b => b.id === selectedBlockId) ?? null
    : null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f4f6fb]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-navy-100 bg-white px-4 py-2.5 z-10">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">My Planners</span>
          </button>
          <span className="text-navy-200">/</span>
          <span className="text-sm font-semibold text-navy-800 truncate max-w-[200px]">
            {draft.settings.name || 'New Planner'}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-navy-100 bg-navy-50 p-1">
          {([
            { key: 'builder' as Tab, label: 'Builder' },
            { key: 'preview' as Tab, label: 'Preview' },
            { key: 'fill' as Tab, label: 'Fill Preview' },
          ]).map(({ key, label }) => (
            <button key={key} type="button" onClick={() => { setTab(key); if (key === 'fill') onPreview(); }}
              className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                tab === key ? 'bg-white shadow-sm text-brand' : 'text-navy-500 hover:text-navy-700')}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => handleSave('draft')}
            className="flex items-center gap-1.5 rounded-lg border border-navy-100 bg-white px-3 py-1.5 text-sm font-medium text-navy-600 hover:bg-navy-50">
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Save Draft</span>
          </button>
          <button type="button" onClick={() => handleSave('published')}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-600">
            🚀 <span className="hidden sm:inline">Publish</span>
          </button>
        </div>
      </div>

      {publishErrors.length > 0 && (
        <div className="shrink-0 border-b border-red-100 bg-red-50 px-4 py-2.5">
          <p className="text-xs font-bold text-red-700">Fix the following before publishing:</p>
          <ul className="mt-1 list-disc pl-4 text-xs text-red-600">
            {publishErrors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      {tab === 'preview' ? (
        // Builder data → Preview renderer → Fill renderer, off the same
        // PlannerConfig — see PlannerPreview.tsx.
        <PlannerPreview planner={{ ...draft, sections }} />
      ) : (
      /* 3-column workspace */
      <div className="flex flex-1 overflow-hidden">

        {/* Col 1 — Settings (240px) */}
        <div className="w-[240px] shrink-0 overflow-y-auto border-r border-navy-100 bg-white">
          <div className="flex items-center gap-2 border-b border-navy-100 px-4 py-3">
            <Settings className="h-4 w-4 text-navy-400" />
            <p className="text-xs font-bold uppercase tracking-wider text-navy-400">Planner Settings</p>
          </div>
          <SettingsPanel
            settings={draft.settings}
            onUpdate={updateSettings}
            fileRef={fileRef}
            onCoverUpload={handleCoverUpload}
          />
        </div>

        {/* Col 2 — Structure (flex-1) */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between border-b border-navy-100 bg-white px-4 py-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-navy-400">Planner Structure</p>
            <div className="flex items-center gap-2">
              {/* Canvas is a genuine free-position x/y surface (react-rnd);
                  List is a plain top-to-bottom stack for narrow viewports
                  or anyone who prefers it — never a "fake canvas". */}
              <div className="flex items-center gap-0.5 rounded-lg border border-navy-100 bg-navy-50 p-0.5">
                <button type="button" onClick={() => setViewMode('canvas')} title="Canvas view"
                  className={cn('flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors',
                    viewMode === 'canvas' ? 'bg-white shadow-sm text-brand' : 'text-navy-500 hover:text-navy-700')}>
                  <LayoutGrid className="h-3.5 w-3.5" /> Canvas
                </button>
                <button type="button" onClick={() => setViewMode('list')} title="List view"
                  className={cn('flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors',
                    viewMode === 'list' ? 'bg-white shadow-sm text-brand' : 'text-navy-500 hover:text-navy-700')}>
                  <Rows3 className="h-3.5 w-3.5" /> List
                </button>
              </div>
              {viewMode === 'list' && (
                <button type="button" onClick={addSection}
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-navy-200 px-3 py-1.5 text-xs font-semibold text-navy-500 hover:border-brand hover:bg-brand-50 hover:text-brand transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                  Add Section
                </button>
              )}
            </div>
          </div>

          {viewMode === 'canvas' ? (
            <PlannerSectionCanvas
              sections={sections}
              selectedBlockId={selectedBlockId}
              selectedBlockSectionId={selectedBlockSectionId}
              onSelectBlock={(sectionId, blockId) => { setSelectedBlockId(blockId); setSelectedBlockSectionId(sectionId); }}
              onDeleteBlock={deleteBlock}
              onDuplicateBlock={duplicateBlock}
              onAddBlock={(sectionId) => setAddBlockSectionId(sectionId)}
              onReorderBlocks={reorderBlocks}
              onUpdateSection={updateSection}
              onDeleteSection={deleteSection}
              onDuplicateSection={duplicateSection}
              onBringToFront={bringSectionToFront}
              onSendToBack={sendSectionToBack}
              onToggleLock={toggleSectionLock}
              onAddSection={addSection}
            />
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              {/* Cover preview */}
              <CoverPreview
                settings={draft.settings}
                totalBlocks={totalBlocks}
                totalSections={sections.length}
              />

              {/* Sections */}
              {sections.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-navy-200 py-16 text-center">
                  <p className="text-sm font-semibold text-navy-500">No sections yet</p>
                  <p className="mt-1 text-xs text-navy-400">Click "Add Section" to get started</p>
                  <button type="button" onClick={addSection}
                    className="mt-4 flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
                    <Plus className="h-4 w-4" /> Add Section
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {sections.map((section, idx) => (
                    <SectionCard
                      key={section.id}
                      section={section}
                      variant="list"
                      selectedBlockId={selectedBlockSectionId === section.id ? selectedBlockId : null}
                      onSelectBlock={(blockId) => {
                        setSelectedBlockId(blockId);
                        setSelectedBlockSectionId(section.id);
                      }}
                      onDeleteBlock={(blockId) => deleteBlock(section.id, blockId)}
                      onDuplicateBlock={(blockId) => duplicateBlock(section.id, blockId)}
                      onAddBlock={(sectionId) => setAddBlockSectionId(sectionId)}
                      onUpdateSection={(partial) => updateSection(section.id, partial)}
                      onDeleteSection={() => deleteSection(section.id)}
                      onDuplicateSection={() => duplicateSection(section.id)}
                      onMoveUp={() => moveSectionUp(idx)}
                      onMoveDown={() => moveSectionDown(idx)}
                      isFirst={idx === 0}
                      isLast={idx === sections.length - 1}
                      onReorderBlocks={(from, to) => reorderBlocks(section.id, from, to)}
                    />
                  ))}

                  <button type="button" onClick={addSection}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-navy-200 py-4 text-sm font-semibold text-navy-400 hover:border-brand hover:bg-brand-50 hover:text-brand transition-colors">
                    <Plus className="h-4 w-4" />
                    Add Section
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Col 3 — Block editor OR empty state (280px) */}
        <div className="w-[280px] shrink-0 overflow-y-auto border-l border-navy-100 bg-white">
          {selectedBlock && selectedBlockSectionId ? (
            <BlockEditorPanel
              block={selectedBlock}
              onUpdate={(partial) => updateBlock(selectedBlockSectionId, selectedBlock.id, partial)}
              onClose={() => { setSelectedBlockId(null); setSelectedBlockSectionId(null); }}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-50 text-navy-300 mb-3">
                <Eye className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-navy-500">Select a block to edit</p>
              <p className="mt-1 text-xs text-navy-400 leading-relaxed">
                Click any block in a section to configure its content and settings.
              </p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Add Block Modal */}
      {addBlockSectionId && (
        <AddBlockModal
          onAdd={(type) => addBlock(addBlockSectionId, type)}
          onClose={() => setAddBlockSectionId(null)}
        />
      )}
    </div>
  );
}
