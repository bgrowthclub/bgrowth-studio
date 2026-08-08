import { useEffect, useState } from 'react';
import { BookOpen, LayoutList, Users, Menu, X, ArrowLeft } from 'lucide-react';
import { Dashboard } from './Dashboard';
import { Library } from './Library';
import { AssetEditor } from './AssetEditor';
import { Preview } from './Preview';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Toast } from '../../components/Toast';
import type { KnowledgeItem, ContentType } from './types';
import { MOCK_AUTHORS } from './mockData';
import { createKnowledgeItem, deleteKnowledgeItem, fetchKnowledgeItems, updateKnowledgeItem } from './api/knowledgeEngineClient';

type Tab = 'dashboard' | 'library' | 'authors';
type View = { mode: 'list' } | { mode: 'edit'; id: string } | { mode: 'preview'; id: string };

function createBlankItem(contentType: ContentType = 'Article'): Omit<KnowledgeItem, 'id' | 'lastUpdated'> {
  return {
    title: '',
    slug: '',
    excerpt: '',
    featuredImage: '',
    contentType,
    category: '',
    industry: '',
    language: 'en',
    difficulty: 'Beginner',
    readingTime: '5 min read',
    tags: [],
    authorId: 'author-1',
    seo: { title: '', metaDescription: '', canonicalUrl: '', ogImage: '', schemaType: 'Article', index: true, follow: true },
    blocks: [],
    attachments: [],
    relatedContent: [],
    featuredOptions: { featured: false, featuredOnHomepage: false, featuredOnCategory: false, trending: false, editorsPick: false },
    publishing: { slug: '', status: 'Draft', visibility: 'Public', publishDate: '', scheduleDate: '', futureWebsiteUrl: '', publicationNotes: '' },
  };
}

interface KnowledgeEngineProps {
  ownerEmail: string;
  onHome?: () => void;
}

export function KnowledgeEngine({ ownerEmail, onHome }: KnowledgeEngineProps) {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  const [tab, setTab] = useState<Tab>('dashboard');
  const [view, setView] = useState<View>({ mode: 'list' });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    window.setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  };

  const loadItems = () => {
    setIsLoadingItems(true);
    setLoadError(null);
    fetchKnowledgeItems()
      .then(setItems)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load knowledge assets.'))
      .finally(() => setIsLoadingItems(false));
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleNew = async (templateType?: string) => {
    try {
      const created = await createKnowledgeItem(createBlankItem((templateType as ContentType) || 'Article'));
      setItems((prev) => [created, ...prev]);
      setView({ mode: 'edit', id: created.id });
      setTab('library');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create a new asset.');
    }
  };

  const handleSave = async (updated: KnowledgeItem) => {
    if (isSaving) return;
    setSaveError(null);
    setIsSaving(true);
    try {
      const saved = await updateKnowledgeItem(updated);
      setItems((prev) => prev.map((i) => (i.id === saved.id ? saved : i)));
      setView({ mode: 'list' });
      showToast('Saved');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    const id = deleteTarget;
    if (!id) return;
    setDeleteTarget(null);
    try {
      await deleteKnowledgeItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      showToast('Asset deleted');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete.');
    }
  };

  const activeItem = view.mode !== 'list' ? items.find(i => i.id === view.id) : null;

  const navItems = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: BookOpen },
    { id: 'library' as Tab, label: 'Content Library', icon: LayoutList },
    { id: 'authors' as Tab, label: 'Authors', icon: Users },
  ];

  return (
    <div className="flex h-screen bg-[#f4f6fb] overflow-hidden font-sans">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-navy-900/40 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 border-r border-navy-100 bg-white flex flex-col shrink-0 transition-transform duration-300 lg:static lg:translate-x-0 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-navy-100 px-4 py-4">
          <button type="button" onClick={() => { onHome?.(); setMobileSidebarOpen(false); }} className="flex items-center gap-2 hover:opacity-80">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-black text-navy-900 uppercase tracking-wide leading-none">Knowledge</p>
              <p className="text-[9px] text-navy-400 uppercase tracking-widest font-bold">Engine</p>
            </div>
          </button>
          <button type="button" onClick={() => setMobileSidebarOpen(false)} className="lg:hidden text-navy-400 hover:text-navy-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = tab === item.id && view.mode === 'list';
            return (
              <button key={item.id} type="button"
                onClick={() => { setTab(item.id); setView({ mode: 'list' }); setMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-all ${isActive ? 'bg-brand text-white' : 'text-navy-500 hover:bg-navy-50 hover:text-navy-800'}`}>
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-navy-100 px-4 py-3 text-center">
          <p className="text-[10px] text-navy-400 font-semibold truncate">{ownerEmail}</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-navy-100 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMobileSidebarOpen(true)} className="lg:hidden p-2 text-navy-500 hover:text-navy-800 rounded-lg">
              <Menu className="h-5 w-5" />
            </button>
            {view.mode !== 'list' && (
              <button type="button" onClick={() => setView({ mode: 'list' })} className="flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">BGrowth Studio</p>
              <h1 className="text-sm font-extrabold text-navy-900">
                {view.mode === 'edit' ? (activeItem?.title || 'New Asset') : view.mode === 'preview' ? 'Preview' : tab === 'dashboard' ? 'Knowledge Dashboard' : tab === 'library' ? 'Content Library' : 'Authors'}
              </h1>
            </div>
          </div>
          {view.mode === 'list' && tab === 'library' && (
            <button type="button" onClick={() => handleNew()}
              className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-600">
              + New Asset
            </button>
          )}
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {view.mode === 'edit' && activeItem ? (
            <>
              {saveError && (
                <div className="no-print mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 sm:mx-6">
                  {saveError}
                </div>
              )}
              <AssetEditor
                item={activeItem}
                onSave={handleSave}
                onPreview={() => setView({ mode: 'preview', id: activeItem.id })}
                onBack={() => setView({ mode: 'list' })}
              />
            </>
          ) : view.mode === 'preview' && activeItem ? (
            <Preview item={activeItem} />
          ) : (
            <div className="p-4 sm:p-6">
              {isLoadingItems ? (
                <div className="rounded-2xl border border-dashed border-navy-200 py-16 text-center">
                  <p className="text-sm font-semibold text-navy-500">Loading knowledge assets…</p>
                </div>
              ) : loadError ? (
                <div className="rounded-2xl border border-dashed border-red-200 bg-red-50/40 py-16 text-center">
                  <p className="text-sm font-semibold text-red-700">{loadError}</p>
                  <button type="button" onClick={loadItems} className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  {tab === 'dashboard' && (
                    <Dashboard
                      items={items}
                      onNew={handleNew}
                      onSelectTab={(t) => { setTab(t as Tab); setView({ mode: 'list' }); }}
                      onEdit={(id) => setView({ mode: 'edit', id })}
                    />
                  )}
                  {tab === 'library' && (
                    <Library
                      items={items}
                      onNew={() => handleNew()}
                      onEdit={(id) => setView({ mode: 'edit', id })}
                      onPreview={(id) => setView({ mode: 'preview', id })}
                      onDelete={handleDelete}
                    />
                  )}
                  {tab === 'authors' && (
                    <div className="space-y-4">
                      <p className="text-sm font-bold text-navy-800">Authors ({MOCK_AUTHORS.length})</p>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {MOCK_AUTHORS.map(author => (
                          <div key={author.id} className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card text-center">
                            <img src={author.avatar} alt={author.name} className="h-16 w-16 rounded-full mx-auto object-cover border-2 border-slate-100 shadow-sm" />
                            <h3 className="mt-3 text-sm font-extrabold text-navy-800">{author.name}</h3>
                            <p className="text-xs text-brand-600 font-semibold">{author.role}</p>
                            <span className="mt-2 inline-block rounded-full bg-navy-50 px-2 py-0.5 text-[10px] font-bold text-navy-500">{author.type}</span>
                            <p className="mt-2 text-xs leading-relaxed text-navy-400">{author.bio}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this asset?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
