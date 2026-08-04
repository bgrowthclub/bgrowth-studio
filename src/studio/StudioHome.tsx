import React from 'react';
import { ClipboardList, BookOpen, FileText, Receipt, ArrowRight, Calculator, Sparkles, Database, Megaphone, KeyRound } from 'lucide-react';
import type { StudioTool } from './types';

const TOOLS: StudioTool[] = [
  {
    id: 'checklist',
    name: 'Checklist Builder',
    description: 'Create guided workflow checklists for any process — notary, cleaning, onboarding, and more.',
    icon: 'checklist',
    color: '#1061EC',
    status: 'live',
  },
  {
    id: 'planner',
    name: 'Planner Engine',
    description: 'Design premium interactive planners for any industry — business, fitness, goals, and more.',
    icon: 'planner',
    color: '#7C3AED',
    status: 'live',
  },
  {
    id: 'calculator',
    name: 'Calculator Engine',
    description: 'Build interactive pricing, profit, ROI and business calculators for any service or industry.',
    icon: 'calculator',
    color: '#0EA5A0',
    status: 'live',
  },
  {
    id: 'ai-builder',
    name: 'AI Product Builder',
    description: 'Describe your product idea and AI will generate a complete digital product blueprint instantly.',
    icon: 'ai-builder',
    color: '#7C3AED',
    status: 'live',
  },
  {
    id: 'product-engine',
    name: 'Product Engine',
    description: 'Transform Builder content into commercial products. Configure pricing, SEO, media and publish.',
    icon: 'product-engine',
    color: '#0F172A',
    status: 'live',
  },
  {
    id: 'form',
    name: 'Form Builder',
    description: 'Build smart forms and surveys with conditional logic and response tracking.',
    icon: 'form',
    color: '#D97706',
    status: 'coming',
  },
  {
    id: 'knowledge-engine',
    name: 'Knowledge Engine',
    description: 'Create and manage articles, guides, tutorials, FAQs and all knowledge assets for the BGrowth platform.',
    icon: 'knowledge-engine',
    color: '#0EA5A0',
    status: 'live',
  },
  {
    id: 'content-engine',
    name: 'Content Engine',
    description: 'Generate on-brand social content for published Workspaces — captions, carousels, scripts and more — and manage them from draft to published.',
    icon: 'content-engine',
    color: '#DB2777',
    status: 'live',
  },
  {
    id: 'access-management',
    name: 'Access Management',
    description: 'Search a member and grant or revoke lifetime or expiring Workspace access — all Workspaces or one specific Workspace.',
    icon: 'access-management',
    color: '#0F172A',
    status: 'live',
  },
];

const ICONS: Record<string, React.ReactNode> = {
  checklist: <ClipboardList className="h-7 w-7" />,
  planner: <BookOpen className="h-7 w-7" />,
  calculator: <Calculator className="h-7 w-7" />,
  'ai-builder': <Sparkles className="h-7 w-7" />,
  form: <FileText className="h-7 w-7" />,
  invoice: <Receipt className="h-7 w-7" />,
  'product-engine': <Database className="h-7 w-7" />,
'knowledge-engine': <BookOpen className="h-7 w-7" />,
  'content-engine': <Megaphone className="h-7 w-7" />,
  'access-management': <KeyRound className="h-7 w-7" />,
};

interface StudioHomeProps {
  ownerEmail: string;
  onSelect: (tool: string) => void;
}

export function StudioHome({ ownerEmail, onSelect }: StudioHomeProps) {
  return (
    <div>
      <div className="border-b border-navy-100 bg-white px-6 py-10 text-center">
        <p className="text-[11px] font-bold uppercase tracking-widest text-brand-600">BGrowth Studio</p>
        <h1 className="mt-2 text-3xl font-extrabold text-navy-900">What would you like to build?</h1>
        <p className="mt-2 text-sm text-navy-400">Choose a tool to get started. More tools coming soon.</p>
      </div>

      <div className="p-6 sm:p-10">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              disabled={tool.status === 'coming'}
              onClick={() => tool.status === 'live' && onSelect(tool.id)}
              className="group relative flex flex-col gap-4 rounded-2xl border border-navy-100 bg-white p-6 text-left shadow-card transition-all hover:shadow-cardHover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {tool.status === 'coming' && (
                <span className="absolute right-4 top-4 rounded-full bg-navy-100 px-2.5 py-0.5 text-[11px] font-semibold text-navy-500">Coming Soon</span>
              )}
              <span className="flex h-14 w-14 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: tool.color }}>
                {ICONS[tool.icon]}
              </span>
              <div className="flex-1">
                <h2 className="text-[17px] font-bold text-navy-900">{tool.name}</h2>
                <p className="mt-1 text-sm leading-relaxed text-navy-400">{tool.description}</p>
              </div>
              {tool.status === 'live' && (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition-all group-hover:gap-2.5">
                  Open {tool.name} <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-navy-100 bg-white px-6 py-4 text-center">
        <p className="text-xs text-navy-400">
          BGrowth Studio™ · Logged in as <span className="font-medium text-navy-600">{ownerEmail}</span>
        </p>
      </div>
    </div>
  );
}