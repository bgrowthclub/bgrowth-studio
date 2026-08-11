import type { LegacyFlatPlannerConfig } from '../types';
import { newId } from '../types';

// Phase 1: templates are still authored in the legacy flat blocks[] shape
// (see LegacyFlatPlannerConfig's own doc comment) — normalized into the
// canonical sections[] shape once, in ../configs/templates.ts, so every
// consumer of PLANNER_TEMPLATES already receives a real PlannerConfig.
export const businessStartupPlanner: LegacyFlatPlannerConfig = {
  id: 'template-business-startup',
  isTemplate: true,
  templateName: 'Business Startup Planner',
  publishStatus: 'published',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  uses: 0,
  settings: {
    name: 'Business Startup Planner',
    description: 'A complete planner to help you launch and grow your business from idea to success.',
    coverImage: null,
    icon: '🚀',
    primaryColor: '#1061EC',
    accentColor: '#0B1D3A',
    category: 'Business',
    difficulty: 'Beginner',
    language: 'English',
    author: 'BGrowth Studio',
    tags: ['business', 'startup', 'entrepreneur', 'launch'],
    estimatedDuration: '30 minutes/day',
    pageSize: 'A4',
    pageOrientation: 'portrait',
    exportPdf: true,
    exportPrint: true,
    allowShare: true,
    version: '1.0',
  },
  blocks: [
    {
      id: newId(), title: 'Business Vision', description: 'Define your business vision and mission',
      icon: '🎯', color: '#1061EC', enabled: true,
      config: {
        type: 'goals',
        goals: [
          { id: newId(), label: 'My Business Vision', placeholder: 'What does success look like in 5 years?' },
          { id: newId(), label: 'Mission Statement', placeholder: 'Why does your business exist?' },
          { id: newId(), label: 'Core Values', placeholder: 'What principles guide your business?' },
        ],
        showProgress: false,
        showDeadline: false,
      },
    },
    {
      id: newId(), title: 'Launch Checklist', description: 'Essential steps to launch your business',
      icon: '✅', color: '#059669', enabled: true,
      config: {
        type: 'checklist',
        items: [
          { id: newId(), label: 'Register business name', required: true },
          { id: newId(), label: 'Open business bank account', required: true },
          { id: newId(), label: 'Set up website/social media', required: true },
          { id: newId(), label: 'Get business insurance', required: false },
          { id: newId(), label: 'Create pricing structure', required: true },
          { id: newId(), label: 'Set up payment processing', required: true },
          { id: newId(), label: 'Create service agreements', required: false },
          { id: newId(), label: 'Launch marketing campaign', required: false },
        ],
        allowAddItems: true,
      },
    },
    {
      id: newId(), title: '90-Day Milestones', description: 'Your key milestones for the first 90 days',
      icon: '📌', color: '#7C3AED', enabled: true,
      config: {
        type: 'milestones',
        milestones: [
          { id: newId(), label: 'Day 30 Goal', placeholder: 'What will you achieve in the first month?' },
          { id: newId(), label: 'Day 60 Goal', placeholder: 'What will you achieve by month 2?' },
          { id: newId(), label: 'Day 90 Goal', placeholder: 'What will you achieve by month 3?' },
        ],
        showDate: true,
        showStatus: true,
      },
    },
    {
      id: newId(), title: 'Weekly Progress', description: 'Track your daily business habits',
      icon: '📊', color: '#D97706', enabled: true,
      config: {
        type: 'progress',
        habits: [
          { id: newId(), label: 'Follow up with leads', color: '#1061EC' },
          { id: newId(), label: 'Post on social media', color: '#7C3AED' },
          { id: newId(), label: 'Review finances', color: '#059669' },
          { id: newId(), label: 'Client outreach', color: '#DC2626' },
        ],
        trackingPeriod: 'daily',
        days: 30,
      },
    },
    {
      id: newId(), title: 'Strategy Notes', description: 'Your business strategy and ideas',
      icon: '📝', color: '#475569', enabled: true,
      config: {
        type: 'notes',
        placeholder: 'Write your business strategy, ideas, and action plans here...',
        maxLength: 3000,
        lineRuled: true,
      },
    },
    {
      id: newId(), title: 'Key Resources', description: 'Important tools, links and contacts',
      icon: '📎', color: '#CA8A04', enabled: true,
      config: {
        type: 'resources',
        resources: [
          { id: newId(), label: 'Business Registration', url: 'https://www.sos.ca.gov' },
          { id: newId(), label: 'IRS Small Business', url: 'https://www.irs.gov/businesses/small-businesses-self-employed' },
          { id: newId(), label: 'SCORE Mentorship', url: 'https://www.score.org' },
        ],
        allowAddItems: true,
      },
    },
  ],
};
