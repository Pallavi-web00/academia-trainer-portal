import { AdminTask, ScheduleItem, SyllabusActivityEvent } from '../types';

/**
 * Utility functions for academic dates, timings, and time comparison.
 */

// Parse "HH:MM AM/PM" to 24-hour hour & minute
export function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3] ? match[3].toUpperCase() : null;

  if (meridiem === 'PM' && hours < 12) {
    hours += 12;
  } else if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

export function getCurrentDateISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatReadableDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isCurrent =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();

    const formatted = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    return isCurrent ? `Today (${formatted})` : formatted;
  } catch {
    return dateStr;
  }
}

function getLocalDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * For today, compares the current local time with the session end time.
 */
export function hasSessionEnded(
  scheduledDate: string,
  endTimeStr: string,
  now: Date = new Date()
): boolean {
  if (!scheduledDate) return false;
  const today = getLocalDateISO(now);
  if (scheduledDate < today) return true;
  if (scheduledDate > today) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= parseTimeToMinutes(endTimeStr);
}

export type TodaysSyllabusStatus =
  | 'Pending Update'
  | 'Ongoing'
  | 'Updated'
  | 'Upcoming'
  | 'No Class Today';

export function getScheduleBatchId(schedule: ScheduleItem): string {
  return schedule.batchId || schedule.id;
}

export function hasSavedOutcomeForSessionOnDate(
  session: ScheduleItem,
  date: string,
  activityHistory: SyllabusActivityEvent[]
): boolean {
  const sessionId = `session-${session.id}-${date}`;
  return activityHistory.some(
    (event) =>
      event.batchId === getScheduleBatchId(session) &&
      event.moduleId === session.moduleId &&
      event.sessionId === sessionId &&
      (event.scheduledDate || event.displayDate) === date &&
      event.savedStatus === 'Saved' &&
      (event.eventType === 'Topic Completed' || event.eventType === 'Class Not Conducted')
  );
}

export function getSessionSyllabusStatus(
  session: ScheduleItem,
  activityHistory: SyllabusActivityEvent[],
  now: Date = new Date()
): TodaysSyllabusStatus {
  const today = getLocalDateISO(now);
  if (
    session.startDate > today ||
    !isBatchScheduledOnDate(session.batch, today, session.scheduledDays)
  ) {
    return 'No Class Today';
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseTimeToMinutes(session.startTime);
  const endMinutes = parseTimeToMinutes(session.endTime);

  if (currentMinutes < startMinutes) return 'Upcoming';
  if (currentMinutes < endMinutes) return 'Ongoing';
  return hasSavedOutcomeForSessionOnDate(session, today, activityHistory)
    ? 'Updated'
    : 'Pending Update';
}

export function getPendingTodaySessions(
  schedules: ScheduleItem[],
  activityHistory: SyllabusActivityEvent[],
  now: Date = new Date()
): ScheduleItem[] {
  const today = getLocalDateISO(now);
  return schedules.filter(
    (session) =>
      session.approvalStatus === 'Approved' &&
      session.startDate <= today &&
      getSessionSyllabusStatus(session, activityHistory, now) === 'Pending Update'
  );
}

/**
 * Resolves today's status independently from any historical schedule status.
 */
export function getTodaysSyllabusStatus(
  batchSchedule: ScheduleItem,
  schedules: ScheduleItem[],
  activityHistory: SyllabusActivityEvent[],
  now: Date = new Date()
): TodaysSyllabusStatus {
  const todaySessions = schedules.filter(
    (schedule) =>
      getScheduleBatchId(schedule) === getScheduleBatchId(batchSchedule) &&
      getSessionSyllabusStatus(schedule, activityHistory, now) !== 'No Class Today'
  );

  if (todaySessions.length === 0) return 'No Class Today';
  const statuses = todaySessions.map((session) =>
    getSessionSyllabusStatus(session, activityHistory, now)
  );
  if (statuses.includes('Pending Update')) return 'Pending Update';
  if (statuses.includes('Ongoing')) return 'Ongoing';
  if (statuses.includes('Upcoming')) return 'Upcoming';
  return 'Updated';
}

/**
 * Checks if date is today
 */
export function isDateToday(dateStr: string): boolean {
  return dateStr === getCurrentDateISO();
}

/**
 * Returns the name of the day of the week (e.g. "Monday", "Tuesday", etc.)
 */
export function getDayOfWeekName(dateInput?: string | Date): string {
  let d: Date;
  if (!dateInput) {
    d = new Date();
  } else if (typeof dateInput === 'string') {
    const parts = dateInput.split('-').map(Number);
    if (parts.length === 3) {
      d = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      d = new Date(dateInput);
    }
  } else {
    d = dateInput;
  }
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Determines whether a batch is conducted on the given date's day of the week.
 *
 * Rules:
 * - MWF: classes are conducted on Monday, Wednesday, and Friday.
 * - TTS: classes are conducted on Tuesday, Thursday, and Saturday.
 * - Everyday / Timings-only (e.g. "02:00 PM - 04:00 PM"): classes are conducted on all days.
 */
export function isBatchScheduledOnDate(
  batch: string,
  dateInput?: string | Date,
  scheduledDays?: number[]
): boolean {
  if (!batch) return false;

  let d: Date;
  if (!dateInput) {
    d = new Date();
  } else if (typeof dateInput === 'string') {
    const parts = dateInput.split('-').map(Number);
    if (parts.length === 3) {
      d = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      d = new Date(dateInput);
    }
  } else {
    d = dateInput;
  }

  // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
  const dayOfWeek = d.getDay();
  if (scheduledDays) return scheduledDays.includes(dayOfWeek);
  const b = batch.trim().toUpperCase();

  // MWF Batch: Monday (1), Wednesday (3), Friday (5)
  if (b === 'MWF' || b.startsWith('MWF') || b.includes('MON, WED, FRI') || b.includes('MON,WED,FRI')) {
    return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
  }

  // TTS Batch: Tuesday (2), Thursday (4), Saturday (6)
  if (b === 'TTS' || b.startsWith('TTS') || b.includes('TUE, THU, SAT') || b.includes('TUE,THU,SAT')) {
    return dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 6;
  }

  // If the batch attends classes on all days of the week, it runs every day
  return true;
}

/**
 * Returns human-readable recurring days text for a batch.
 */
export function getBatchDaysDescription(batch: string, scheduledDays?: number[]): string {
  if (scheduledDays) {
    if (scheduledDays.length === 6 && !scheduledDays.includes(0)) return 'Monday through Saturday';
    if (scheduledDays.length === 7) return 'All days of the week (Daily)';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return scheduledDays.map((day) => dayNames[day]).join(', ');
  }

  const b = (batch || '').trim().toUpperCase();
  if (b === 'MWF' || b.includes('MWF')) {
    return 'Monday, Wednesday, Friday';
  }
  if (b === 'TTS' || b.includes('TTS')) {
    return 'Tuesday, Thursday, Saturday';
  }
  return 'All days of the week (Daily)';
}

export interface ScheduleConflict {
  date: string;
  firstScheduleId: string;
  secondScheduleId: string;
}

/**
 * Expands recurring batch schedules to actual calendar dates and reports overlapping sessions.
 * The end date is inclusive; back-to-back sessions are allowed.
 */
export function findScheduleConflicts(
  schedules: Pick<ScheduleItem, 'id' | 'batch' | 'startDate' | 'startTime' | 'endTime' | 'scheduledDays'>[],
  endDate: string
): ScheduleConflict[] {
  const endDateValue = new Date(`${endDate}T00:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate) || Number.isNaN(endDateValue.getTime())) {
    throw new Error(`Invalid schedule validation end date "${endDate}".`);
  }

  const sessionsByDate = new Map<string, Array<{
    id: string;
    start: number;
    end: number;
  }>>();
  const scheduleIds = new Set<string>();

  for (const schedule of schedules) {
    if (scheduleIds.has(schedule.id)) {
      throw new Error(`Duplicate schedule ID "${schedule.id}".`);
    }
    scheduleIds.add(schedule.id);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(schedule.startDate) ||
      Number.isNaN(new Date(`${schedule.startDate}T00:00:00`).getTime())
    ) {
      throw new Error(`Invalid start date for schedule "${schedule.id}".`);
    }
    if (
      schedule.scheduledDays.length === 0 ||
      schedule.scheduledDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
    ) {
      throw new Error(`Invalid recurring weekdays for schedule "${schedule.id}".`);
    }
    if (schedule.startDate > endDate) continue;
    const startDate = schedule.startDate;
    const start = parseTimeToMinutes(schedule.startTime);
    const end = parseTimeToMinutes(schedule.endTime);
    const timeFormat = /^\d{1,2}:\d{2}\s*(AM|PM)$/i;
    if (!timeFormat.test(schedule.startTime) || !timeFormat.test(schedule.endTime) || end <= start) {
      throw new Error(`Invalid session interval for schedule "${schedule.id}".`);
    }

    const date = new Date(`${startDate}T00:00:00`);
    const lastDate = new Date(`${endDate}T00:00:00`);
    while (date <= lastDate) {
      if (schedule.scheduledDays.includes(date.getDay())) {
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const sessions = sessionsByDate.get(dateKey) || [];
        sessions.push({ id: schedule.id, start, end });
        sessionsByDate.set(dateKey, sessions);
      }
      date.setDate(date.getDate() + 1);
    }
  }

  const conflicts: ScheduleConflict[] = [];
  for (const [date, sessions] of sessionsByDate) {
    for (let firstIndex = 0; firstIndex < sessions.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < sessions.length; secondIndex += 1) {
        const first = sessions[firstIndex];
        const second = sessions[secondIndex];
        if (first.id !== second.id && first.start < second.end && first.end > second.start) {
          conflicts.push({
            date,
            firstScheduleId: first.id,
            secondScheduleId: second.id
          });
        }
      }
    }
  }

  return conflicts;
}

/**
 * Enforces session hours and lunch rules; admin tasks remain limited to Monday-Saturday.
 */
export function validateTrainerWorkingSchedule(
  schedules: Pick<ScheduleItem, 'id' | 'batch' | 'startDate' | 'startTime' | 'endTime' | 'scheduledDays'>[],
  tasks: Pick<AdminTask, 'id' | 'assignedDate' | 'startTime' | 'endTime'>[]
): void {
  const workdayStart = 9 * 60;
  const lunchStart = 13 * 60;
  const lunchEnd = 14 * 60;
  const workdayEnd = 18 * 60;

  for (const schedule of schedules) {
    const start = parseTimeToMinutes(schedule.startTime);
    const end = parseTimeToMinutes(schedule.endTime);
    if (
      start < workdayStart ||
      end > workdayEnd ||
      (start < lunchEnd && end > lunchStart)
    ) {
      throw new Error(`Schedule "${schedule.id}" falls outside working hours or overlaps lunch.`);
    }
  }

  for (const task of tasks) {
    const assignedDay = new Date(`${task.assignedDate}T00:00:00`).getDay();
    const start = parseTimeToMinutes(task.startTime);
    const end = parseTimeToMinutes(task.endTime);
    if (
      assignedDay === 0 ||
      start < workdayStart ||
      end > workdayEnd ||
      end <= start ||
      (start < lunchEnd && end > lunchStart)
    ) {
      throw new Error(`Task "${task.id}" falls outside working days/hours or overlaps lunch.`);
    }
  }
}
