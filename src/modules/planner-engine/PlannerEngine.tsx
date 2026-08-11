import { useState, useEffect } from 'react';
import {
  BookOpen, Star, Trash2, Plus,
  Layers, Link, Check,
  Copy, Edit2, Eye, Download, Upload
} from 'lucide-react';
import { PlannerBuilder } from './PlannerBuilder';
import { PlannerFill } from './PlannerFill';
import {
  loadPlanners, savePlanners, emptyPlanner, normalizePlanner,
  type PlannerConfig,
} from './types';
import { PLANNER_TEMPLATES } from './configs/templates';
import { cn } from '../../lib/utils';
import { Toast } from '../../components/Toast';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { gasGetPlanners, gasSavePlanners } from '../../lib/studioSync';
import { ImportPlannerJsonModal } from './ImportPlannerJsonModal';
import { applyBrandTheme } from '../../engine/theme';

type SidebarView = 'my-planners' | 'templates' | 'favorites' | 'trash';
type ActiveScreen = 'list' | 'builder' | 'fill';

interface PlannerEngineProps {
  ownerEmail: string;
  initialPlannerId?: string;
  /**
   * True only for the public ?planner=ID route (see App.tsx). Renders
   * exclusively the Fill experience for that one planner — never the
   * Sidebar/Toolbar/list/builder — and never gives a public visitor a
   * path back into any Studio navigation (PlannerFill's Back button is
   * hidden by omitting onBack). Also applies the planner's own branding
   * via applyBrandTheme(), instead of Studio's own default brand.
   */
  isPublic?: boolean;
}

export function PlannerEngine({ ownerEmail, initialPlannerId, isPublic }: PlannerEngineProps) {
  const [planners, setPlanners] = useState<PlannerConfig[]>(() => loadPlanners());
  const [isLoadingPublicPlanner, setIsLoadingPublicPlanner] = useState(!!isPublic);

  // Load from GAS on mount
  useEffect(() => {
    gasGetPlanners(ownerEmail || 'benterprisesusa@gmail.com').then(gasPlanners => {
      if (gasPlanners.length > 0) {
        const normalized = gasPlanners.map(normalizePlanner);
        setPlanners(normalized);
        savePlanners(normalized);
      }
    }).finally(() => setIsLoadingPublicPlanner(false));
  }, [ownerEmail]);

  const [sidebarView, setSidebarView] = useState<SidebarView>('my-planners');
  const [screen, setScreen] = useState<ActiveScreen>(() => initialPlannerId ? 'fill' : 'list');
  const [activePlanner, setActivePlanner] = useState<PlannerConfig | null>(
    () => initialPlannerId ? loadPlanners().find(p => p.id === initialPlannerId) ?? null : null
  );

  // Set activePlanner once fetched from GAS if it wasn't found in localStorage initially
  useEffect(() => {
    if (initialPlannerId && !activePlanner && planners.length > 0) {
      const found = planners.find(p => p.id === initialPlannerId);
      if (found) {
        setActivePlanner(found);
      }
    }
  }, [planners, initialPlannerId, activePlanner]);

  // Public route branding: the planner's own primaryColor, not Studio's
  // default brand. Reuses the existing applyBrandTheme() infrastructure
  // (already used by Checklist's own public route) — no new branding
  // system introduced.
  useEffect(() => {
    if (isPublic && activePlanner) {
      applyBrandTheme(activePlanner.settings.primaryColor);
      document.title = `${activePlanner.settings.name} | BGrowth`;
    }
  }, [isPublic, activePlanner]);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [showJsonImportModal, setShowJsonImportModal] = useState(false);

  const showToast = (msg: string) => {
    setToast({ message: msg, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2200);
  };

  const handleImportPlanner = (plannerData: any) => {
    // normalizePlanner() handles both a flat legacy blocks[] JSON export
    // and an already-canonical sections[] export — either way, the
    // imported planner joins `planners` already in the canonical shape.
    const imported = normalizePlanner({
      ...plannerData,
      id: `p-${Date.now()}`,
      isTemplate: false,
    });
    const updated = [imported, ...planners];
    setPlanners(updated);
    savePlanners(updated);
    gasSavePlanners(ownerEmail || 'benterprisesusa@gmail.com', updated);
    showToast('Planner importado com sucesso! 🎉');
  };

  const handleExportPlanner = (e: React.MouseEvent, p: PlannerConfig) => {
    e.stopPropagation();
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(p, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${p.settings.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-planner.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('JSON exportado! 📥');
    } catch {
      showToast('Erro ao exportar o planejador.');
    }
  };

  const savePlanner = (planner: PlannerConfig) => {
    const updated = planners.some(p => p.id === planner.id)
      ? planners.map(p => p.id === planner.id ? planner : p)
      : [...planners, planner];
    setPlanners(updated);
    savePlanners(updated);
    gasSavePlanners(ownerEmail || 'benterprisesusa@gmail.com', updated);
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetId) return;
    const updated = planners.filter(p => p.id !== deleteTargetId);
    setPlanners(updated);
    savePlanners(updated);
    gasSavePlanners(ownerEmail || 'benterprisesusa@gmail.com', updated);
    setDeleteTargetId(null);
    showToast('Planner deleted');
  };

  const handleNew = () => {
    setActivePlanner(emptyPlanner());
    setScreen('builder');
  };

  const handleFromTemplate = (template: PlannerConfig) => {
    const newPlanner: PlannerConfig = {
      ...template,
      id: `planner-${Date.now()}`,
      isTemplate: false,
      settings: { ...template.settings, name: `${template.settings.name} (Copy)` },
      publishStatus: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      uses: 0,
    };
    setActivePlanner(newPlanner);
    setScreen('builder');
    setSidebarView('my-planners');
  };

  const handleEdit = (planner: PlannerConfig) => {
    setActivePlanner(planner);
    setScreen('builder');
  };

  const handleFill = (planner: PlannerConfig) => {
    setActivePlanner(planner);
    setScreen('fill');
  };

  const handleCopyLink = (id: string) => {
    const emailToUse = ownerEmail || 'benterprisesusa@gmail.com';
    const url = `${window.location.origin}/?planner=${id}&owner=${encodeURIComponent(emailToUse)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      showToast('Link copied!');
    });
  };

  const handleSaveFromBuilder = (planner: PlannerConfig) => {
    savePlanner(planner);
    setScreen('list');
    showToast('Planner saved ✓');
  };

  // ---- Public planner route (?planner=ID) ----
  // Isolated from every other branch below: a public visitor never sees
  // the Sidebar, Toolbar, "My Planners"/Templates/Favorites/Trash list,
  // or the Builder — only the Fill experience for this one planner, with
  // no path back into any of that (PlannerFill's Back button is hidden
  // by omitting onBack). Returning early here, before the normal
  // list/builder/fill screen switch, is what fixes the previous bug
  // where clicking "Back" from a public planner could land on the full
  // Studio planner dashboard.
  if (isPublic) {
    if (!activePlanner) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#f4f6fb] text-center">
          {isLoadingPublicPlanner ? (
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          ) : (
            <>
              <p className="text-lg font-bold text-navy-800">Planner not found</p>
              <p className="text-sm text-navy-400">This link may be invalid or the planner is no longer available.</p>
            </>
          )}
        </div>
      );
    }
    return <PlannerFill planner={activePlanner} />;
  }

  // ---- Builder screen ----
  if (screen === 'builder' && activePlanner) {
    return (
      <PlannerBuilder
        planner={activePlanner}
        onSave={handleSaveFromBuilder}
        onBack={() => setScreen('list')}
        onPreview={() => { savePlanner(activePlanner); setScreen('fill'); }}
      />
    );
  }

  // ---- Fill screen ----
  if (screen === 'fill' && activePlanner) {
    return (
      <PlannerFill
        planner={activePlanner}
        onBack={() => setScreen('list')}
      />
    );
  }

  // ---- List screen ----
  const displayedPlanners = sidebarView === 'my-planners'
    ? planners.filter(p => !p.isTemplate)
    : sidebarView === 'favorites'
    ? []
    : [];

  const SIDEBAR = [
    { id: 'my-planners' as SidebarView, icon: <BookOpen className="h-4 w-4" />, label: 'My Planners' },
    { id: 'templates' as SidebarView, icon: <Layers className="h-4 w-4" />, label: 'Templates' },
    { id: 'favorites' as SidebarView, icon: <Star className="h-4 w-4" />, label: 'Favorites' },
    { id: 'trash' as SidebarView, icon: <Trash2 className="h-4 w-4" />, label: 'Trash' },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-navy-100 bg-white">
        <div className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-navy-400">Planner Dashboard</p>
        </div>
        {SIDEBAR.map(item => (
          <button key={item.id} type="button" onClick={() => setSidebarView(item.id)}
            className={cn('flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors',
              sidebarView === item.id
                ? 'border-l-2 border-brand bg-brand-50 text-brand-700'
                : 'text-navy-500 hover:bg-navy-50 hover:text-navy-800')}>
            {item.icon} {item.label}
          </button>
        ))}

        <div className="mt-4 border-t border-navy-100 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-navy-400">Actions</p>
        </div>
        <button type="button" onClick={handleNew}
          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-navy-500 hover:bg-navy-50 hover:text-navy-800">
          <Plus className="h-4 w-4" /> Create New Planner
        </button>

        <div className="mx-3 mt-auto mb-4 rounded-xl border border-brand-100 bg-brand-50 p-3">
          <p className="text-xs font-semibold text-navy-800">Need Help?</p>
          <p className="mt-1 text-[11px] text-navy-500">Learn how to create powerful planners that get results.</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-navy-100 bg-white px-6 py-3">
          <div>
            <h1 className="text-xl font-bold text-navy-900">Planner Engine</h1>
            <p className="text-sm text-navy-400">Create. Customize. Plan. Achieve.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowJsonImportModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-navy-200 px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-50">
              <Upload className="h-4 w-4" /> Importar JSON
            </button>
            <button type="button" onClick={handleNew}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              <Plus className="h-4 w-4" /> Create New Planner
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* My Planners */}
          {sidebarView === 'my-planners' && (
            <>
              <h2 className="mb-1 text-2xl font-extrabold text-navy-900">My Planners</h2>
              <p className="mb-6 text-sm text-navy-400">Design powerful planners for any goal or industry.</p>

              {displayedPlanners.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-navy-200 bg-white py-20 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-4xl">📋</span>
                  <div>
                    <p className="font-semibold text-navy-800">No planners yet</p>
                    <p className="text-sm text-navy-400">Create your first planner or start from a template.</p>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={handleNew}
                      className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
                      <Plus className="h-4 w-4" /> Create New
                    </button>
                    <button type="button" onClick={() => setSidebarView('templates')}
                      className="flex items-center gap-2 rounded-xl border border-navy-200 px-5 py-2.5 text-sm font-semibold text-navy-700 hover:bg-navy-50">
                      <Layers className="h-4 w-4" /> Browse Templates
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {displayedPlanners.map(planner => (
                    <div key={planner.id} className="flex flex-col rounded-2xl border border-navy-100 bg-white shadow-card hover:shadow-cardHover">
                      <div className="flex h-28 items-end rounded-t-2xl p-4"
                        style={{ background: `linear-gradient(135deg, ${planner.settings.primaryColor}, ${planner.settings.accentColor})` }}>
                        <div>
                          <span className="text-2xl">{planner.settings.icon}</span>
                          <h3 className="mt-1 text-sm font-bold text-white">{planner.settings.name || 'Untitled'}</h3>
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <p className="text-xs text-navy-400 line-clamp-2">{planner.settings.description || 'No description'}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">{planner.settings.category}</span>
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium',
                            planner.publishStatus === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-navy-100 text-navy-500')}>
                            {planner.publishStatus === 'published' ? '● Published' : '○ Draft'}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center gap-1.5">
                          <button type="button" onClick={() => handleFill(planner)}
                            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand px-2 py-1.5 text-xs font-semibold text-white hover:bg-brand-600">
                            <Eye className="h-3.5 w-3.5" /> Open
                          </button>
                          <button type="button" onClick={() => handleEdit(planner)} title="Edit"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-navy-100 text-navy-400 hover:border-brand hover:text-brand">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={(e) => handleExportPlanner(e, planner)} title="Exportar JSON"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-navy-100 text-navy-400 hover:border-brand hover:text-brand">
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => handleCopyLink(planner.id)} title="Copy link"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-navy-100 text-navy-400 hover:border-brand hover:text-brand">
                            {copiedId === planner.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Link className="h-3.5 w-3.5" />}
                          </button>
                          <button type="button" onClick={() => setDeleteTargetId(planner.id)} title="Delete"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-navy-100 text-navy-400 hover:border-red-200 hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Templates */}
          {sidebarView === 'templates' && (
            <>
              <h2 className="mb-1 text-2xl font-extrabold text-navy-900">Planner Templates</h2>
              <p className="mb-6 text-sm text-navy-400">Start with a ready-made template and customize it for your audience.</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {PLANNER_TEMPLATES.map(template => (
                  <div key={template.id} className="flex flex-col rounded-2xl border border-navy-100 bg-white shadow-card hover:shadow-cardHover">
                    <div className="flex h-24 items-end rounded-t-2xl p-4"
                      style={{ background: `linear-gradient(135deg, ${template.settings.primaryColor}, ${template.settings.accentColor})` }}>
                      <div>
                        <span className="text-2xl">{template.settings.icon}</span>
                        <h3 className="mt-0.5 text-sm font-bold text-white">{template.settings.name}</h3>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <p className="text-xs text-navy-400 line-clamp-2">{template.settings.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">{template.settings.category}</span>
                        <span className="rounded-full bg-navy-100 px-2 py-0.5 text-[10px] text-navy-500">{template.sections.reduce((n, s) => n + s.blocks.length, 0)} blocks</span>
                      </div>
                      <button type="button" onClick={() => handleFromTemplate(template)}
                        className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600">
                        <Copy className="h-3.5 w-3.5" /> Use this template
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Favorites */}
          {sidebarView === 'favorites' && (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <Star className="h-16 w-16 text-navy-200" />
              <p className="font-semibold text-navy-800">No favorites yet</p>
              <p className="text-sm text-navy-400">Star your planners to find them quickly here.</p>
            </div>
          )}

          {/* Trash */}
          {sidebarView === 'trash' && (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <Trash2 className="h-16 w-16 text-navy-200" />
              <p className="font-semibold text-navy-800">Trash is empty</p>
              <p className="text-sm text-navy-400">Deleted planners will appear here.</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="Delete this planner?"
        description="This action cannot be undone. You will lose this planner's layout and configuration."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
      <ImportPlannerJsonModal
        isOpen={showJsonImportModal}
        onClose={() => setShowJsonImportModal(false)}
        onImport={handleImportPlanner}
      />
      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
