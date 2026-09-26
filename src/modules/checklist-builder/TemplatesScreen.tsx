import { useEffect, useState } from 'react';
import { LayoutList, Plus, Pencil, Trash2, ChevronRight, Link, Check, Upload, Download, Search } from 'lucide-react';
import { ModuleHeader } from './ModuleHeader';
import { EmptyState } from './EmptyState';
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { api_getTemplates, api_deleteTemplate, api_saveTemplate } from './api';
import type { ChecklistTemplate, ParsedTemplate } from './types';
import type { BuilderDraft } from './builderTypes';
import { ImportTemplateJsonModal } from './ImportTemplateJsonModal';
import { loadSettings } from './SettingsScreen';
import { decompressString } from '../../lib/compress';
import { archiveProduct } from '../../lib/publishingEngine';

interface TemplatesScreenProps {
  ownerEmail: string;
  onOpen: (template: ParsedTemplate) => void;
  onNew: () => void;
  onEdit: (draft: BuilderDraft) => void;
}

export function TemplatesScreen({ ownerEmail, onOpen, onNew, onEdit }: TemplatesScreenProps) {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChecklistTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showJsonImportModal, setShowJsonImportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const categories = loadSettings('').categories ?? [];

  const handleImportTemplate = async (name: string, configJson: string) => {
    try {
      setLoading(true);
      const saved = await api_saveTemplate({
        ownerEmail,
        name,
        configJson,
      });
      setTemplates((prev) => [saved, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao importar o modelo.');
    } finally {
      setLoading(false);
    }
  };

const handleExportJson = async (e: React.MouseEvent, t: ChecklistTemplate) => {
    e.stopPropagation();
    try {
      let configJson = t.configJson;
      if (configJson.startsWith('GZIP:')) {
        configJson = await decompressString(configJson.slice(5));
      }
      const config = JSON.parse(configJson);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-template.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch {
      setError('Failed to export this template as JSON.');
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api_getTemplates(ownerEmail);
      setTemplates(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [ownerEmail]);

  const handleOpen = async (t: ChecklistTemplate) => {
    try {
      let configJson = t.configJson;
      if (configJson.startsWith('GZIP:')) {
        configJson = await decompressString(configJson.slice(5));
      }
      const config = JSON.parse(configJson);      onOpen({ ...t, config });
    } catch {
      setError('This template has an invalid config.');
    }
  };

 const handleEdit = async (e: React.MouseEvent, t: ChecklistTemplate) => {
    e.stopPropagation();
    try {
      let configJson = t.configJson;
      if (configJson.startsWith('GZIP:')) {
        configJson = await decompressString(configJson.slice(5));
      }
      const config = JSON.parse(configJson);      // Convert config back to BuilderDraft format for editing
      // category is restored from the template record itself (it's a real,
      // persisted column). Cover image/description/price/currency/trial
      // config/publish status are all restored from config.publishing (see
      // draftToConfig.ts/PublishingMetadata) — persisted in configJson on
      // every Save/Publish specifically so reopening a previously-published
      // checklist shows its real last-published values instead of blank
      // fields. `publishing ?? {}` plus the `??` defaults below keep this
      // safe for a template saved before PublishingMetadata existed at all —
      // it just falls back to the same defaults a brand-new draft gets
      // (see TemplateBuilderScreen's initial useState), never to blank/off.
      const publishing = config.publishing ?? {};
      const draft: BuilderDraft = {
        templateId: t.templateId,
        name: config.brand?.name ?? t.name,
        primaryColor: config.brand?.primaryColor ?? '#1061EC',
        category: t.category,
        shortDescription: publishing.shortDescription,
        coverImageUrl: publishing.coverImageUrl,
        isFree: publishing.isFree ?? false,
        price: publishing.priceCents != null ? publishing.priceCents / 100 : undefined,
        stripePriceId: publishing.stripePriceId ?? undefined,
        currency: publishing.currency ?? 'usd',
        publishStatus: publishing.status ?? 'draft',
        publishedAt: publishing.publishedAt ?? null,
        isTrialEligible: publishing.isTrialEligible ?? true,
        trialDuration: publishing.trialDuration ?? undefined,
        trialUnit: publishing.trialUnit ?? 'days',
        sections: (config.sections ?? []).map((s: Record<string, unknown>, i: number) => ({
          ...s,
          _key: `k-${i}-${Math.random().toString(36).slice(2, 6)}`,
          fields: (s.fields as Record<string, unknown>[] ?? []).map((f: Record<string, unknown>, fi: number) => ({
            ...f,
            _key: `kf-${fi}-${Math.random().toString(36).slice(2, 6)}`,
          })),
          items: (s.items as Record<string, unknown>[] ?? []).map((item: Record<string, unknown>, ii: number) => ({
            ...item,
            _key: `ki-${ii}-${Math.random().toString(36).slice(2, 6)}`,
          })),
        })),
      };
      onEdit(draft);
    } catch {
      setError('Could not load this template for editing.');
    }
  };

  const handleCopyLink = (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/?template=${templateId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(templateId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      // Read this template's own persisted publish status — the same
      // config.publishing.status field TemplateBuilderScreen's Publish/
      // Unpublish actions already write and read back (see handleEdit
      // above) — to decide whether a corresponding Portal product can
      // exist at all. A template that was never published (status
      // 'draft', or no publishing metadata yet) has no Portal product to
      // touch, so Portal is never called for it.
      let everPublished = false;
      try {
        let configJson = deleteTarget.configJson;
        if (configJson.startsWith('GZIP:')) {
          configJson = await decompressString(configJson.slice(5));
        }
        const config = JSON.parse(configJson);
        const publishStatus = config.publishing?.status;
        everPublished = publishStatus === 'published' || publishStatus === 'archived';
      } catch {
        // Unreadable config — treat like a never-published template rather
        // than guessing; there is no reliable studio_product_id signal to
        // act on here.
      }

      await api_deleteTemplate(deleteTarget.templateId);
      setTemplates((prev) => prev.filter((t) => t.templateId !== deleteTarget.templateId));

      // The Studio delete above already succeeded — this is now purely a
      // best-effort Portal cleanup on top of it, never something that
      // should make the app claim the delete itself failed.
      if (everPublished) {
        const result = await archiveProduct({ studioProductId: deleteTarget.templateId, publishedBy: ownerEmail });
        if (!result.ok) {
          const notFound = result.error?.toLowerCase().includes('no product found');
          setError(
            notFound
              ? 'Template deleted. No corresponding Portal product was found to archive.'
              : `Template deleted, but archiving its Portal product failed — ${result.error}. It may still be visible in the Portal catalog; retry or contact support.`,
          );
        }
      }

      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <ModuleHeader
        title="Checklist Templates"
        subtitle="Select a template to fill out, or create a new one"
        actions={
          <div className="flex items-center gap-2">
            <SecondaryButton size="sm" onClick={() => setShowJsonImportModal(true)} title="Importar JSON">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Importar JSON</span>
            </SecondaryButton>
            <PrimaryButton size="sm" onClick={onNew} title="New Template">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Template</span>
            </PrimaryButton>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
            {error}
            <button onClick={load} className="ml-3 underline hover:no-underline">Retry</button>
          </div>
        )}

        {/* Busca e filtro */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full rounded-xl border border-navy-100 bg-white py-2 pl-9 pr-3 text-sm text-navy-800 placeholder-navy-300 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        {!loading && !error && templates.length === 0 && (
          <EmptyState
            icon={<LayoutList />}
            title="No templates yet"
            description="Click 'New Template' to create your first checklist."
            actionLabel="New Template"
            onAction={onNew}
          />
        )}

        {!loading && !error && templates.length > 0 && (
          <ul className="flex flex-col gap-3">
            {templates
              .filter(t => !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .filter(t => selectedCategory === 'all' || (t.category ?? '') === selectedCategory)
              .map((t) => (
              <li key={t.templateId}>
                <button
                  type="button"
                  onClick={() => handleOpen(t)}
                  className="group flex w-full flex-col gap-3 rounded-2xl border border-navy-100 bg-white p-4 text-left shadow-card transition-shadow hover:shadow-cardHover sm:flex-row sm:items-center sm:gap-4 sm:p-5"
                >
                  {/* Identity — icon + name/date. Its own full-width row on
                      mobile (see the actions row below) so the template name
                      gets the card's full width instead of being squeezed
                      down to a few characters by the action buttons; sm+
                      restores the original single-row layout unchanged. */}
                  <span className="flex min-w-0 items-center gap-3 sm:flex-1 sm:gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
                      <LayoutList className="h-5 w-5" />
                    </span>

                    <span className="min-w-0 flex-1">
                      {/* Wraps up to 2 lines on mobile instead of ellipsis-truncating after
                          a handful of characters — the whole point of this reflow is giving
                          the name real room, not just less-bad truncation. sm+ reverts to the
                          original single-line truncate (unchanged desktop appearance). */}
                      <span className="text-[15px] font-semibold leading-snug text-navy-800 line-clamp-2 sm:line-clamp-none sm:block sm:truncate sm:leading-normal">{t.name}</span>
                      <span className="block text-xs text-navy-400">
                        Updated {new Date(t.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </span>
                  </span>

                  {/* Actions — full-width row of its own below the identity
                      row on mobile (evenly spaced so every action stays
                      reachable with no horizontal scrolling); sm+ sits
                      inline at the end of the single row, same as before. */}
                  <span className="flex shrink-0 items-center justify-between gap-1.5 border-t border-navy-50 pt-3 sm:justify-end sm:border-t-0 sm:pt-0">
                    {/* Copy public link */}
                    <SecondaryButton size="sm" onClick={(e) => handleCopyLink(e, t.templateId)} title="Copy public link">
                      {copiedId === t.templateId
                        ? <><Check className="h-3.5 w-3.5 text-emerald-500" /></>
                        : <><Link className="h-3.5 w-3.5" /></>}
                    </SecondaryButton>

                    {/* Export JSON */}
                    <SecondaryButton size="sm" onClick={(e) => handleExportJson(e, t)} title="Exportar JSON">
                      <Download className="h-3.5 w-3.5" />
                    </SecondaryButton>

                    {/* Edit */}
                    <SecondaryButton size="sm" onClick={(e) => handleEdit(e, t)} title="Edit template">
                      <Pencil className="h-3.5 w-3.5" />
                    </SecondaryButton>

                    {/* Delete */}
                    <SecondaryButton
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(t); }}
                      title="Delete template"
                      className="text-red-500 hover:border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </SecondaryButton>

                    <ChevronRight className="h-4 w-4 shrink-0 text-navy-300" />
                  </span>
                </button>

                {copiedId === t.templateId && (
                  <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate font-mono">{window.location.origin}/?template={t.templateId}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This permanently deletes the template and cannot be undone. If it has been published, its Portal product will be archived and removed from the public catalog — existing customers keep their access. Existing fills will remain in the Sheets but will no longer be accessible."
        confirmLabel={deleting ? 'Deleting…' : 'Delete Template'}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      <ImportTemplateJsonModal
        isOpen={showJsonImportModal}
        onClose={() => setShowJsonImportModal(false)}
        onImport={handleImportTemplate}
      />
    </div>
  );
}
