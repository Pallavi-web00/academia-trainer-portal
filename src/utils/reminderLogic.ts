import { ScheduleItem, NotificationItem, SyllabusActivityEvent } from '../types';
import {
  formatReadableDate,
  getPendingTodaySessions
} from './dateTimeUtils';

/**
 * Calculates active reminders dynamically based on schedule items,
 * session end times, and current syllabus status.
 *
 * Rules:
 * 1. Eligible when session end time has passed and syllabus status is 'Pending Update'.
 * 2. Separate reminder per module / session.
 * 3. Sessions not yet ended do not trigger reminders.
 * 4. Resolves when session status becomes 'Updated' or 'Class Not Conducted'.
 */
export function generateReminders(
  schedules: ScheduleItem[],
  activityHistory: SyllabusActivityEvent[] = [],
  now: Date = new Date()
): NotificationItem[] {
  const notifications: NotificationItem[] = [];
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const overdueSessions: ScheduleItem[] = getPendingTodaySessions(schedules, activityHistory, now);

  // Group by module to determine if multiple sessions for the same module exist
  const moduleOverdueMap = new Map<string, ScheduleItem[]>();
  for (const session of overdueSessions) {
    const list = moduleOverdueMap.get(session.moduleId) || [];
    list.push(session);
    moduleOverdueMap.set(session.moduleId, list);
  }

  // Create notifications for each overdue session
  for (const session of overdueSessions) {
    const siblings = moduleOverdueMap.get(session.moduleId) || [];
    const isMultiple = siblings.length > 1;

    let timeDetail = `${formatReadableDate(today)} · ${session.startTime}–${session.endTime}`;
    if (isMultiple) {
      timeDetail = `Session ${session.sessionNumber} (${session.startTime}–${session.endTime}) on ${formatReadableDate(today)}`;
    }

    notifications.push({
      id: `rem-syl-${session.id}-${today}`,
      title: `Syllabus Update Overdue`,
      message: `Syllabus completion not updated yet for ${session.moduleName} — ${timeDetail}.`,
      timestamp: `${today} ${session.endTime}`,
      category: 'syllabus_overdue',
      isResolved: false,
      moduleId: session.moduleId,
      sessionId: session.id,
      dateContext: today,
      actionLabel: 'Update Syllabus'
    });
  }

  // Pending schedule approvals
  const pendingApprovals = schedules.filter(s => s.approvalStatus === 'Pending');
  for (const item of pendingApprovals) {
    notifications.push({
      id: `rem-appr-${item.id}`,
      title: 'Schedule Approval Required',
      message: `Admin assigned schedule for ${item.moduleName} on ${formatReadableDate(item.scheduledDate)} (${item.startTime}–${item.endTime}). Please review and approve or request changes.`,
      timestamp: `${item.scheduledDate} ${item.startTime}`,
      category: 'schedule_approval',
      isResolved: false,
      moduleId: item.moduleId,
      sessionId: item.id,
      dateContext: item.scheduledDate,
      actionLabel: 'Review Schedule'
    });
  }

  return notifications;
}
