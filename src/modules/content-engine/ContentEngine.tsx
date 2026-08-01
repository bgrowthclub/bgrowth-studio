import { useState } from 'react';
import { Megaphone, LayoutList, CalendarDays, Palette, Menu, X, ArrowLeft } from 'lucide-react';
import { CampaignsView } from './views/CampaignsView';
import { CampaignDetailView } from './views/CampaignDetailView';
import { ContentLibraryView } from './views/ContentLibraryView';
import { CalendarView } from './views/CalendarView';
import { BrandProfileView } from './views/BrandProfileView';

type Tab = 'campaigns' | 'library' | 'calendar' | 'brand';
type View = { mode: 'list' } | { mode: 'campaign'; campaignId: string };

interface ContentEngineProps {
  ownerEmail: string;
  onHome?: () => void;
}

const NAV_ITEMS: { id: Tab; label: string; icon: typeof Megaphone }[] = [
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'library', label: 'Content Library', icon: LayoutList },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'brand', label: 'Brand Profile', icon: Palette },
];

const TAB_TITLES: Record<Tab, string> = {
  campaigns: 'Campaigns',
  library: 'Content Library',
  calendar: 'Publishing Calendar',
  brand: 'Brand Profile',
};

/**
 * BGrowth Content Engine — internal, admin-only marketing module. Always
 * rendered from inside RequireAdmin (see App.tsx), so every read/write here
 * can assume an authenticated Studio admin. Follows the same
 * sidebar-tabs-plus-detail-view shell KnowledgeEngine already established.
 */
export function ContentEngine({ ownerEmail, onHome }: ContentEngineProps) {
  const [tab, setTab] = useState<Tab>('campaigns');
  const [view, setView] = useState<View>({ mode: 'list' });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const openCampaign = (campaignId: string) => setView({ mode: 'campaign', campaignId });
  const backToList = () => setView({ mode: 'list' });

  return (
    <div className="flex h-screen bg-[#f4f6fb] overflow-hidden font-sans">
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-navy-900/40 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 border-r border-navy-100 bg-white flex flex-col shrink-0 transition-transform duration-300 lg:static lg:translate-x-0 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-navy-100 px-4 py-4">
          <button
            type="button"
            onClick={() => {
              onHome?.();
              setMobileSidebarOpen(false);
            }}
            className="flex items-center gap-2 hover:opacity-80"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
              <Megaphone className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-black text-navy-900 uppercase tracking-wide leading-none">Content</p>
              <p className="text-[9px] text-navy-400 uppercase tracking-widest font-bold">Engine</p>
            </div>
          </button>
          <button type="button" onClick={() => setMobileSidebarOpen(false)} className="lg:hidden text-navy-400 hover:text-navy-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = tab === item.id && view.mode === 'list';
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTab(item.id);
                  backToList();
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-all ${isActive ? 'bg-brand text-white' : 'text-navy-500 hover:bg-navy-50 hover:text-navy-800'}`}
              >
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

      <main className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-navy-100 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMobileSidebarOpen(true)} className="lg:hidden p-2 text-navy-500 hover:text-navy-800 rounded-lg">
              <Menu className="h-5 w-5" />
            </button>
            {view.mode !== 'list' && (
              <button type="button" onClick={backToList} className="flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">BGrowth Studio</p>
              <h1 className="text-sm font-extrabold text-navy-900">{view.mode === 'campaign' ? 'Campaign' : TAB_TITLES[tab]}</h1>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {view.mode === 'campaign' ? (
            <CampaignDetailView campaignId={view.campaignId} onBack={backToList} />
          ) : (
            <>
              {tab === 'campaigns' && <CampaignsView onOpenCampaign={openCampaign} />}
              {tab === 'library' && <ContentLibraryView onOpenCampaign={openCampaign} />}
              {tab === 'calendar' && <CalendarView onOpenCampaign={openCampaign} />}
              {tab === 'brand' && <BrandProfileView />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
