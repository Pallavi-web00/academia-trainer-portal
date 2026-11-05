import {
  AdminExamination,
  ExaminationMarksRecord,
  NotificationItem,
  ScheduleItem
} from '../types';
import { getScheduleBatchId } from '../utils/dateTimeUtils';
import { hasModuleFinanceSubmission, isModuleReadyForFinanceVerification } from '../utils/syllabusAssessment';

const localDateISO = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function dateOnWeekday(offset: number, weekday: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  const direction = offset < 0 ? -1 : 1;
  while (date.getDay() !== weekday) date.setDate(date.getDate() + direction);
  return localDateISO(date);
}

function createEligibleStudents(
  schedule: ScheduleItem,
  studentIds: string[] = schedule.students.map((student) => student.id)
): AdminExamination['eligibleStudents'] {
  return schedule.students
    .filter((student) => studentIds.includes(student.id))
    .map((student) => ({
      studentId: student.id,
      studentName: student.name,
      batchName: schedule.batch
    }));
}

export function getInitialAdminExaminations(schedules: ScheduleItem[]): AdminExamination[] {
  const scheduleById = new Map(
    schedules.map((schedule) => [getScheduleBatchId(schedule), schedule])
  );
  const now = new Date().toISOString();
  const fixtures: Array<{
    id: string;
    batchId: string;
    theory?: AdminExamination['components']['Theory'];
    practical?: AdminExamination['components']['Practical'];
    project?: AdminExamination['components']['Project'];
    eligibleStudentIds?: string[];
    adminDetails: string;
  }> = [
    {
      id: 'ADM-EXAM-DAILY-MOD2-2026',
      batchId: 'batch-daily',
      theory: { scheduledDate: '2026-11-10', scheduledTime: '10:00 AM', endTime: '12:00 PM', maxMarks: 100 },
      practical: { scheduledDate: '2026-11-12', scheduledTime: '10:00 AM', endTime: '12:00 PM', maxMarks: 100 },
      project: { scheduledDate: '2026-11-15', scheduledTime: '02:00 PM', endTime: '04:00 PM', maxMarks: 100 },
      eligibleStudentIds: ['st-21', 'st-22', 'st-24', 'st-26', 'st-27', 'st-28'],
      adminDetails: 'Sample Admin-published schedule for Everyday. This batch has completed every planned module topic and all students passed each topic MCQ.'
    },
    {
      id: 'ADM-EXAM-MWF-MOD2-2026',
      batchId: 'batch-mwf',
      theory: { scheduledDate: dateOnWeekday(4, 1), scheduledTime: '10:00 AM', maxMarks: 100 },
      practical: { scheduledDate: dateOnWeekday(8, 3), scheduledTime: '10:00 AM', maxMarks: 100 },
      project: { scheduledDate: dateOnWeekday(12, 5), scheduledTime: '02:00 PM', maxMarks: 100 },
      eligibleStudentIds: ['st-01', 'st-02', 'st-03', 'st-04', 'st-06', 'st-08'],
      adminDetails: 'Published by Admin. Mock schedule and eligibility list.'
    },
    {
      id: 'ADM-EXAM-TTS-MOD2-2026',
      batchId: 'batch-tts',
      theory: { scheduledDate: dateOnWeekday(7, 2), scheduledTime: '10:00 AM', maxMarks: 100 },
      practical: { scheduledDate: dateOnWeekday(10, 4), scheduledTime: '10:00 AM', maxMarks: 100 },
      project: { scheduledDate: dateOnWeekday(12, 6), scheduledTime: '02:00 PM', maxMarks: 100 },
      adminDetails: 'Published by Admin after module completion submission. Mock schedule and eligibility list.'
    },
    {
      id: 'ADM-EXAM-MWF-AFTERNOON-MOD2-2026',
      batchId: 'batch-mwf-afternoon',
      theory: { scheduledDate: dateOnWeekday(7, 1), scheduledTime: '02:00 PM', maxMarks: 100 },
      practical: { scheduledDate: dateOnWeekday(10, 3), scheduledTime: '02:00 PM', maxMarks: 100 },
      project: { scheduledDate: dateOnWeekday(12, 5), scheduledTime: '04:00 PM', maxMarks: 100 },
      adminDetails: 'Published by Admin after module completion submission. Mock schedule and eligibility list.'
    },
    {
      id: 'ADM-EXAM-TTS-AFTERNOON-MOD2-2026',
      batchId: 'batch-tts-afternoon',
      theory: { scheduledDate: dateOnWeekday(7, 2), scheduledTime: '02:00 PM', maxMarks: 100 },
      practical: { scheduledDate: dateOnWeekday(10, 4), scheduledTime: '02:00 PM', maxMarks: 100 },
      project: { scheduledDate: dateOnWeekday(12, 6), scheduledTime: '04:00 PM', maxMarks: 100 },
      adminDetails: 'Published by Admin after module completion submission. Mock schedule and eligibility list.'
    }
  ];

  return fixtures.flatMap((fixture) => {
    const schedule = scheduleById.get(fixture.batchId);
    if (!schedule) return [];
    return [{
      id: fixture.id,
      batchId: fixture.batchId,
      batchName: schedule.batch,
      moduleId: schedule.moduleId,
      moduleName: schedule.moduleName,
      components: {
        ...(fixture.theory ? { Theory: fixture.theory } : {}),
        ...(fixture.practical ? { Practical: fixture.practical } : {}),
        ...(fixture.project ? { Project: fixture.project } : {})
      },
      eligibleStudents: createEligibleStudents(
        schedule,
        fixture.eligibleStudentIds
      ),
      publishedAt: fixture.id === 'ADM-EXAM-DAILY-MOD2-2026'
        ? '2026-11-05T04:30:00.000Z'
        : now,
      status: 'Admin Published',
      publishedBy: 'ADMIN-MOCK-01',
      scheduleUpdates: [],
      adminDetails: fixture.adminDetails
    }];
  });
}

export function getAdminExaminationNotifications(
  examinations: AdminExamination[]
): NotificationItem[] {
  const notifications: NotificationItem[] = [];
  examinations.forEach((exam) => {
    const componentSchedule = Object.entries(exam.components)
      .filter((entry): entry is [string, NonNullable<typeof entry[1]>] => Boolean(entry[1]))
      .map(([component, schedule]) =>
        `${component}: ${schedule.scheduledDate} ${schedule.scheduledTime}${schedule.endTime ? `–${schedule.endTime}` : ''}`
      )
      .join('; ');
    notifications.push({
      id: `admin-exam-published-${exam.id}`,
      title: 'Examination Schedule Published',
      message: `${exam.batchName} · ${exam.moduleName}. ${componentSchedule}. Mock notification representing publication by ${exam.publishedBy}; no external Admin notification was sent.`,
      timestamp: exam.publishedAt,
      category: 'examination',
      isResolved: false,
      moduleId: exam.moduleId,
      actionLabel: 'View Examination',
      relatedRequestId: exam.id
    });
    exam.scheduleUpdates.forEach((update) => {
      notifications.push({
        id: `admin-exam-updated-${exam.id}-${update.id}`,
        title: `Examination schedule updated: ${update.component}`,
        message: `${exam.batchName} · ${exam.moduleName} · ${update.component} changed from ${update.previousDate} at ${update.previousTime} to ${update.updatedDate} at ${update.updatedTime}.${update.details ? ` ${update.details}` : ''} Mock Admin schedule update notification.`,
        timestamp: update.timestamp,
        category: 'examination',
        isResolved: false,
        moduleId: exam.moduleId,
        actionLabel: 'View Examination',
        relatedRequestId: exam.id
      });
    });
  });
  return notifications;
}

export function getPublishedAdminExaminations(input: {
  examinations: AdminExamination[];
  schedules: ScheduleItem[];
  modules: Array<{ id: string; topics: Array<{ id: string }> }>;
  assessments: Parameters<typeof isModuleReadyForFinanceVerification>[0]['assessments'];
  activityHistory: Parameters<typeof hasModuleFinanceSubmission>[0];
}): AdminExamination[] {
  const { examinations, schedules, modules, assessments, activityHistory } = input;
  return examinations.flatMap((examination) => {
    const schedule = schedules.find((item) =>
      getScheduleBatchId(item) === examination.batchId &&
      item.moduleId === examination.moduleId
    );
    const module = modules.find((item) => item.id === examination.moduleId);
    if (
      !schedule ||
      !module ||
      !hasModuleFinanceSubmission(activityHistory, examination.batchId, examination.moduleId) ||
      !isModuleReadyForFinanceVerification({
        topicIds: module.topics.map((topic) => topic.id),
        batchId: examination.batchId,
        moduleId: examination.moduleId,
        students: schedule.students,
        completedTopicIds: schedule.completedTopicIds || [],
        activityHistory,
        assessments
      })
    ) return [];

    const rosterIds = new Set(schedule.students.map((student) => student.id));
    const eligibleStudents = examination.eligibleStudents.filter((student) =>
      rosterIds.has(student.studentId) && student.batchName === schedule.batch
    );
    return [{
      ...examination,
      batchName: schedule.batch,
      moduleName: schedule.moduleName,
      eligibleStudents
    }];
  });
}

export function createAdminMarksSubmittedNotification(
  record: ExaminationMarksRecord,
  examination: AdminExamination
): NotificationItem {
  if (record.status !== 'Submitted' || !record.submittedAt) {
    throw new Error('Submitted marks with a timestamp are required for an Admin notification.');
  }
  return {
    id: `admin-marks-submitted-${record.id}`,
    title: 'Examination marks submitted',
    message: `${examination.batchName} · ${examination.moduleName} marks were submitted by trainer ${record.trainerId} at ${record.submittedAt}. Mock Admin handoff; no external Admin service is connected.`,
    timestamp: record.submittedAt,
    category: 'examination',
    isResolved: false,
    moduleId: examination.moduleId,
    actionLabel: 'View Examination',
    relatedRequestId: examination.id,
    targetRole: 'Admin'
  };
}
