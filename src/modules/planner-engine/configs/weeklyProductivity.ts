import type { LegacyFlatPlannerConfig } from '../types';
import { newId } from '../types';

// Phase 1: templates are still authored in the legacy flat blocks[] shape
// (see LegacyFlatPlannerConfig's own doc comment) — normalized into the
// canonical sections[] shape once, in ../configs/templates.ts, so every
// consumer of PLANNER_TEMPLATES already receives a real PlannerConfig.
export const weeklyProductivityPlanner: LegacyFlatPlannerConfig = {
  id: 'template-weekly-productivity',
  isTemplate: true,
  templateName: 'Weekly Productivity Planner',
  publishStatus: 'published',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  uses: 0,
  settings: {
    name: 'Weekly Productivity Planner',
    description: 'Stay focused, organized and productive every week.',
    coverImage: null,
    icon: '📅',
    primaryColor: '#7C3AED',
    accentColor: '#1E1B4B',
    category: 'Productivity',
    difficulty: 'Beginner',
    language: 'English',
    author: 'BGrowth Studio',
    tags: ['weekly', 'productivity', 'planning', 'organization'],
    estimatedDuration: '15 minutes/day',
    pageSize: 'A4',
    pageOrientation: 'portrait',
    exportPdf: true,
    exportPrint: true,
    allowShare: true,
    version: '1.0',
  },
  blocks: [
    {
      id: newId(), title: 'Weekly Goals', description: 'Set your top 3 goals for this week',
      icon: '🎯', color: '#7C3AED', enabled: true,
      config: {
        type: 'goals',
        goals: [
          { id: newId(), label: 'Goal #1', placeholder: 'My most important goal this week...' },
          { id: newId(), label: 'Goal #2', placeholder: 'Second priority goal...' },
          { id: newId(), label: 'Goal #3', placeholder: 'Third priority goal...' },
        ],
        showProgress: true,
        showDeadline: false,
      },
    },
    {
      id: newId(), title: 'Weekly Calendar', description: 'Plan your week ahead',
      icon: '📅', color: '#1061EC', enabled: true,
      config: { type: 'calendar', view: 'weekly', showWeekNumbers: true },
    },
    {
      id: newId(), title: 'Priority Tasks', description: 'Your most important tasks this week',
      icon: '✅', color: '#059669', enabled: true,
      config: {
        type: 'checklist',
        items: [
          { id: newId(), label: 'Task 1', required: false },
          { id: newId(), label: 'Task 2', required: false },
          { id: newId(), label: 'Task 3', required: false },
          { id: newId(), label: 'Task 4', required: false },
          { id: newId(), label: 'Task 5', required: false },
        ],
        allowAddItems: true,
      },
    },
    {
      id: newId(), title: 'Daily Habits', description: 'Track your daily habits all week',
      icon: '📊', color: '#D97706', enabled: true,
      config: {
        type: 'progress',
        habits: [
          { id: newId(), label: 'Exercise', color: '#059669' },
          { id: newId(), label: 'Read 30 min', color: '#1061EC' },
          { id: newId(), label: 'Drink water', color: '#0EA5A0' },
          { id: newId(), label: 'No social media after 9pm', color: '#7C3AED' },
        ],
        trackingPeriod: 'daily',
        days: 7,
      },
    },
    {
      id: newId(), title: 'Weekly Review', description: 'Reflect on your week',
      icon: '📄', color: '#E11D48', enabled: true,
      config: {
        type: 'worksheet',
        questions: [
          { id: newId(), question: 'What went well this week?', type: 'textarea', placeholder: 'List your wins...' },
          { id: newId(), question: 'What could have gone better?', type: 'textarea', placeholder: 'Be honest with yourself...' },
          { id: newId(), question: 'What is your #1 focus for next week?', type: 'textarea', placeholder: 'One key priority...' },
          { id: newId(), question: 'Energy level this week (1-10)', type: 'number', placeholder: '8' },
        ],
      },
    },
    {
      id: newId(), title: 'Notes & Ideas', description: 'Capture ideas and thoughts',
      icon: '📝', color: '#475569', enabled: true,
      config: { type: 'notes', placeholder: 'Capture ideas, thoughts, and inspirations...', maxLength: 2000, lineRuled: true },
    },
  ],
};
