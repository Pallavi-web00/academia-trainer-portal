import { ScheduleItem, SyllabusTopic } from '../types';

type TopicSchedule = Pick<ScheduleItem, 'startDate' | 'scheduledDays' | 'topicScheduleAdjustments'>;

const parseLocalDate = (dateISO: string): Date | undefined => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return undefined;
  const [year, month, day] = dateISO.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }
  return date;
};

const toLocalDateISO = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const getClassDays = (schedule: Pick<ScheduleItem, 'scheduledDays'>) =>
  new Set(schedule.scheduledDays.filter((day) => Number.isInteger(day) && day >= 1 && day <= 6));

export function getNextClassDate(
  schedule: Pick<ScheduleItem, 'scheduledDays'>,
  dateISO: string,
  includeDate = true
): string | undefined {
  const date = parseLocalDate(dateISO);
  const classDays = getClassDays(schedule);
  if (!date || classDays.size === 0) return undefined;
  if (!includeDate) date.setDate(date.getDate() + 1);
  for (let offset = 0; offset < 7; offset += 1) {
    if (classDays.has(date.getDay())) return toLocalDateISO(date);
    date.setDate(date.getDate() + 1);
  }
  return undefined;
}

export function getTopicScheduledDates(
  schedule: TopicSchedule,
  topics: SyllabusTopic[],
  completedTopicIds: string[] = []
): Record<string, string> {
  const dates: Record<string, string> = {};
  const classDays = getClassDays(schedule);
  let cursor = parseLocalDate(schedule.startDate);
  if (!cursor || classDays.size === 0) return dates;

  const completed = new Set(completedTopicIds);
  for (const topic of topics) {
    const adjustedDate = schedule.topicScheduleAdjustments?.[topic.id];
    const adjusted = adjustedDate ? parseLocalDate(adjustedDate) : undefined;
    let assignedDate: Date;

    if (adjusted && classDays.has(adjusted.getDay())) {
      assignedDate = adjusted;
      if (adjusted > cursor) cursor = new Date(adjusted);
    } else {
      while (!classDays.has(cursor.getDay())) cursor.setDate(cursor.getDate() + 1);
      assignedDate = new Date(cursor);
    }

    if (completed.has(topic.id) && adjusted && classDays.has(adjusted.getDay())) {
      assignedDate = adjusted;
    }
    dates[topic.id] = toLocalDateISO(assignedDate);
    if (!completed.has(topic.id) || assignedDate >= cursor) {
      if (assignedDate > cursor) cursor = new Date(assignedDate);
      cursor.setDate(cursor.getDate() + 1);
      while (!classDays.has(cursor.getDay())) cursor.setDate(cursor.getDate() + 1);
    }
  }
  return dates;
}

export function getRescheduledTopicDates(input: {
  schedule: TopicSchedule;
  topics: SyllabusTopic[];
  completedTopicIds: string[];
  topicId: string;
  rescheduledDate: string;
}): Record<string, string> | undefined {
  const { schedule, topics, completedTopicIds, topicId, rescheduledDate } = input;
  const topicIndex = topics.findIndex((topic) => topic.id === topicId);
  const rescheduled = parseLocalDate(rescheduledDate);
  const classDays = getClassDays(schedule);
  if (
    topicIndex < 0 ||
    !rescheduled ||
    !classDays.has(rescheduled.getDay()) ||
    completedTopicIds.includes(topicId)
  ) return undefined;

  const currentDates = getTopicScheduledDates(schedule, topics, completedTopicIds);
  const adjustments = { ...(schedule.topicScheduleAdjustments || {}) };
  completedTopicIds.forEach((completedTopicId) => {
    const date = currentDates[completedTopicId];
    if (date) adjustments[completedTopicId] = date;
  });
  adjustments[topicId] = rescheduledDate;

  const nextDates = getTopicScheduledDates(
    { ...schedule, topicScheduleAdjustments: adjustments },
    topics,
    completedTopicIds
  );
  if (!nextDates[topicId]) return undefined;
  return nextDates;
}
