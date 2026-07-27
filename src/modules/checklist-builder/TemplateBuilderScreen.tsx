import { useState, useCallback } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Plus, Save, Eye, EyeOff, Palette, UploadCloud, ImagePlus, X } from 'lucide-react';
import { ModuleHeader } from './ModuleHeader';
import { SectionEditor } from './SectionEditor';
import { LivePreview } from './LivePreview';
import { TemplateImportModal } from './TemplateImportModal';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button';
import { Toast } from '../../components/Toast';
import { api_saveTemplate } from './api';
import { draftToConfig, draftToConfigJson } from './draftToConfig';
import type { BuilderDraft, DraftSection } from './builderTypes';
import { BRAND_COLOR_PRESETS, TRIAL_UNIT_OPTIONS } from './builderTypes';
import type { SectionType } from '../../engine/types';
import { cn, compressImage } from '../../lib/utils';
import { publishToPortal, slugifyProductName } from '../../lib/publishingEngine';
import { loadSettings } from './SettingsScreen';

/** A cover image the user just picked, staged for the next publish — not yet uploaded. */
interface PendingCoverImage {
  base64: string;
  mimeType: string;
  fileExtension: string;
}

function newKey() {
  return `k-${Math.random().toString(36).slice(2, 9)}`;
}

function newSection(type: SectionType, index: number): DraftSection {
  const base: DraftSection = {
    _key: newKey(),
    id: newKey(),
    type,
    number: index + 1,
    title: '',
    description: '',
    icon: 'file-text',
  };
  if (type === 'form') base.fields = [];
  if (type === 'checklist' || type === 'outcome') base.items = [];
  return base;
}

interface TemplateBuilderScreenProps {
  ownerEmail: string;
  onBack: () => void;
  initialDraft?: BuilderDraft;
}

export function TemplateBuilderScreen({ ownerEmail, onBack, initialDraft }: TemplateBuilderScreenProps) {
  const [draft, setDraft] = useState<BuilderDraft>(
    initialDraft ?? {
      name: '',
      primaryColor: '#1061EC',
      isTrialEligible: true,
      trialUnit: 'days',
      isFree: false,
      sections: [],
    }
  );
  const [showPreview, setShowPreview] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingCoverImage, setPendingCoverImage] = useState<PendingCoverImage | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const categories = loadSettings(ownerEmail).categories ?? [];

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const showToast = useCallback((msg: string) => {
    setToast({ message: msg, visible: true });
    window.setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2400);
  }, []);

  const handleCoverImageSelect = async (file: File) => {
    setIsProcessingImage(true);
    try {
      const { base64 } = await compressImage(file);
      setPendingCoverImage({ base64, mimeType: 'image/jpeg', fileExtension: 'jpg' });
    } catch (e) {
      showToast('Could not process that image — ' + (e instanceof Error ? e.message : 'unknown error'));
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleImportSection = (title: string, items: { label: string; description?: string }[]) => {
    const newSec: DraftSection = {
      _key: newKey(),
      id: newKey(),
      type: 'checklist',
      number: draft.sections.length + 1,
      title,
      description: '',
      icon: 'check-square',
      items: items.map((item, idx) => ({
        _key: `ki-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        id: `id-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        label: item.label,
        description: item.description || '',
        required: false,
      })),
    };
    setDraft((d) => ({ ...d, sections: [...d.sections, newSec] }));
    showToast('Checklist section imported successfully!');
  };

  const updateSection = (index: number, updated: DraftSection) => {
    const sections = [...draft.sections];
    sections[index] = updated;
    setDraft((d) => ({ ...d, sections }));
  };

  const deleteSection = (index: number) => {
    setDraft((d) => ({ ...d, sections: d.sections.filter((_, i) => i !== index) }));
  };

  const duplicateSection = (index: number) => {
    setDraft((d) => {
      const sections = [...d.sections];
      const clone = { ...sections[index], _key: `sk-${Date.now()}`, id: `id-${Date.now()}` };
      sections.splice(index + 1, 0, clone);
      return { ...d, sections };
    });
  };

  const moveSectionUp = (index: number) => {
    if (index === 0) return;
    setDraft((d) => {
      const sections = [...d.sections];
      [sections[index - 1], sections[index]] = [sections[index], sections[index - 1]];
      return { ...d, sections };
    });
  };

  const moveSectionDown = (index: number) => {
    setDraft((d) => {
      if (index >= d.sections.length - 1) return d;
      const sections = [...d.sections];
      [sections[index], sections[index + 1]] = [sections[index + 1], sections[index]];
      return { ...d, sections };
    });
  };

  const addSection = (type: SectionType) => {
    setDraft((d) => ({ ...d, sections: [...d.sections, newSection(type, d.sections.length)] }));
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = draft.sections.findIndex((s) => s._key === active.id);
    const to = draft.sections.findIndex((s) => s._key === over.id);
    setDraft((d) => ({ ...d, sections: arrayMove(d.sections, from, to) }));
  };

  const handleSave = async () => {
    if (!draft.name.trim()) { showToast('Add a template name before saving'); return; }
    if (draft.sections.length === 0) { showToast('Add at least one section before saving'); return; }
    setIsSaving(true);
    try {
      const saved = await api_saveTemplate({
  templateId: draft.templateId,
  ownerEmail,
  name: draft.name,
  category: draft.category ?? '',
  configJson: draftToConfigJson(draft),
});
      setDraft((d) => ({ ...d, templateId: saved.templateId }));
      showToast(draft.templateId ? 'Template updated ✓' : 'Template saved ✓');
    } catch (e) {
      showToast('Save failed — ' + (e instanceof Error ? e.message : 'unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Publishes the currently-saved template to the BGrowth Portal via the
   * Publishing Engine (see src/lib/publishingEngine.ts). Requires the
   * template to have been saved at least once — draft.templateId becomes
   * the stable studio_product_id republishes key on, so publishing an
   * unsaved draft (which would get a throwaway `draft-<timestamp>` id) is
   * blocked rather than silently creating an orphaned Portal product.
   */
  const handlePublish = async () => {
    if (!draft.templateId) { showToast('Save the template before publishing'); return; }
    if (!draft.shortDescription?.trim()) { showToast('Add a short description before publishing'); return; }

    const isTrialEligible = draft.isTrialEligible ?? true;
    const trialUnit = draft.trialUnit ?? 'days';

    if (isTrialEligible && (!draft.trialDuration || draft.trialDuration <= 0)) {
      showToast('Set a trial duration, or turn off the free trial toggle');
      return;
    }
    if (isTrialEligible && trialUnit !== 'days') {
      showToast(`Only "Days" is supported by the Portal today — switch the trial unit to Days, or turn the trial off`);
      return;
    }

    const isFree = draft.isFree ?? false;
    if (!isFree && (!draft.price || draft.price <= 0)) {
      showToast('Set a price, or mark this Workspace as free');
      return;
    }

    setIsPublishing(true);
    try {
      const result = await publishToPortal({
        studioProductId: draft.templateId,
        config: draftToConfig(draft),
        slug: slugifyProductName(draft.name),
        shortDescription: draft.shortDescription,
        categorySlug: draft.category,
        status: 'published',
        publishedBy: ownerEmail,
        coverImage: pendingCoverImage ?? undefined,
        isTrialEligible,
        trialDuration: isTrialEligible ? (draft.trialDuration ?? null) : null,
        trialUnit,
        isFree,
        priceCents: isFree ? null : Math.round((draft.price ?? 0) * 100),
        currency: 'usd',
        stripePriceId: draft.stripePriceId ?? null,
      });

      if (!result.ok) {
        showToast('Publish failed — ' + (result.error ?? 'unknown error'));
        return;
      }
      setDraft((d) => ({ ...d, coverImageUrl: result.product?.coverImageUrl ?? d.coverImageUrl }));
      setPendingCoverImage(null);
      showToast(`Published to Portal ✓ (v${result.product?.version})`);
    } catch (e) {
      showToast('Publish failed — ' + (e instanceof Error ? e.message : 'unknown error'));
    } finally {
      setIsPublishing(false);
    }
  };

  const liveConfig = draftToConfig(draft);
  const sectionCount = draft.sections.length;

  return (
    <div className="flex h-full flex-col">
      <ModuleHeader
        title={draft.templateId ? 'Edit Template' : 'New Template'}
        subtitle={sectionCount > 0 ? `${sectionCount} section${sectionCount !== 1 ? 's' : ''}` : 'No sections yet'}
        onBack={onBack}
        backLabel="Templates"
        actions={
          <div className="flex items-center gap-2">
            <SecondaryButton size="sm" onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="hidden sm:inline">{showPreview ? 'Hide preview' : 'Preview'}</span>
            </SecondaryButton>
            <PrimaryButton size="sm" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving…' : 'Save Template'}
            </PrimaryButton>
            <SecondaryButton
              size="sm"
              onClick={handlePublish}
              disabled={isPublishing || !draft.templateId}
              title={!draft.templateId ? 'Save the template first' : 'Publish to the BGrowth Portal'}
            >
              <UploadCloud className="h-4 w-4" />
              {isPublishing ? 'Publishing…' : 'Publish to Portal'}
            </SecondaryButton>
          </div>
        }
      />

      {/* Split layout: editor left, preview right */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — Editor panel */}
        <div className={cn(
          'flex flex-col overflow-y-auto border-r border-navy-100 bg-[#f4f6fb]',
          showPreview ? 'w-full lg:w-[520px] lg:shrink-0' : 'flex-1'
        )}>
          <div className="flex flex-col gap-5 p-4 sm:p-6">
            {/* Template name + brand color */}
            <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-card">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-navy-400">Template Settings</p>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Template Name *</label>
                  <Input
                    value={draft.name}
                    placeholder="e.g. Client Onboarding Checklist"
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">
                    Short Description <span className="normal-case font-normal text-navy-300">(shown on the Portal storefront)</span>
                  </label>
                  <Textarea
                    value={draft.shortDescription ?? ''}
                    placeholder="One or two sentences describing this Workspace to a customer."
                    rows={2}
                    onChange={(e) => setDraft((d) => ({ ...d, shortDescription: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Category</label>
                  <select
                    value={draft.category ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value || undefined }))}
                    className="w-full rounded-xl border border-navy-100 bg-white px-3 py-2 text-sm text-navy-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="">No category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <p className="mt-1 text-xs text-navy-300">
                      No categories yet — add one in Settings first.
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">
                    Cover Image <span className="normal-case font-normal text-navy-300">(shown on the Portal storefront)</span>
                  </label>
                  <div className="flex items-center gap-3">
                    {(pendingCoverImage?.base64 || draft.coverImageUrl) ? (
                      <img
                        src={pendingCoverImage?.base64 ?? draft.coverImageUrl}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-lg border border-navy-100 object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-navy-200 text-navy-300">
                        <ImagePlus className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <label className="cursor-pointer rounded-lg border border-navy-100 bg-white px-3 py-1.5 text-xs font-semibold text-navy-700 shadow-sm hover:bg-navy-50">
                        {isProcessingImage ? 'Processing…' : pendingCoverImage || draft.coverImageUrl ? 'Replace Image' : 'Upload Image'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isProcessingImage}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleCoverImageSelect(file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {pendingCoverImage && (
                        <button
                          type="button"
                          onClick={() => setPendingCoverImage(null)}
                          className="flex items-center gap-1 text-xs font-medium text-navy-400 hover:text-navy-600"
                        >
                          <X className="h-3 w-3" />
                          Cancel new image
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">Free Trial</label>
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-navy-600">
                      <input
                        type="checkbox"
                        checked={draft.isTrialEligible ?? true}
                        onChange={(e) => setDraft((d) => ({ ...d, isTrialEligible: e.target.checked }))}
                        className="h-4 w-4 rounded border-navy-200 text-brand focus:ring-brand/30"
                      />
                      Offer a free trial
                    </label>
                  </div>
                  {(draft.isTrialEligible ?? true) ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={draft.trialDuration ?? ''}
                        placeholder="14"
                        className="w-24"
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, trialDuration: e.target.value ? Number(e.target.value) : undefined }))
                        }
                      />
                      <select
                        value={draft.trialUnit ?? 'days'}
                        onChange={(e) => setDraft((d) => ({ ...d, trialUnit: e.target.value as BuilderDraft['trialUnit'] }))}
                        className="rounded-xl border border-navy-100 bg-white px-3 py-2 text-sm text-navy-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                      >
                        {TRIAL_UNIT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <p className="text-xs text-navy-300">No trial — customers must purchase to access this Workspace.</p>
                  )}
                  {(draft.isTrialEligible ?? true) && draft.trialUnit && draft.trialUnit !== 'days' && (
                    <p className="mt-1.5 text-xs text-amber-600">
                      Only "Days" is fully supported by the Portal today — Weeks/Months/Hours are prepared for a future release and will be rejected at publish time.
                    </p>
                  )}
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">Pricing</label>
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-navy-600">
                      <input
                        type="checkbox"
                        checked={draft.isFree ?? false}
                        onChange={(e) => setDraft((d) => ({ ...d, isFree: e.target.checked }))}
                        className="h-4 w-4 rounded border-navy-200 text-brand focus:ring-brand/30"
                      />
                      This Workspace is free
                    </label>
                  </div>
                  {!(draft.isFree ?? false) ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-navy-400">$</span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={draft.price ?? ''}
                        placeholder="49.00"
                        className="w-28"
                        onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value ? Number(e.target.value) : undefined }))}
                      />
                      <span className="text-xs text-navy-300">USD, one-time</span>
                    </div>
                  ) : (
                    <p className="text-xs text-navy-300">No charge — customers get full access at no cost.</p>
                  )}
                </div>
                  <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400">Brand Color</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowColorPicker((v) => !v)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-navy-100 shadow-sm"
                      style={{ background: draft.primaryColor }}
                      title="Pick brand color"
                    >
                      <Palette className="h-4 w-4 text-white drop-shadow" />
                    </button>
                    <Input
                      value={draft.primaryColor}
                      placeholder="#1061EC"
                      className="w-28 font-mono text-sm"
                      onChange={(e) => setDraft((d) => ({ ...d, primaryColor: e.target.value }))}
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {BRAND_COLOR_PRESETS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          title={p.label}
                          onClick={() => { setDraft((d) => ({ ...d, primaryColor: p.value })); setShowColorPicker(false); }}
                          className={cn(
                            'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                            draft.primaryColor === p.value ? 'border-navy-800 scale-110' : 'border-white'
                          )}
                          style={{ background: p.value }}
                        />
                      ))}
                    </div>
                  </div>
                  {showColorPicker && (
                    <div className="mt-2">
                      <input
                        type="color"
                        value={draft.primaryColor}
                        onChange={(e) => setDraft((d) => ({ ...d, primaryColor: e.target.value }))}
                        className="h-9 w-full cursor-pointer rounded-lg border border-navy-100"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sections */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wide text-navy-400">
                  Sections ({sectionCount})
                </p>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={onDragEnd}
              >
                <SortableContext
                  items={draft.sections.map((s) => s._key)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-3">
                    {draft.sections.map((section, idx) => (
                      <SectionEditor
                        key={section._key}
                        section={section}
                        index={idx}
                        onChange={(updated) => updateSection(idx, updated)}
                        onDelete={() => deleteSection(idx)}
                        onDuplicate={() => duplicateSection(idx)}
                        onMoveUp={() => moveSectionUp(idx)}
                        onMoveDown={() => moveSectionDown(idx)}
                        isFirst={idx === 0}
                        isLast={idx === draft.sections.length - 1}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {sectionCount === 0 && (
                <div className="rounded-2xl border border-dashed border-navy-200 py-10 text-center">
                  <p className="text-sm font-medium text-navy-500">No sections yet</p>
                  <p className="mt-1 text-xs text-navy-400">Choose a section type below to add the first one.</p>
                </div>
              )}
            </div>

            {/* Add section — botão único */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => addSection('form')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-brand bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-600 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                Add Section
              </button>
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-navy-200 bg-white px-4 py-2.5 text-xs font-semibold text-brand hover:bg-brand-50 hover:border-brand transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                Quick Import from Excel/Word
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — Live Preview (desktop only unless toggled) */}
        {showPreview && (
          <div className="hidden flex-1 lg:flex lg:flex-col">
            <LivePreview config={liveConfig} />
          </div>
        )}
      </div>

      <TemplateImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportSection}
      />
      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
