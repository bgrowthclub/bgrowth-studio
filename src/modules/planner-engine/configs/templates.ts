import { businessStartupPlanner } from './businessStartup';
import { weeklyProductivityPlanner } from './weeklyProductivity';
import { goalAchievementPlanner } from './goalAchievement';
import { cleaningBusinessPlanner } from './cleaningBusiness';
import { normalizePlanner, type PlannerConfig } from '../types';

// Each template file is still authored in the legacy flat blocks[] shape
// (LegacyFlatPlannerConfig — see their own headers). Normalized once,
// here, into the canonical sections[] shape, so PLANNER_TEMPLATES is
// already a real PlannerConfig[] — every consumer (PlannerEngine.tsx's
// template gallery and "Use this template") needs zero normalization
// logic of its own.
export const PLANNER_TEMPLATES: PlannerConfig[] = [
  businessStartupPlanner,
  weeklyProductivityPlanner,
  goalAchievementPlanner,
  cleaningBusinessPlanner,
].map(normalizePlanner);
