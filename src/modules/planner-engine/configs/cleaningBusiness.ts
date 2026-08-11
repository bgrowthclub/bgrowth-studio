import type { LegacyFlatPlannerConfig } from '../types';
import { newId } from '../types';

// Phase 1: templates are still authored in the legacy flat blocks[] shape
// (see LegacyFlatPlannerConfig's own doc comment) — normalized into the
// canonical sections[] shape once, in ../configs/templates.ts, so every
// consumer of PLANNER_TEMPLATES already receives a real PlannerConfig.
export const cleaningBusinessPlanner: LegacyFlatPlannerConfig = {
  id: 'template-cleaning-business',
  isTemplate: true,
  templateName: 'Cleaning Business Planner',
  publishStatus: 'published',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  uses: 0,
  settings: {
    name: 'Cleaning Business Planner',
    description: 'Manage and grow your cleaning business efficiently.',
    coverImage: null,
    icon: '🧹',
    primaryColor: '#0EA5A0',
    accentColor: '#042F2E',
    category: 'Business',
    difficulty: 'Beginner',
    language: 'English',
    author: 'BGrowth Studio',
    tags: ['cleaning', 'business', 'service', 'management'],
    estimatedDuration: '20 minutes/day',
    pageSize: 'A4',
    pageOrientation: 'portrait',
    exportPdf: true,
    exportPrint: true,
    allowShare: true,
    version: '1.0',
  },
  blocks: [
    {
      id: newId(), title: 'Monthly Goals', description: 'Set your monthly business targets',
      icon: '🎯', color: '#0EA5A0', enabled: true,
      config: {
        type: 'goals',
        goals: [
          { id: newId(), label: 'Revenue Goal', placeholder: 'Target monthly revenue ($)' },
          { id: newId(), label: 'New Clients Goal', placeholder: 'How many new clients this month?' },
          { id: newId(), label: 'Jobs Completed', placeholder: 'Total jobs to complete' },
          { id: newId(), label: 'Team Goal', placeholder: 'Team performance or hiring goal' },
        ],
        showProgress: true,
        showDeadline: false,
      },
    },
    {
      id: newId(), title: 'Job Schedule', description: 'Plan your monthly job schedule',
      icon: '📅', color: '#1061EC', enabled: true,
      config: { type: 'calendar', view: 'monthly', showWeekNumbers: false },
    },
    {
      id: newId(), title: 'Daily Operations Checklist', description: 'Daily tasks to run your business',
      icon: '✅', color: '#059669', enabled: true,
      config: {
        type: 'checklist',
        items: [
          { id: newId(), label: 'Confirm all appointments', required: true },
          { id: newId(), label: 'Check supply inventory', required: true },
          { id: newId(), label: 'Assign team to jobs', required: true },
          { id: newId(), label: 'Follow up with clients', required: false },
          { id: newId(), label: 'Send invoices', required: true },
          { id: newId(), label: 'Record expenses', required: true },
          { id: newId(), label: 'Post on social media', required: false },
          { id: newId(), label: 'Review reviews/feedback', required: false },
        ],
        allowAddItems: true,
      },
    },
    {
      id: newId(), title: 'Growth Milestones', description: 'Your business growth milestones',
      icon: '📌', color: '#7C3AED', enabled: true,
      config: {
        type: 'milestones',
        milestones: [
          { id: newId(), label: 'First $5,000 Month', placeholder: 'When will you hit $5K/month?' },
          { id: newId(), label: 'First Employee Hired', placeholder: 'When will you hire your first employee?' },
          { id: newId(), label: 'First $10,000 Month', placeholder: 'Target date for $10K/month' },
          { id: newId(), label: 'Expand Service Area', placeholder: 'When will you expand?' },
        ],
        showDate: true,
        showStatus: true,
      },
    },
    {
      id: newId(), title: 'Business Notes', description: 'Ideas, strategies and observations',
      icon: '📝', color: '#475569', enabled: true,
      config: { type: 'notes', placeholder: 'Client feedback, business ideas, process improvements...', maxLength: 2000, lineRuled: true },
    },
  ],
};
