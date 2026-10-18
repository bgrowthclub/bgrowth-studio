import { BookOpen, CheckCircle, Clock, FileText, Plus, ArrowRight, TrendingUp, Users, Grid } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { KnowledgeItem } from './types';

const CREATION_TREND = [
  { date: 'Jul 10', Articles: 5, Guides: 2, FAQs: 1, total: 8 },
  { date: 'Jul 11', Articles: 6, Guides: 3, FAQs: 1, total: 10 },
  { date: 'Jul 12', Articles: 8, Guides: 3, FAQs: 2, total: 13 },
  { date: 'Jul 13', Articles: 9, Guides: 4, FAQs: 2, total: 15 },
  { date: 'Jul 14', Articles: 12, Guides: 6, FAQs: 3, total: 21 },
  { date: 'Jul 15', Articles: 15, Guides: 8, FAQs: 4, total: 27 },
];

const CONTENT_COLORS = ['#1061EC', '#0EA5A0', '#F59E0B', '#7C3AED', '#EC4899'];

interface DashboardProps {
  items: KnowledgeItem[];
  onNew: (templateType?: string) => void;
  onSelectTab: (tab: string) => void;
  onEdit: (id: string) => void;
}

export function Dashboard({ items, onNew, onSelectTab, onEdit }: DashboardProps) {
  const totalCount = items.length;
  const publishedCount = items.filter(i => i.publishing.status === 'Published').length;
  const draftCount = items.filter(i => i.publishing.status === 'Draft' || i.publishing.status === 'In Review').length;
  const scheduledCount = items.filter(i => i.publishing.status === 'Scheduled' || i.publishing.status === 'Approved').length;

  const typeBreakdown = items.reduce((acc: Record<string, number>, curr) => {
    acc[curr.contentType] = (acc[curr.contentType] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(typeBreakdown).map(([name, value]) => ({ name, value }));

  const recentlyUpdated = [...items]
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy-900 via-[#1E293B] to-[#111827] p-6 text-white shadow-md">
        <div className="relative z-10 max-w-xl">
          <span className="rounded-full bg-blue-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-400">Knowledge Hub</span>
          <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">Education as a Customer Acquisition Flywheel</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Publish top-tier articles, tutorials, FAQs, and product resources. Everything created here maps directly to the BGrowth Knowledge portal.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => onNew('Article')} className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700">
              <Plus className="h-4 w-4" /> New Article
            </button>
            <button onClick={() => onSelectTab('library')} className="flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white border border-white/10 hover:bg-white/20">
              Manage Library <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-10 right-20 h-40 w-40 rounded-full bg-teal-500/10 blur-3xl" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Resources', value: totalCount, icon: BookOpen, color: 'bg-blue-50 text-blue-600' },
          { label: 'Published', value: publishedCount, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Drafts & Reviews', value: draftCount, icon: Clock, color: 'bg-amber-50 text-amber-600' },
          { label: 'Approved / scheduled', value: scheduledCount, icon: Users, color: 'bg-purple-50 text-purple-600' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-navy-400">{stat.label}</p>
              <p className="mt-1 text-2xl font-extrabold text-navy-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-navy-50 pb-4">
            <div>
              <h3 className="text-base font-bold text-navy-900">Knowledge Growth Analytics</h3>
              <p className="text-xs text-navy-400">Content published over time</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" /> +28% MoM
            </span>
          </div>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CREATION_TREND} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorKnowledgeTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1061EC" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#1061EC" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="total" stroke="#1061EC" strokeWidth={2} fillOpacity={1} fill="url(#colorKnowledgeTotal)" name="Total" />
                <Area type="monotone" dataKey="Articles" stroke="#0EA5A0" strokeWidth={1.5} fillOpacity={0} name="Articles" />
                <Area type="monotone" dataKey="Guides" stroke="#F59E0B" strokeWidth={1.5} fillOpacity={0} name="Guides" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
          <h3 className="text-base font-bold text-navy-900">Content-Type Breakdown</h3>
          <p className="text-xs text-navy-400">Mix of assets in your library</p>
          {pieData.length > 0 ? (
            <div className="mt-4 flex flex-col items-center">
              <div className="relative h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CONTENT_COLORS[index % CONTENT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold text-navy-900">{totalCount}</span>
                  <span className="text-[10px] uppercase font-bold text-navy-400">Assets</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-navy-600">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CONTENT_COLORS[index % CONTENT_COLORS.length] }} />
                    <span className="truncate max-w-[100px]">{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-10 flex flex-col items-center text-center text-navy-300">
              <Grid className="h-10 w-10 stroke-1" />
              <p className="mt-2 text-xs">No content yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent + Templates */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card flex flex-col">
          <div className="flex items-center justify-between border-b border-navy-50 pb-3">
            <h3 className="text-base font-bold text-navy-900">Recently Updated</h3>
            <button onClick={() => onSelectTab('library')} className="text-xs font-bold text-brand-600 hover:underline">See all</button>
          </div>
          <div className="mt-3 divide-y divide-slate-100 flex-1">
            {recentlyUpdated.map((item) => (
              <div key={item.id} className="group py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-navy-500">{item.contentType}</span>
                    <span className="text-xs text-navy-400">{item.lastUpdated}</span>
                  </div>
                  <h4 className="mt-1 truncate text-sm font-bold text-navy-800 group-hover:text-brand-600">{item.title}</h4>
                  <p className="text-xs text-navy-400 truncate mt-0.5">{item.excerpt}</p>
                </div>
                <button onClick={() => onEdit(item.id)} className="rounded-lg border border-navy-100 bg-white p-1.5 text-navy-400 hover:border-brand-500 hover:text-brand-600">
                  <FileText className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
          <h3 className="text-base font-bold text-navy-900">Quick Start Templates</h3>
          <p className="text-xs text-navy-400 mb-4">Choose a preset to speed up publishing</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { type: 'Article', desc: 'Standard informative write-up', color: 'hover:border-blue-500 hover:bg-blue-50/30' },
              { type: 'Guide', desc: 'In-depth pillar document', color: 'hover:border-teal-500 hover:bg-teal-50/30' },
              { type: 'Tutorial', desc: 'How-to with steps', color: 'hover:border-amber-500 hover:bg-amber-50/30' },
              { type: 'FAQ', desc: 'Structured Q&A', color: 'hover:border-indigo-500 hover:bg-indigo-50/30' },
              { type: 'Release Notes', desc: 'Product changelog', color: 'hover:border-pink-500 hover:bg-pink-50/30' },
              { type: 'Resource', desc: 'Asset with downloads', color: 'hover:border-emerald-500 hover:bg-emerald-50/30' },
            ].map((t) => (
              <button key={t.type} onClick={() => onNew(t.type)} className={`flex flex-col rounded-xl border border-navy-50 bg-white p-3 text-left transition-all shadow-sm ${t.color}`}>
                <span className="text-xs font-bold text-navy-800">{t.type}</span>
                <span className="mt-0.5 text-[10px] text-navy-400 leading-snug">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
