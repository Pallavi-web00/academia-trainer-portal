import { ScheduleItem } from '../types';
import { getTopicScheduledDates } from './topicScheduling';

type BatchSchedule = Pick<ScheduleItem, 'startDate' | 'scheduledDays' | 'historicalEndDate' | 'topicScheduleAdjustments'>;

const toLocalDateISO = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function calculateBatchEndDate(
  schedule: Pick<ScheduleItem, 'startDate' | 'scheduledDays' | 'topicScheduleAdjustments'>,
  topicCount: number,
  topicIds?: string[],
  completedTopicIds: string[] = []
): string | undefined {
  if (topicIds?.length) {
    const topics = topicIds.map((id, index) => ({
      id,
      number: index + 1,
      title: id,
      isCompleted: completedTopicIds.includes(id)
    }));
    const dates = getTopicScheduledDates(
      schedule,
      topics,
      completedTopicIds
    );
    const allDates = Object.values(dates).sort();
    return allDates.at(-1);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(schedule.startDate)) return undefined;
  const [year, month, day] = schedule.startDate.split('-').map(Number);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    !Number.isInteger(topicCount) ||
    topicCount <= 0
  ) return undefined;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return undefined;

  const classDays = new Set(schedule.scheduledDays.filter((weekday) => weekday >= 1 && weekday <= 6));
  if (classDays.size === 0) return undefined;

  let sessionsRemaining = topicCount;
  while (sessionsRemaining > 0) {
    if (classDays.has(date.getDay())) sessionsRemaining -= 1;
    if (sessionsRemaining === 0) return toLocalDateISO(date);
    date.setDate(date.getDate() + 1);
  }
}

export function getBatchEndDate(
  schedule: BatchSchedule,
  topicCount: number,
  topicIds?: string[],
  completedTopicIds: string[] = []
): string | undefined {
  return schedule.historicalEndDate || calculateBatchEndDate(schedule, topicCount, topicIds, completedTopicIds);
}
