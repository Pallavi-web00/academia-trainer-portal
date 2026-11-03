import {
  ExaminationRequest,
  NotificationItem,
  ScheduleItem,
  Student
} from '../types';
import { initialModulesData } from './modulesData';
import {
  mockStudentsAllDays,
  mockStudentsMWF,
  mockStudentsTTS,
  additionalStudentGroups
} from './scheduleData';
import { getScheduleBatchId, parseTimeToMinutes } from '../utils/dateTimeUtils';

const localDateISO = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function dateOnWeekday(offset: number, weekday: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  while (date.getDay() !== weekday) date.setDate(date.getDate() + 1);
  return localDateISO(date);
}

function pastDateOnWeekday(daysAgo: number, weekday: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  while (date.getDay() !== weekday) date.setDate(date.getDate() - 1);
  return localDateISO(date);
}

const studentGroups: Record<string, Student[]> = {
  'batch-mwf': mockStudentsMWF,
  'batch-tts': mockStudentsTTS,
  'batch-daily': mockStudentsAllDays,
  'batch-mwf-afternoon': additionalStudentGroups[0],
  'batch-tts-afternoon': additionalStudentGroups[1]
};

function makeRequest(
  schedules: ScheduleItem[],
  config: Omit<ExaminationRequest, 'batchName' | 'moduleName' | 'topicNames'>
): ExaminationRequest {
  const schedule = schedules.find((item) => getScheduleBatchId(item) === config.batchId);
  const module = initialModulesData.find((item) => item.id === config.moduleId);
  if (!schedule || !module) {
    throw new Error(`Examination sample "${config.id}" has an invalid batch or module.`);
  }
  return {
    ...config,
    batchName: schedule.batch,
    moduleName: module.name,
    topicNames: config.topicIds
      .map((topicId) => module.topics.find((topic) => topic.id === topicId)?.title)
      .filter((name): name is string => Boolean(name))
  };
}

export function getInitialExaminationRequests(schedules: ScheduleItem[]): ExaminationRequest[] {
  const moduleId = initialModulesData[0].id;
  const topics = initialModulesData[0].topics;
  const eligible = (batchId: string, ids: string[]): ExaminationRequest['eligibleStudents'] =>
    (studentGroups[batchId] || []).filter((student) => ids.includes(student.id)).map((student) => ({
      studentId: student.id,
      studentName: student.name,
      batchName: schedules.find((schedule) => getScheduleBatchId(schedule) === batchId)?.batch || '',
      eligibilityRemarks: student.attendancePercent < 85 ? 'Attendance requirement met by admin exception.' : undefined
    }));
  const submitted = (daysAgo: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(10, 30, 0, 0);
    return date.toISOString();
  };
  const decision = (daysAgo: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(12, 0, 0, 0);
    return date.toISOString();
  };
  const make = (
    id: string,
    title: string,
    batchId: string,
    proposedDate: string,
    status: ExaminationRequest['requestStatus'],
    extra: Partial<ExaminationRequest> = {}
  ) => makeRequest(schedules, {
    id,
    title,
    batchId,
    moduleId,
    type: 'Assessment',
    proposedDate,
    proposedStartTime: '04:15 PM',
    proposedEndTime: '05:45 PM',
    topicIds: [topics[0].id, topics[1].id],
    mode: 'Offline',
    venueDetails: 'Assessment Hall 2',
    adminInstructions: 'Please confirm room availability and required assessment materials.',
    submittedAt: submitted(1),
    requestStatus: status,
    eventStatus: status === 'Approved' ? 'Upcoming' : 'Upcoming',
    ...extra
  });

  const records = [
    make('EXR-2026-101', 'Python Foundations Quiz', 'batch-mwf', dateOnWeekday(5, 1), 'Pending Admin Review'),
    make('EXR-2026-102', 'Database Design Mid-term', 'batch-tts', dateOnWeekday(8, 2), 'Approved', {
      submittedAt: submitted(8), decisionDate: decision(6), approvedDate: dateOnWeekday(8, 2),
      approvedStartTime: '04:15 PM', approvedEndTime: '05:45 PM',
      adminRemarks: 'Approved. Please ensure students bring their laptops.',
      eligibleStudents: eligible('batch-tts', ['st-11', 'st-12', 'st-13', 'st-14', 'st-16'])
    }),
    make('EXR-2026-103', 'SQL Fundamentals Assessment', 'batch-daily', dateOnWeekday(3, 3), 'Rejected', {
      submittedAt: submitted(12), decisionDate: decision(10),
      rejectionReason: 'The proposed date overlaps with the department-wide practical examination. Please choose another available date.',
      adminRemarks: 'Please coordinate with the examination office before resubmitting.'
    }),
    make('EXR-2026-104', 'SQL Fundamentals Assessment — Revised', 'batch-daily', dateOnWeekday(10, 5), 'Pending Admin Review', {
      submittedAt: submitted(2), originalRequestId: 'EXR-2026-103', revisionNumber: 1
    }),
    make('EXR-2026-105', 'Python Lab Readiness Check', 'batch-mwf-afternoon', dateOnWeekday(12, 1), 'Approved', {
      submittedAt: submitted(14), decisionDate: decision(13), approvedDate: dateOnWeekday(12, 1),
      approvedStartTime: '04:15 PM', approvedEndTime: '05:45 PM',
      adminRemarks: 'Approved. No students currently meet the practical prerequisite.',
      eligibilityRemarks: 'Students must complete the lab safety module first.',
      eligibleStudents: []
    }),
    make('EXR-2026-106', 'Programming Concepts Final', 'batch-mwf', dateOnWeekday(16, 3), 'Approved', {
      submittedAt: submitted(4), decisionDate: decision(3), approvedDate: dateOnWeekday(15, 3),
      approvedStartTime: '04:15 PM', approvedEndTime: '05:45 PM',
      adminRemarks: 'Approved for the proposed slot.',
      eligibleStudents: eligible('batch-mwf', ['st-01', 'st-02', 'st-03', 'st-04', 'st-06', 'st-08'])
    }),
    make('EXR-2026-107', 'Relational Database Final Examination', 'batch-tts', pastDateOnWeekday(20, 2), 'Approved', {
      submittedAt: submitted(45), decisionDate: decision(43), approvedDate: pastDateOnWeekday(20, 2),
      approvedStartTime: '04:15 PM', approvedEndTime: '05:45 PM',
      eventStatus: 'Completed', completedAt: decision(20), adminRemarks: 'Approved and completed as scheduled.',
      eligibleStudents: eligible('batch-tts', ['st-11', 'st-12', 'st-14', 'st-17'])
    }),
    make('EXR-2026-108', 'Database Lab Practical', 'batch-daily', dateOnWeekday(18, 5), 'Approved', {
      submittedAt: submitted(22), decisionDate: decision(20), approvedDate: dateOnWeekday(18, 5),
      approvedStartTime: '04:15 PM', approvedEndTime: '05:45 PM',
      eventStatus: 'Cancelled', cancellationReason: 'The assessment hall was closed for an urgent facilities repair.',
      adminRemarks: 'Approved. Cancellation acknowledged by the examination office.',
      eligibleStudents: eligible('batch-daily', ['st-21', 'st-22', 'st-24'])
    }),
    make('EXR-2026-109', 'Python Module Progress Examination', 'batch-mwf-afternoon', dateOnWeekday(20, 1), 'Approved', {
      submittedAt: submitted(18), decisionDate: decision(16), approvedDate: dateOnWeekday(23, 1),
      approvedStartTime: '04:30 PM', approvedEndTime: '06:00 PM',
      adminRemarks: 'Reschedule confirmed by the examination office.',
      eligibleStudents: eligible('batch-mwf-afternoon', ['st-29', 'st-30', 'st-31']),
      scheduleChange: {
        proposedDate: dateOnWeekday(23, 1), proposedStartTime: '04:30 PM', proposedEndTime: '06:00 PM',
        status: 'Confirmed', submittedAt: submitted(12), decisionDate: decision(11),
        adminRemarks: 'New date and time confirmed.'
      }
    }),
    make('EXR-2026-110', 'TTS Database Skills Assessment', 'batch-tts-afternoon', dateOnWeekday(25, 4), 'Approved', {
      submittedAt: submitted(6), decisionDate: decision(5), approvedDate: dateOnWeekday(25, 4),
      approvedStartTime: '04:15 PM', approvedEndTime: '05:45 PM',
      adminRemarks: 'Original date approved. Requested change is awaiting a decision.',
      eligibleStudents: eligible('batch-tts-afternoon', ['st-33', 'st-34', 'st-35']),
      scheduleChange: {
        proposedDate: dateOnWeekday(30, 4), proposedStartTime: '04:30 PM', proposedEndTime: '06:00 PM',
        status: 'Pending Admin Review', submittedAt: submitted(1)
      }
    })
  ];

  return records;
}

export function getExaminationNotifications(
  requests: ExaminationRequest[]
): NotificationItem[] {
  const notificationFor = (
    request: ExaminationRequest,
    type: string,
    title: string,
    message: string,
    timestamp: string
  ): NotificationItem => ({
    id: `exam-${type}-${request.id}`,
    title,
    message,
    timestamp,
    category: 'examination',
    isResolved: false,
    relatedRequestId: request.id,
    actionLabel: 'View Examination',
    moduleId: request.moduleId
  });
  const notifications: NotificationItem[] = [];
  const approved = requests.find(
    (request) =>
      request.requestStatus === 'Approved' &&
      request.eventStatus !== 'Cancelled' &&
      request.eligibleStudents &&
      request.eligibleStudents.length > 0 &&
      !request.scheduleChange
  );
  if (approved) {
    const date = approved.decisionDate || approved.submittedAt;
    notifications.push(notificationFor(
      approved, 'approved', `Examination approved: ${approved.title}`,
      'The admin decision and confirmed examination details are available.', date
    ));
    notifications.push(notificationFor(
      approved, 'eligibility', `Eligibility list available: ${approved.title}`,
      `${approved.eligibleStudents?.length || 0} eligible students returned by admin.`, date
    ));
  }

  const rejected = requests.find((request) => request.requestStatus === 'Rejected');
  if (rejected) {
    notifications.push(notificationFor(
      rejected, 'rejected', `Examination request rejected: ${rejected.title}`,
      rejected.rejectionReason || 'The request was rejected.',
      rejected.decisionDate || rejected.submittedAt
    ));
  }

  const confirmedChange = requests.find(
    (request) => request.scheduleChange?.status === 'Confirmed'
  );
  if (confirmedChange?.scheduleChange) {
    notifications.push(notificationFor(
      confirmedChange, 'rescheduled', `Examination rescheduled: ${confirmedChange.title}`,
      confirmedChange.scheduleChange.adminRemarks || 'The revised schedule was confirmed by admin.',
      confirmedChange.scheduleChange.decisionDate || confirmedChange.scheduleChange.submittedAt
    ));
  }

  const pendingChange = requests.find(
    (request) => request.scheduleChange?.status === 'Pending Admin Review'
  );
  if (pendingChange?.scheduleChange) {
    notifications.push(notificationFor(
      pendingChange, 'change-pending', `Schedule change awaiting review: ${pendingChange.title}`,
      `Proposed new date: ${pendingChange.scheduleChange.proposedDate}.`,
      pendingChange.scheduleChange.submittedAt
    ));
  }

  const cancelled = requests.find((request) => request.eventStatus === 'Cancelled');
  if (cancelled) {
    notifications.push(notificationFor(
      cancelled, 'cancelled', `Examination cancelled: ${cancelled.title}`,
      cancelled.cancellationReason || 'The examination was cancelled.',
      cancelled.decisionDate || cancelled.submittedAt
    ));
  }

  const pendingRequest = requests.find(
    (request) => request.requestStatus === 'Pending Admin Review'
  );
  if (pendingRequest) {
    notifications.push(notificationFor(
      pendingRequest, 'pending-reminder',
      `Examination request awaiting review: ${pendingRequest.title}`,
      `Request ${pendingRequest.id} is awaiting an admin decision.`,
      pendingRequest.submittedAt
    ));
  }
  return notifications;
}

export function findExaminationScheduleConflict(
  batchId: string,
  date: string,
  startTime: string,
  endTime: string,
  schedules: ScheduleItem[],
  requests: ExaminationRequest[],
  ignoreRequestId?: string
): string | undefined {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (end <= start) return 'End time must be later than start time.';

  const weekday = new Date(`${date}T00:00:00`).getDay();
  const classConflict = schedules.find((schedule) =>
    date >= schedule.startDate &&
    schedule.scheduledDays.includes(weekday) &&
    parseTimeToMinutes(schedule.startTime) < end &&
    parseTimeToMinutes(schedule.endTime) > start
  );
  if (classConflict) {
    return `This time overlaps the ${classConflict.batch} class (${classConflict.startTime}–${classConflict.endTime}).`;
  }

  for (const request of requests) {
    if (
      request.id === ignoreRequestId ||
      request.requestStatus === 'Rejected' ||
      request.eventStatus === 'Cancelled'
    ) continue;
    const otherDate = request.approvedDate || request.proposedDate;
    const otherStart = request.approvedStartTime || request.proposedStartTime;
    const otherEnd = request.approvedEndTime || request.proposedEndTime;
    if (
      date === otherDate &&
      parseTimeToMinutes(otherStart) < end &&
      parseTimeToMinutes(otherEnd) > start
    ) {
      return `This time overlaps examination request ${request.id} (${request.title}).`;
    }
    if (
      request.scheduleChange?.status === 'Pending Admin Review' &&
      date === request.scheduleChange.proposedDate &&
      parseTimeToMinutes(request.scheduleChange.proposedStartTime) < end &&
      parseTimeToMinutes(request.scheduleChange.proposedEndTime) > start
    ) {
      return `This time overlaps a proposed schedule change for ${request.id}.`;
    }
  }
  return undefined;
}
