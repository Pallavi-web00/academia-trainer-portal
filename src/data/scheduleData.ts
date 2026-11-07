import {
  ScheduleItem,
  Student,
  SyllabusActivityEvent,
  AdminTask,
  ScheduledSyllabusSession
} from '../types';
import { generateAdmissionNumber } from '../utils/studentId';
import { initialModulesData } from './modulesData';
import {
  findScheduleConflicts,
  getScheduleBatchId,
  parseTimeToMinutes,
  validateTrainerWorkingSchedule
} from '../utils/dateTimeUtils';

const studentPhotoPool = [
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80'
];

const buildStudent = (
  name: string,
  attendancePercent: number,
  sequence: number,
  batchName: string,
  courseName = 'AI'
): Student => {
  const id = `STU-2026-${String(1001 + sequence).padStart(4, '0')}`;
  const priorAdmissionNumbers = Array.from({ length: sequence }, (_, index) => `ADM-2026-${String(index + 1).padStart(4, '0')}`);
  const admissionNumber = generateAdmissionNumber(priorAdmissionNumbers);
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1) || first;
  const email = `${first.toLowerCase()}.${last.toLowerCase().replace(/\./g, '')}@institution.edu`;
  const gender = sequence % 2 === 0 ? 'Male' : 'Female';
  const dateOfBirth = `200${String((sequence % 3) + 1)}-${String((sequence % 12) + 1).padStart(2, '0')}-${String((sequence % 27) + 2).padStart(2, '0')}`;
  const guardianName = `Mr. ${last} ${first}`;
  const guardianContact = `9${String(800000000 + sequence * 137).slice(0, 9)}`;

  return {
    id,
    name,
    rollNumber: id,
    attendancePercent,
    email,
    photoUrl: studentPhotoPool[sequence % studentPhotoPool.length],
    fullName: name,
    admissionNumber,
    dateOfBirth,
    gender,
    contactNumber: `+91 ${String(9000000000 + sequence * 1234).slice(0, 10)}`,
    address: `${(sequence * 13) % 99 + 10}, ${['Anna Nagar', 'T Nagar', 'Velachery', 'Adyar', 'Mylapore'][sequence % 5]}, Chennai`,
    guardianName,
    guardianContactNumber: guardianContact,
    qualification: sequence % 3 === 0 ? 'B.Tech' : sequence % 3 === 1 ? 'BBA' : 'MBA',
    courseName,
    batchName,
    admissionDate: `2026-${String((sequence % 8) + 1).padStart(2, '0')}-${String((sequence % 25) + 1).padStart(2, '0')}`,
    studentStatus: 'Active'
  };
};

export const mockStudentsMWF: Student[] = [
  buildStudent('Aarav Sharma', 92, 0, 'MWF'),
  buildStudent('Ananya Iyer', 96, 1, 'MWF'),
  buildStudent('Devansh Kulkarni', 88, 2, 'MWF'),
  buildStudent('Ishita Patel', 94, 3, 'MWF'),
  buildStudent('Kabir Malhotra', 84, 4, 'MWF'),
  buildStudent('Meera Nambiar', 100, 5, 'MWF'),
  buildStudent('Rohan Deshmukh', 90, 6, 'MWF'),
  buildStudent('Sanya Sen', 91, 7, 'MWF'),
  buildStudent('Tanmay Joshi', 85, 8, 'MWF'),
  buildStudent('Zoya Qureshi', 95, 9, 'MWF')
];

export const mockStudentsTTS: Student[] = [
  buildStudent('Aditya Verma', 89, 10, 'TTS'),
  buildStudent('Bhavna Rao', 93, 11, 'TTS'),
  buildStudent('Chetan Mehta', 86, 12, 'TTS'),
  buildStudent('Divya Nair', 97, 13, 'TTS'),
  buildStudent('Gautam Singhania', 78, 14, 'TTS'),
  buildStudent('Kavya Pillai', 92, 15, 'TTS'),
  buildStudent('Manish Pandey', 88, 16, 'TTS'),
  buildStudent('Pooja Hegde', 94, 17, 'TTS'),
  buildStudent('Rahul Chhabra', 91, 18, 'TTS'),
  buildStudent('Shruti Varma', 89, 19, 'TTS')
];

export const mockStudentsAllDays: Student[] = [
  buildStudent('Arjun Das', 95, 20, 'Daily'),
  buildStudent('Diya Mukherjee', 90, 21, 'Daily'),
  buildStudent('Farhan Akhtar', 85, 22, 'Daily'),
  buildStudent('Lavanya S.', 98, 23, 'Daily'),
  buildStudent('Nikhil Rathi', 82, 24, 'Daily'),
  buildStudent('Prerna Chadha', 91, 25, 'Daily'),
  buildStudent('Siddharth Roy', 93, 26, 'Daily'),
  buildStudent('Tejaswini M.', 87, 27, 'Daily')
];

function getRelativeDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const additionalStudentGroups: Student[][] = [
  [
    buildStudent('Aditi Menon', 94, 28, 'MWF'),
    buildStudent('Karan Bhat', 88, 29, 'MWF'),
    buildStudent('Nisha Kapoor', 91, 30, 'MWF'),
    buildStudent('Rahul Menon', 86, 31, 'MWF')
  ],
  [
    buildStudent('Sana Sheikh', 96, 32, 'TTS'),
    buildStudent('Vivek Nair', 89, 33, 'TTS'),
    buildStudent('Mira Shah', 93, 34, 'TTS'),
    buildStudent('Harish Reddy', 87, 35, 'TTS')
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
