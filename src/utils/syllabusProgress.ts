import { ModuleData } from '../types';

export interface ProgressSummary {
  completedCount: number;
  totalCount: number;
  percentage: number;
}

/**
 * Calculates syllabus progress strictly from planned topics.
 * Crucial rule: Missed-class records do not count as completed topics
 * and do not alter planned syllabus total or completed count.
 */
export function calculateModuleProgress(module: ModuleData): ProgressSummary {
  if (!module || !module.topics || module.topics.length === 0) {
    return { completedCount: 0, totalCount: 0, percentage: 0 };
  }

  const totalCount = module.topics.length;
  const completedCount = module.topics.filter(t => t.isCompleted).length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return {
    completedCount,
    totalCount,
    percentage
  };
}
