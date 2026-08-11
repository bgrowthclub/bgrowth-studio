import type { LegacyFlatPlannerConfig } from '../types';
import { newId } from '../types';

// Phase 1: templates are still authored in the legacy flat blocks[] shape
// (see LegacyFlatPlannerConfig's own doc comment) — normalized into the
// canonical sections[] shape once, in ../configs/templates.ts, so every
// consumer of PLANNER_TEMPLATES already receives a real PlannerConfig.
export const goalAchievementPlanner: LegacyFlatPlannerConfig = {
  id: 'template-goal-achievement',
  isTemplate: true,
  templateName: 'Goal Achievement Planner',
  publishStatus: 'published',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  uses: 0,
  settings: {
    name: 'Goal Achievement Planner',
    description: 'A proven system to set, track and achieve your most important goals.',
    coverImage: null,
    icon: '🎯',
    primaryColor: '#DC2626',
    accentColor: '#4C0519',
    category: 'Personal',
    difficulty: 'Beginner',
    language: 'English',
    author: 'BGrowth Studio',
    tags: ['goals', 'achievement', 'success', 'mindset'],
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
      id: newId(), title: 'My Big Goals', description: 'Define your most important goals',
      icon: '🎯', color: '#DC2626', enabled: true,
      config: {
        type: 'goals',
        goals: [
          { id: newId(), label: 'Career Goal', placeholder: 'What do you want to achieve in your career?' },
          { id: newId(), label: 'Financial Goal', placeholder: 'What is your financial target?' },
          { id: newId(), label: 'Health Goal', placeholder: 'What do you want to achieve for your health?' },
          { id: newId(), label: 'Personal Growth Goal', placeholder: 'How do you want to grow as a person?' },
          { id: newId(), label: 'Relationship Goal', placeholder: 'What do you want to improve in your relationships?' },
        ],
        showProgress: true,
        showDeadline: true,
      },
    },
    {
      id: newId(), title: 'Action Plan', description: 'Break down your goals into actions',
      icon: '📌', color: '#7C3AED', enabled: true,
      config: {
        type: 'milestones',
        milestones: [
          { id: newId(), label: 'Month 1 Milestone', placeholder: 'What will you accomplish in month 1?' },
          { id: newId(), label: 'Month 3 Milestone', placeholder: 'What will you accomplish by month 3?' },
          { id: newId(), label: 'Month 6 Milestone', placeholder: 'What will you accomplish by month 6?' },
          { id: newId(), label: 'Year End Goal', placeholder: 'Where will you be at the end of the year?' },
        ],
        showDate: true,
        showStatus: true,
      },
    },
    {
      id: newId(), title: 'Daily Success Habits', description: 'Build habits that lead to goal achievement',
      icon: '📊', color: '#D97706', enabled: true,
      config: {
        type: 'progress',
        habits: [
          { id: newId(), label: 'Morning routine', color: '#D97706' },
          { id: newId(), label: 'Work on main goal 1 hour', color: '#DC2626' },
          { id: newId(), label: 'Exercise', color: '#059669' },
          { id: newId(), label: 'Read / Learn', color: '#1061EC' },
          { id: newId(), label: 'Gratitude journal', color: '#7C3AED' },
        ],
        trackingPeriod: 'daily',
        days: 30,
      },
    },
    {
      id: newId(), title: 'Goal Timeline', description: 'Your path to success',
      icon: '⏰', color: '#0EA5A0', enabled: true,
      config: {
        type: 'timeline',
        events: [
          { id: newId(), label: 'Starting Point', placeholder: 'Where am I starting from?' },
          { id: newId(), label: '30 Days', placeholder: 'First milestone...' },
          { id: newId(), label: '90 Days', placeholder: 'Major progress...' },
          { id: newId(), label: '6 Months', placeholder: 'Halfway there...' },
          { id: newId(), label: 'Goal Achieved!', placeholder: 'What does success look like?' },
        ],
        orientation: 'vertical',
      },
    },
    {
      id: newId(), title: 'Vision Board', description: 'Visualize your success',
      icon: '📷', color: '#E11D48', enabled: true,
      config: { type: 'image', prompt: 'Upload an image that represents your goal achieved', allowUpload: true, caption: 'My Vision' },
    },
    {
      id: newId(), title: 'Reflection Journal', description: 'Weekly reflection on your progress',
      icon: '📝', color: '#475569', enabled: true,
      config: { type: 'notes', placeholder: 'Reflect on your progress, lessons learned, and adjustments needed...', maxLength: 3000, lineRuled: true },
    },
  ],
};
