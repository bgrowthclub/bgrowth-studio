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
      // persisted column). Cover image/description/price/currency/publish
      // status are restored from config.publishing (see
      // draftToConfig.ts/PublishingMetadata) — persisted in configJson on
      // every Save/Publish specifically so reopening a previously-published
      // checklist shows its real last-published values instead of blank
      // fields. Trial config (isTrialEligible/trialDuration/trialUnit) has
      // the same historical gap and still isn't restored here — a separate,
      // not-yet-fixed issue, re-enter those before republishing if needed.
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
    try {
      await api_deleteTemplate(deleteTarget.templateId);
      setTemplates((prev) => prev.filter((t) => t.templateId !== deleteTarget.templateId));
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
            <SecondaryButton size="sm" onClick={() => setShowJsonImportModal(true)}>
              <Upload className="h-4 w-4" />
              Importar JSON
            </SecondaryButton>
            <PrimaryButton size="sm" onClick={onNew}>
              <Plus className="h-4 w-4" />
              New Template
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
                  className="group flex w-full items-center gap-4 rounded-2xl border border-navy-100 bg-white p-4 text-left shadow-card transition-shadow hover:shadow-cardHover sm:p-5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
                    <LayoutList className="h-5 w-5" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-navy-800">{t.name}</span>
                    <span className="block text-xs text-navy-400">
                      Updated {new Date(t.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-1.5">
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

                    <ChevronRight className="h-4 w-4 text-navy-300" />
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
        description="This permanently deletes the template and cannot be undone. Existing fills will remain in the Sheets but will no longer be accessible."
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
