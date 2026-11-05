import {
  ScheduleItem,
  Student,
  SyllabusActivityEvent,
  AdminTask,
  ScheduledSyllabusSession
} from '../types';
import { initialModulesData } from './modulesData';
import {
  findScheduleConflicts,
  getScheduleBatchId,
  parseTimeToMinutes,
  validateTrainerWorkingSchedule
} from '../utils/dateTimeUtils';

export const mockStudentsMWF: Student[] = [
  { id: 'st-01', name: 'Aarav Sharma', rollNumber: 'PY24-M01', attendancePercent: 92, email: 'aarav.sharma@institution.edu' },
  { id: 'st-02', name: 'Ananya Iyer', rollNumber: 'PY24-M02', attendancePercent: 96, email: 'ananya.iyer@institution.edu' },
  { id: 'st-03', name: 'Devansh Kulkarni', rollNumber: 'PY24-M03', attendancePercent: 88, email: 'devansh.k@institution.edu' },
  { id: 'st-04', name: 'Ishita Patel', rollNumber: 'PY24-M04', attendancePercent: 94, email: 'ishita.patel@institution.edu' },
  { id: 'st-05', name: 'Kabir Malhotra', rollNumber: 'PY24-M05', attendancePercent: 84, email: 'kabir.m@institution.edu' },
  { id: 'st-06', name: 'Meera Nambiar', rollNumber: 'PY24-M06', attendancePercent: 100, email: 'meera.nambiar@institution.edu' },
  { id: 'st-07', name: 'Rohan Deshmukh', rollNumber: 'PY24-M07', attendancePercent: 90, email: 'rohan.d@institution.edu' },
  { id: 'st-08', name: 'Sanya Sen', rollNumber: 'PY24-M08', attendancePercent: 91, email: 'sanya.sen@institution.edu' },
  { id: 'st-09', name: 'Tanmay Joshi', rollNumber: 'PY24-M09', attendancePercent: 85, email: 'tanmay.j@institution.edu' },
  { id: 'st-10', name: 'Zoya Qureshi', rollNumber: 'PY24-M10', attendancePercent: 95, email: 'zoya.q@institution.edu' },
];

export const mockStudentsTTS: Student[] = [
  { id: 'st-11', name: 'Aditya Verma', rollNumber: 'PY24-T11', attendancePercent: 89, email: 'aditya.v@institution.edu' },
  { id: 'st-12', name: 'Bhavna Rao', rollNumber: 'PY24-T12', attendancePercent: 93, email: 'bhavna.r@institution.edu' },
  { id: 'st-13', name: 'Chetan Mehta', rollNumber: 'PY24-T13', attendancePercent: 86, email: 'chetan.m@institution.edu' },
  { id: 'st-14', name: 'Divya Nair', rollNumber: 'PY24-T14', attendancePercent: 97, email: 'divya.nair@institution.edu' },
  { id: 'st-15', name: 'Gautam Singhania', rollNumber: 'PY24-T15', attendancePercent: 78, email: 'gautam.s@institution.edu' },
  { id: 'st-16', name: 'Kavya Pillai', rollNumber: 'PY24-T16', attendancePercent: 92, email: 'kavya.p@institution.edu' },
  { id: 'st-17', name: 'Manish Pandey', rollNumber: 'PY24-T17', attendancePercent: 88, email: 'manish.p@institution.edu' },
  { id: 'st-18', name: 'Pooja Hegde', rollNumber: 'PY24-T18', attendancePercent: 94, email: 'pooja.h@institution.edu' },
  { id: 'st-19', name: 'Rahul Chhabra', rollNumber: 'PY24-T19', attendancePercent: 91, email: 'rahul.c@institution.edu' },
  { id: 'st-20', name: 'Shruti Varma', rollNumber: 'PY24-T20', attendancePercent: 89, email: 'shruti.v@institution.edu' }
];

export const mockStudentsAllDays: Student[] = [
  { id: 'st-21', name: 'Arjun Das', rollNumber: 'PY24-D21', attendancePercent: 95, email: 'arjun.das@institution.edu' },
  { id: 'st-22', name: 'Diya Mukherjee', rollNumber: 'PY24-D22', attendancePercent: 90, email: 'diya.m@institution.edu' },
  { id: 'st-23', name: 'Farhan Akhtar', rollNumber: 'PY24-D23', attendancePercent: 85, email: 'farhan.a@institution.edu' },
  { id: 'st-24', name: 'Lavanya S.', rollNumber: 'PY24-D24', attendancePercent: 98, email: 'lavanya.s@institution.edu' },
  { id: 'st-25', name: 'Nikhil Rathi', rollNumber: 'PY24-D25', attendancePercent: 82, email: 'nikhil.r@institution.edu' },
  { id: 'st-26', name: 'Prerna Chadha', rollNumber: 'PY24-D26', attendancePercent: 91, email: 'prerna.c@institution.edu' },
  { id: 'st-27', name: 'Siddharth Roy', rollNumber: 'PY24-D27', attendancePercent: 93, email: 'siddharth.r@institution.edu' },
  { id: 'st-28', name: 'Tejaswini M.', rollNumber: 'PY24-D28', attendancePercent: 87, email: 'tejaswini.m@institution.edu' }
];

function getRelativeDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const additionalStudentGroups: Student[][] = [
  [
    { id: 'st-29', name: 'Aditi Menon', rollNumber: 'PY24-M29', attendancePercent: 94, email: 'aditi.menon@institution.edu' },
    { id: 'st-30', name: 'Karan Bhat', rollNumber: 'PY24-M30', attendancePercent: 88, email: 'karan.bhat@institution.edu' },
    { id: 'st-31', name: 'Nisha Kapoor', rollNumber: 'PY24-M31', attendancePercent: 91, email: 'nisha.kapoor@institution.edu' },
    { id: 'st-32', name: 'Rahul Menon', rollNumber: 'PY24-M32', attendancePercent: 86, email: 'rahul.menon@institution.edu' }
  ],
  [
    { id: 'st-33', name: 'Sana Sheikh', rollNumber: 'PY24-T33', attendancePercent: 96, email: 'sana.sheikh@institution.edu' },
    { id: 'st-34', name: 'Vivek Nair', rollNumber: 'PY24-T34', attendancePercent: 89, email: 'vivek.nair@institution.edu' },
    { id: 'st-35', name: 'Mira Shah', rollNumber: 'PY24-T35', attendancePercent: 93, email: 'mira.shah@institution.edu' },
    { id: 'st-36', name: 'Harish Reddy', rollNumber: 'PY24-T36', attendancePercent: 87, email: 'harish.reddy@institution.edu' }
  ]
];

const seededHistoryByBatch: Record<string, { topicIds: string[]; missedReason?: string }> = {
  'batch-mwf': { topicIds: ['top-2-01', 'top-2-02', 'top-2-06'] },
  'batch-tts': {
    topicIds: ['top-2-03', 'top-2-04'],
    missedReason: 'A campus network maintenance window prevented the scheduled class.'
  },
  'batch-daily': {
    topicIds: initialModulesData[0].topics.map((topic) => topic.id),
    missedReason: 'The instructor was assigned to an institutional assessment.'
  },
  'batch-mwf-afternoon': { topicIds: ['top-2-07', 'top-2-08'] },
  'batch-tts-afternoon': {
    topicIds: ['top-2-09', 'top-2-10'],
    missedReason: 'The classroom was unavailable due to a facilities issue.'
  }
};

function getNextScheduledDate(startDate: string, scheduledDays: number[]): string {
  const date = new Date(`${startDate > getRelativeDate(0) ? startDate : getRelativeDate(0)}T00:00:00`);
  for (let offset = 0; offset < 7; offset += 1) {
    if (scheduledDays.includes(date.getDay())) return getRelativeDateFromDate(date);
    date.setDate(date.getDate() + 1);
  }
  throw new Error(`No valid weekdays configured for a batch starting ${startDate}.`);
}

function getRelativeDateFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getScheduledSessionId(batchId: string, scheduledDate: string): string {
  return `session-${batchId}-${scheduledDate}`;
}

export function generateScheduledSessions(
  schedules: ScheduleItem[],
  throughDate: string = getRelativeDate(0)
): ScheduledSyllabusSession[] {
  const sessions: ScheduledSyllabusSession[] = [];

  schedules.forEach((schedule) => {
    const date = new Date(`${schedule.startDate}T00:00:00`);
    const endDate = new Date(`${throughDate}T00:00:00`);
    let sessionNumber = 0;
    while (date <= endDate) {
      const scheduledDate = getRelativeDateFromDate(date);
      if (schedule.scheduledDays.includes(date.getDay())) {
        sessionNumber += 1;
        sessions.push({
          id: getScheduledSessionId(schedule.id, scheduledDate),
          scheduleId: schedule.id,
          batchId: schedule.batchId || schedule.id,
          moduleId: schedule.moduleId,
          scheduledDate,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          sessionNumber,
          syllabusUpdateStatus: 'Not Started'
        });
      }
      date.setDate(date.getDate() + 1);
    }
  });

  return sessions;
}

export function getInitialSchedules(): ScheduleItem[] {
  const moduleName = initialModulesData[0].name;
  const schedules: ScheduleItem[] = [
    {
      id: 'batch-mwf',
      moduleId: 'mod-2',
      moduleName,
      batch: 'MWF',
      startDate: '2026-09-01',
      scheduledDate: '',
      scheduledDays: [1, 3, 5],
      startTime: '09:00 AM',
      endTime: '11:00 AM',
      sessionNumber: 18,
      totalSessions: 40,
      roomOrLink: 'Lab 304 / Smart Board A',
      approvalStatus: 'Approved',
      syllabusUpdateStatus: 'Not Started',
      completedTopicIds: seededHistoryByBatch['batch-mwf'].topicIds,
      students: mockStudentsMWF
    },
    {
      id: 'batch-tts',
      moduleId: 'mod-2',
      moduleName,
      batch: 'TTS',
      startDate: '2026-09-15',
      scheduledDate: '',
      scheduledDays: [2, 4, 6],
      startTime: '09:00 AM',
      endTime: '11:00 AM',
      sessionNumber: 14,
      totalSessions: 40,
      roomOrLink: 'Lab 304 / Smart Board B',
      approvalStatus: 'Approved',
      syllabusUpdateStatus: 'Not Started',
      completedTopicIds: seededHistoryByBatch['batch-tts'].topicIds,
      students: mockStudentsTTS
    },
    {
      id: 'batch-daily',
      moduleId: 'mod-2',
      moduleName,
      batch: 'Everyday',
      startDate: '2026-09-01',
      scheduledDate: '',
      scheduledDays: [1, 2, 3, 4, 5, 6],
      startTime: '11:00 AM',
      endTime: '01:00 PM',
      sessionNumber: 24,
      totalSessions: 40,
      roomOrLink: 'Compute Lab 201',
      approvalStatus: 'Approved',
      syllabusUpdateStatus: 'Not Started',
      completedTopicIds: seededHistoryByBatch['batch-daily'].topicIds,
      missedReason: seededHistoryByBatch['batch-daily'].missedReason,
      students: mockStudentsAllDays
    },
    {
      id: 'batch-mwf-afternoon',
      moduleId: 'mod-2',
      moduleName,
      batch: 'MWF Afternoon',
      startDate: '2026-10-01',
      scheduledDate: '',
      scheduledDays: [1, 3, 5],
      startTime: '02:00 PM',
      endTime: '04:00 PM',
      sessionNumber: 10,
      totalSessions: 40,
      roomOrLink: 'Lab 305 / Smart Board A',
      approvalStatus: 'Approved',
      syllabusUpdateStatus: 'Not Started',
      completedTopicIds: seededHistoryByBatch['batch-mwf-afternoon'].topicIds,
      students: additionalStudentGroups[0]
    },
    {
      id: 'batch-tts-afternoon',
      moduleId: 'mod-2',
      moduleName,
      batch: 'TTS Afternoon',
      startDate: '2026-10-01',
      scheduledDate: '',
      scheduledDays: [2, 4, 6],
      startTime: '02:00 PM',
      endTime: '04:00 PM',
      sessionNumber: 8,
      totalSessions: 40,
      roomOrLink: 'Lab 305 / Smart Board B',
      approvalStatus: 'Approved',
      syllabusUpdateStatus: 'Not Started',
      completedTopicIds: seededHistoryByBatch['batch-tts-afternoon'].topicIds,
      missedReason: seededHistoryByBatch['batch-tts-afternoon'].missedReason,
      students: additionalStudentGroups[1]
    }
  ];

  schedules.forEach((schedule) => {
    schedule.scheduledDate = getNextScheduledDate(schedule.startDate, schedule.scheduledDays);
  });

  validateTrainerWorkingSchedule(schedules, []);
  const conflicts = findScheduleConflicts(schedules, getRelativeDate(90));
  if (conflicts.length > 0) {
    const descriptions = conflicts.map(
      (conflict) => `${conflict.date}: ${conflict.firstScheduleId} overlaps ${conflict.secondScheduleId}`
    );
    throw new Error(`Initial mock schedules contain conflicts:\n${descriptions.join('\n')}`);
  }

  return schedules;
}

/**
 * Admin Tasks assigned during the trainer's free hours (04:00 PM - 06:00 PM)
 * Working hours: 9 AM - 6 PM, Lunch: 1 PM - 2 PM, Classes: 9-11 AM, 11-1 PM, 2-4 PM
 */
export function getInitialAdminTasks(): AdminTask[] {
  const getWorkingDate = (offsetDays: number): string => {
    const date = new Date(`${getRelativeDate(offsetDays)}T00:00:00`);
    const direction = offsetDays < 0 ? -1 : 1;
    while (date.getDay() === 0) date.setDate(date.getDate() + direction);
    return getRelativeDateFromDate(date);
  };
  const today = getWorkingDate(0);
  const tomorrow = getWorkingDate(1);
  const yesterday = getWorkingDate(-1);

  const tasks: AdminTask[] = [
    {
      id: 'task-today-1',
      title: 'Evaluate MWF Batch OOP Mini-Project Pull Requests',
      description: 'Review GitHub pull requests for the Banking System OOP assignment submitted by MWF students. Provide code reviews on class design, inheritance, and encapsulation.',
      assignedDate: today,
      startTime: '04:00 PM',
      endTime: '05:00 PM', // During 04:00 PM - 06:00 PM Free Hours
      status: 'In Progress',
      priority: 'High',
      category: 'Evaluation & Grading',
      assignedBy: 'Academic Head (Prof. K. Verma)',
      deliverables: 'Post grades and inline code feedback on 10 student pull requests.'
    },
    {
      id: 'task-today-2',
      title: '1-on-1 Debugging Mentoring for At-Risk Students',
      description: 'Host individual 15-minute consultations during the evening free slot for students needing help with Python decorators and generators.',
      assignedDate: today,
      startTime: '05:00 PM',
      endTime: '06:00 PM', // During 04:00 PM - 06:00 PM Free Hours
      status: 'Pending',
      priority: 'Medium',
      category: 'Student Mentoring',
      assignedBy: 'Academic Counselor',
      deliverables: 'Log attendance and concept clarification notes.'
    },
    {
      id: 'task-past-1',
      title: 'Curriculum Alignment Sync with Lead Faculty',
      description: 'Weekly review of Module 2 milestone progress and synchronization with institutional exam standards.',
      assignedDate: yesterday,
      startTime: '04:00 PM',
      endTime: '05:00 PM',
      status: 'Completed',
      priority: 'Medium',
      category: 'Curriculum Review',
      assignedBy: 'Academic Dean',
      completionNotes: 'Completed review. Topics 1-10 verified on schedule.'
    },
    {
      id: 'task-future-1',
      title: 'Review Mid-Term Database Assessment Schema',
      description: 'Proofread and test SQL query problem statements for next week’s graded assessment.',
      assignedDate: tomorrow,
      startTime: '04:00 PM',
      endTime: '05:30 PM',
      status: 'Pending',
      priority: 'High',
      category: 'Curriculum Review',
      assignedBy: 'Exam Committee'
    }
  ];
  validateTrainerWorkingSchedule([], tasks);
  return tasks;
}

function getSeedActivityEvents(
  schedules: ScheduleItem[],
  sessions: ScheduledSyllabusSession[]
): SyllabusActivityEvent[] {
  const today = getRelativeDate(0);
  const events: SyllabusActivityEvent[] = [];

  schedules.forEach((schedule) => {
    const assignedModule = initialModulesData.find((item) => item.id === schedule.moduleId);
    if (!assignedModule) return;

    const pastSessions = sessions
      .filter((session) => session.scheduleId === schedule.id && session.scheduledDate < today)
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    const seed = seededHistoryByBatch[schedule.id];
    if (!seed || pastSessions.length < 3) return;

    const topicSessions = seed.topicIds.map((_, index) =>
      schedule.id === 'batch-daily'
        ? pastSessions[pastSessions.length - seed.topicIds.length - 2 + index]
        : pastSessions[pastSessions.length - (10 - index * 3)]
    );
    seed.topicIds.forEach((topicId, index) => {
      const session = topicSessions[index];
      const topic = assignedModule.topics.find((item) => item.id === topicId);
      if (!session || !topic) return;

      const [year, month, day] = session.scheduledDate.split('-').map(Number);
      const endMinutes = parseTimeToMinutes(schedule.endTime) + 15;
      const submittedAt = new Date(
        year,
        month - 1,
        day,
        Math.floor(endMinutes / 60),
        endMinutes % 60
      );
      events.push({
        id: `act-seed-${session.id}-topic-${topic.id}`,
        timestamp: submittedAt.toISOString(),
        displayDate: session.scheduledDate,
        scheduledDate: session.scheduledDate,
        batchId: schedule.batchId || schedule.id,
        moduleId: schedule.moduleId,
        moduleName: assignedModule.name,
        eventType: 'Topic Completed',
        topicId: topic.id,
        topicName: topic.title,
        topicNumber: topic.number,
        sessionId: session.id,
        sessionIdentifier: `${schedule.batch} · Session #${session.sessionNumber} (${schedule.startTime}–${schedule.endTime})`,
        savedStatus: 'Saved'
      });
      session.outcome = 'Conducted';
      session.syllabusUpdateStatus = 'Updated';
    });

    if (seed.missedReason) {
      const missedSession = pastSessions[pastSessions.length - 2];
      if (missedSession) {
        const [year, month, day] = missedSession.scheduledDate.split('-').map(Number);
        const endMinutes = parseTimeToMinutes(schedule.endTime) + 15;
        const submittedAt = new Date(
          year,
          month - 1,
          day,
          Math.floor(endMinutes / 60),
          endMinutes % 60
        );
        events.push({
          id: `act-seed-${missedSession.id}-missed`,
          timestamp: submittedAt.toISOString(),
          displayDate: missedSession.scheduledDate,
          scheduledDate: missedSession.scheduledDate,
          batchId: schedule.batchId || schedule.id,
          moduleId: schedule.moduleId,
          moduleName: assignedModule.name,
          eventType: 'Class Not Conducted',
          sessionId: missedSession.id,
          sessionIdentifier: `${schedule.batch} · Session #${missedSession.sessionNumber} (${schedule.startTime}–${schedule.endTime})`,
          reason: seed.missedReason,
          savedStatus: 'Saved'
        });
        missedSession.outcome = 'Not Conducted';
        missedSession.syllabusUpdateStatus = 'Class Not Conducted';
      }
    }
  });

  return events.sort(
    (a, b) => Date.parse(b.displayDate) - Date.parse(a.displayDate) ||
      Date.parse(b.timestamp) - Date.parse(a.timestamp)
  );
}

export function getInitialScheduledSessions(
  schedules: ScheduleItem[] = getInitialSchedules(),
  throughDate: string = getRelativeDate(0)
): ScheduledSyllabusSession[] {
  const sessions = generateScheduledSessions(schedules, throughDate);
  const events = getSeedActivityEvents(schedules, sessions);
  validateSyllabusHistoryData(schedules, sessions, events);
  return sessions;
}

export function getInitialActivityEvents(
  schedules: ScheduleItem[] = getInitialSchedules()
): SyllabusActivityEvent[] {
  const sessions = generateScheduledSessions(schedules);
  const events = getSeedActivityEvents(schedules, sessions);
  validateSyllabusHistoryData(schedules, sessions, events);
  const completedDailySchedule = schedules.find((schedule) => {
    const plannedTopics = initialModulesData
      .find((module) => module.id === schedule.moduleId)
      ?.topics.map((topic) => topic.id);
    return schedule.id === 'batch-daily' &&
      Boolean(plannedTopics?.length) &&
      plannedTopics?.every((topicId) => schedule.completedTopicIds?.includes(topicId));
  });
  const lastDailyCompletion = events
    .filter((event) =>
      event.batchId === (completedDailySchedule?.batchId || completedDailySchedule?.id) &&
      event.eventType === 'Topic Completed'
    )
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  if (completedDailySchedule && lastDailyCompletion) {
    events.push({
      id: 'act-module-finance-submission-batch-daily-mod-2',
      timestamp: '2026-11-05T04:30:00.000Z',
      displayDate: '2026-11-05',
      batchId: getScheduleBatchId(completedDailySchedule),
      batchName: completedDailySchedule.batch,
      moduleId: completedDailySchedule.moduleId,
      moduleName: completedDailySchedule.moduleName,
      trainerId: 'SA101',
      eventType: 'Module Submitted for Finance Verification',
      details: 'Sample submission by trainer SA101. Pending Finance Department verification; no actual verification is represented.',
      savedStatus: 'Saved'
    });
  }
  return events;
}

export function validateSyllabusHistoryData(
  schedules: ScheduleItem[],
  sessions: ScheduledSyllabusSession[],
  events: SyllabusActivityEvent[]
): void {
  const scheduleById = new Map(schedules.map((schedule) => [schedule.id, schedule]));
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  if (sessionById.size !== sessions.length) {
    throw new Error('Generated syllabus sessions contain duplicate IDs.');
  }

  sessions.forEach((session) => {
    const schedule = scheduleById.get(session.scheduleId);
    if (
      !schedule ||
      (schedule.batchId || schedule.id) !== session.batchId ||
      schedule.moduleId !== session.moduleId ||
      session.scheduledDate < schedule.startDate ||
      !schedule.scheduledDays.includes(
        new Date(`${session.scheduledDate}T00:00:00`).getDay()
      ) ||
      session.id !== getScheduledSessionId(session.scheduleId, session.scheduledDate) ||
      session.startTime !== schedule.startTime ||
      session.endTime !== schedule.endTime
    ) {
      throw new Error(`Generated syllabus session "${session.id}" does not match its batch schedule.`);
    }
  });

  const eventIds = new Set<string>();
  const recordedActions = new Set<string>();
  events.forEach((event) => {
    const session = event.sessionId ? sessionById.get(event.sessionId) : undefined;
    const schedule = session ? scheduleById.get(session.scheduleId) : undefined;
    if (
      eventIds.has(event.id) ||
      !session ||
      !schedule ||
      event.moduleId !== session.moduleId ||
      event.moduleId !== schedule.moduleId ||
      event.batchId !== session.batchId ||
      event.batchId !== (schedule.batchId || schedule.id) ||
      event.scheduledDate !== session.scheduledDate ||
      event.displayDate < event.scheduledDate ||
      event.savedStatus !== 'Saved' ||
      (event.eventType === 'Topic Completed' && !event.topicId) ||
      (event.eventType === 'Class Not Conducted' && !event.reason) ||
      (event.eventType === 'Topic Completed' && session.outcome !== 'Conducted') ||
      (event.eventType === 'Class Not Conducted' && session.outcome !== 'Not Conducted')
    ) {
      throw new Error(`Syllabus activity event "${event.id}" is invalid or references no scheduled session.`);
    }
    const actionKey = `${event.sessionId}|${event.eventType}|${event.topicId || ''}`;
    if (recordedActions.has(actionKey)) {
      throw new Error(`Duplicate syllabus activity record "${actionKey}".`);
    }
    eventIds.add(event.id);
    recordedActions.add(actionKey);
  });
}
