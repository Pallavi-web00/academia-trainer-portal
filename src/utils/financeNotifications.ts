import { NotificationItem, SyllabusActivityEvent } from '../types';

export function createFinanceModuleSubmissionNotification(
  event: SyllabusActivityEvent
): NotificationItem {
  if (
    event.eventType !== 'Module Submitted for Finance Verification' ||
    !event.batchName ||
    !event.trainerId
  ) {
    throw new Error('A complete module submission activity is required for the Finance notification.');
  }

  return {
    id: `finance-module-submission-${event.id}`,
    title: 'Module Submitted for Finance Verification',
    message: `${event.moduleName} (${event.moduleId}) for ${event.batchName} (${event.batchId}) was submitted by trainer ${event.trainerId} at ${event.timestamp}. This is a mock Finance handoff; no external Finance service is connected.`,
    timestamp: event.timestamp,
    category: 'system',
    isResolved: false,
    moduleId: event.moduleId,
    sessionId: event.sessionId,
    actionLabel: 'View Submission',
    targetRole: 'Finance Department'
  };
}
