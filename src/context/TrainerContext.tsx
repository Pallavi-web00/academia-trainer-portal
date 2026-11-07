import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import {
  ModuleData,
  ScheduleItem,
  SyllabusActivityEvent,
  TrainerProfile,
  ToastMessage,
  NotificationItem,
  AdminTask,
  AdminTaskStatus,
  FreeHourSlot,
  ScheduledSyllabusSession,
  AdminExamination,
  ExaminationMarksRecord,
  ExaminationStudentMarks,
  SyllabusAssessment,
  TopicNotesAvailabilityStatus,
  TopicNotesMetadata,
  TopicNotesRelease
} from '../types';
import { initialModulesData } from '../data/modulesData';
import { getInitialTopicNotes } from '../data/topicNotesData';
import {
  getInitialSchedules,
  getInitialActivityEvents,
  getInitialAdminTasks,
  generateScheduledSessions,
  getInitialScheduledSessions,
  getScheduledSessionId
} from '../data/scheduleData';
import { trainerProfile } from '../data/trainerData';
import {
  getCurrentDateISO,
  formatReadableDate,
  parseTimeToMinutes,
  isBatchScheduledOnDate,
  getPendingTodaySessions,
  getScheduleBatchId,
  isScheduleAssignedToTrainer
} from '../utils/dateTimeUtils';
import { generateReminders } from '../utils/reminderLogic';
import {
  areAllStudentsAssessmentQualified,
  getQualifyingAssessmentResults,
  getStudentsRequiringNextAssessment,
  hasModuleFinanceSubmission,
  hasSavedTopicCompletion,
  isModuleReadyForFinanceVerification
} from '../utils/syllabusAssessment';
import { createFinanceModuleSubmissionNotification } from '../utils/financeNotifications';
import {
  createAdminMarksSubmittedNotification,
  getAdminExaminationNotifications,
  getInitialAdminExaminations,
  getPublishedAdminExaminations
} from '../data/examinationData';
import {
  createSyllabusAssessmentQuestions,
  getInitialAssessmentActivityEvents,
  getInitialSyllabusAssessments,
  mergeInitialSyllabusAssessments
} from '../data/syllabusAssessmentData';
import {
  clearAllTopicNotes,
  createTopicNotesId,
  createTopicNotesReleaseId,
  getAllTopicNotes,
  getTopicNotesFileValidationError,
  getTopicNotesFile,
  MAX_TOPIC_NOTES_FILE_SIZE_BYTES,
  saveTopicNotes
} from '../utils/topicNotesStorage';
import {
  getMarksValidationError,
  isExaminationMarksEntryOpen,
  sanitizePersistedExaminationMarks
} from '../utils/examinationMarks';
import { getTopicNotesAvailabilityStatus } from '../utils/topicNotesAvailability';
import {
  migrateStudentIdReferences,
  normalizeScheduleStudentIds
} from '../utils/studentId';

interface TrainerContextType {
  trainer: TrainerProfile;
  modules: ModuleData[];
  module: ModuleData; // The single active module: Advanced Python & Database foundation
  schedules: ScheduleItem[];
  syllabusSessions: ScheduledSyllabusSession[];
  currentTime: Date;
  adminTasks: AdminTask[];
  todayAdminTasks: AdminTask[];
  pendingAdminTasksCount: number;
  freeHourSlots: FreeHourSlot[];
  activityHistory: SyllabusActivityEvent[];
  notifications: NotificationItem[];
  examinations: AdminExamination[];
  examinationMarks: ExaminationMarksRecord[];
  syllabusAssessments: SyllabusAssessment[];
  topicNotes: TopicNotesMetadata[];
  topicNotesReleases: TopicNotesRelease[];
  topicNotesLoaded: boolean;
  activeRemindersCount: number;
  pendingApprovalsCount: number;
  todayClassesCount: number;
  completedSessionsCount: number;
  syllabusPendingCount: number;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  approveSchedule: (scheduleId: string) => void;
  requestScheduleChange: (scheduleId: string, reason: string) => boolean;
  submitModuleForFinanceVerification: (batchId: string, moduleId: string) => boolean;
  sendSyllabusAssessment: (batchId: string, moduleId: string, topicId: string) => SyllabusAssessment | undefined;
  simulateSyllabusAssessmentResponses: (assessmentId: string) => void;
  conductTopicAgain: (batchId: string, moduleId: string, topicId: string) => boolean;
  uploadTopicNotes: (
    file: File,
    moduleId: string,
    topicId: string
  ) => Promise<boolean>;
  getTopicNotesAvailability: (
    batchId: string,
    moduleId: string,
    topicId: string
  ) => { status: TopicNotesAvailabilityStatus; notes?: TopicNotesMetadata };
  downloadTopicNotes: (notes: TopicNotesMetadata, batchId: string) => Promise<boolean>;
  recordClassNotConducted: (payload: {
    moduleId: string;
    scheduledDate: string;
    sessionIds: string[];
    reason: string;
  }) => { success: boolean; message?: string };
  updateAdminTaskStatus: (taskId: string, status: AdminTaskStatus, notes?: string) => void;
  resolveNotification: (notificationId: string) => void;
  saveExaminationMarks: (examinationId: string, studentMarks: ExaminationStudentMarks[]) => boolean;
  submitExaminationMarks: (examinationId: string, studentMarks: ExaminationStudentMarks[]) => boolean;
  resetAllMockData: () => void;
}

const TrainerContext = createContext<TrainerContextType | undefined>(undefined);

const STORAGE_KEYS = {
  MODULES: 'academia_trainer_modules_v6',
  SCHEDULES: 'academia_trainer_schedules_v10',
  SESSIONS: 'academia_trainer_sessions_v1',
  ACTIVITY: 'academia_trainer_activity_v10',
  ADMIN_TASKS: 'academia_trainer_admin_tasks_v6',
  RESOLVED_NOTIFS: 'academia_trainer_resolved_notifs_v10',
  EXAMINATIONS: 'academia_trainer_admin_examinations_v1',
  EXAMINATION_MARKS: 'academia_trainer_examination_marks_v1',
  ASSESSMENTS: 'academia_trainer_syllabus_assessments_v1',
  NOTES_RELEASES: 'academia_trainer_topic_notes_releases_v1'
};

export const TrainerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [trainer] = useState<TrainerProfile>(trainerProfile);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const moduleFinanceSubmissionLocks = useRef(new Set<string>());
  const examinationMarksLocks = useRef(new Set<string>());
  const syllabusAssessmentSendAttempts = useRef(new Map<string, number>());

  useEffect(() => {
    const timerId = window.setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => window.clearInterval(timerId);
  }, []);

  // Load modules (only Advanced Python & Database foundation)
  const [modules, setModules] = useState<ModuleData[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MODULES);
      if (saved) {
        const parsed: ModuleData[] = JSON.parse(saved);
        // Ensure only mod-2 exists
        const filtered = parsed.filter(m => m.id === 'mod-2');
        if (filtered.length > 0) return filtered;
      }
      return initialModulesData;
    } catch {
      return initialModulesData;
    }
  });

  // Load schedules
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
      if (!saved) return getInitialSchedules();

      const parsed: ScheduleItem[] = JSON.parse(saved);
      const initialSchedules = getInitialSchedules();
      const initialById = new Map(
        initialSchedules.map((schedule) => [schedule.id, schedule])
      );
      const normalized = normalizeScheduleStudentIds(parsed).schedules.map((schedule) => {
        const initial = initialById.get(schedule.id);
        const seedCompletedTopics = schedule.id === 'batch-daily' &&
          schedule.moduleId === initial?.moduleId
          ? initial.completedTopicIds || []
          : [];
        return {
          ...schedule,
          scheduledDays: initial?.scheduledDays ?? schedule.scheduledDays,
          completedTopicIds: [...new Set([...(schedule.completedTopicIds || []), ...seedCompletedTopics])]
        };
      });
      return normalized;
    } catch {
      return normalizeScheduleStudentIds(getInitialSchedules()).schedules;
    }
  });

  const studentIdMap = useMemo(() => {
    const mapped = normalizeScheduleStudentIds(schedules);
    return mapped.idMap;
  }, [schedules]);

  const [syllabusAssessments, setSyllabusAssessments] = useState<SyllabusAssessment[]>(() => {
    const initialAssessments = getInitialSyllabusAssessments(schedules, initialModulesData[0]);
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ASSESSMENTS);
      if (!saved) return initialAssessments;

      const savedAssessments = JSON.parse(saved) as SyllabusAssessment[];
      const migratedAssessments = savedAssessments.map((assessment) => ({
        ...assessment,
        students: assessment.students.map((student) => ({
          ...student,
          studentId: studentIdMap.get(student.studentId) ?? student.studentId
        }))
      }));

      return mergeInitialSyllabusAssessments(migratedAssessments, initialAssessments);
    } catch {
      return initialAssessments;
    }
  });

  const [examinations, setExaminations] = useState<AdminExamination[]>(() => {
    const initialExaminations = getInitialAdminExaminations(schedules);
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXAMINATIONS);
      if (!saved) return initialExaminations;
      const savedExaminations = JSON.parse(saved) as AdminExamination[];
      const migratedExaminations = savedExaminations.map((examination) => {
        const matchingSchedule = schedules.find((schedule) =>
          getScheduleBatchId(schedule) === examination.batchId &&
          schedule.moduleId === examination.moduleId
        );
        return {
          ...examination,
          eligibleStudents: examination.eligibleStudents.map((student) => ({
            ...student,
            studentId: studentIdMap.get(student.studentId) ??
              matchingSchedule?.students.find((item) => item.id === student.studentId)?.id ??
              matchingSchedule?.students.find((item) => item.name === student.studentName)?.id ??
              student.studentId
          }))
        };
      });
      const savedById = new Map(migratedExaminations.map((examination) => [examination.id, examination]));
      const initialIds = new Set(initialExaminations.map((examination) => examination.id));
      return [
        ...initialExaminations.map((examination) => {
          const savedExamination = savedById.get(examination.id);
          if (!savedExamination) return examination;
          if (examination.id === 'ADM-EXAM-DAILY-MOD2-2026') {
            return { ...examination, scheduleUpdates: savedExamination.scheduleUpdates || [] };
          }
          return savedExamination;
        }),
        ...migratedExaminations.filter((examination) => !initialIds.has(examination.id))
      ];
    } catch {
      return initialExaminations;
    }
  });
  const [examinationMarks, setExaminationMarks] = useState<ExaminationMarksRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXAMINATION_MARKS);
      if (!saved) return [];
      const persistedMarks = JSON.parse(saved) as ExaminationMarksRecord[];
      const migratedMarks = persistedMarks.map((record) => ({
        ...record,
        studentMarks: record.studentMarks.map((studentMark) => ({
          ...studentMark,
          studentId: studentIdMap.get(studentMark.studentId) ?? studentMark.studentId
        }))
      }));
      return sanitizePersistedExaminationMarks(
        examinations,
        migratedMarks,
        currentTime
      );
    } catch {
      return [];
    }
  });
  const submittedExaminationIds = useRef(new Set(
    examinationMarks
      .filter((record) => record.status === 'Submitted')
      .map((record) => record.examinationId)
  ));

  const [topicNotes, setTopicNotes] = useState<TopicNotesMetadata[]>([]);
  const [topicNotesReleases, setTopicNotesReleases] = useState<TopicNotesRelease[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTES_RELEASES);
      return saved ? JSON.parse(saved) as TopicNotesRelease[] : [];
    } catch {
      return [];
    }
  });
  const [topicNotesLoaded, setTopicNotesLoaded] = useState(false);

  const [syllabusSessions, setSyllabusSessions] = useState<ScheduledSyllabusSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      const generated = getInitialScheduledSessions(schedules);
      if (!saved) return generated;

      const savedSessions: ScheduledSyllabusSession[] = JSON.parse(saved);
      return generated.map((session) => {
        const savedSession = savedSessions.find((candidate) => candidate.id === session.id);
        return savedSession
          ? {
              ...session,
              outcome: savedSession.outcome,
              syllabusUpdateStatus: savedSession.syllabusUpdateStatus
            }
          : session;
      });
    } catch {
      return getInitialScheduledSessions(schedules);
    }
  });

  // Load admin tasks (assigned during trainer's free hours)
  const [adminTasks, setAdminTasks] = useState<AdminTask[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ADMIN_TASKS);
      return saved ? JSON.parse(saved) : getInitialAdminTasks();
    } catch {
      return getInitialAdminTasks();
    }
  });

  // Load activity history
  const [activityHistory, setActivityHistory] = useState<SyllabusActivityEvent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVITY);
      if (!saved) {
        const initialAssessments = getInitialSyllabusAssessments(schedules, initialModulesData[0]);
        return [
          ...getInitialActivityEvents(schedules),
          ...getInitialAssessmentActivityEvents(initialAssessments, initialModulesData[0])
        ];
      }

      const parsed: SyllabusActivityEvent[] = JSON.parse(saved);
      const migratedEvents = parsed.flatMap<SyllabusActivityEvent>((event) => {
        if (event.id.startsWith('act-seed-')) return [];
        if (event.id === 'act-module-finance-submission-batch-daily-mod-2') return [];
        if (event.assessmentId) {
          const schedule = schedules.find(
            (item) => getScheduleBatchId(item) === event.batchId && item.moduleId === event.moduleId
          );
          const topic = initialModulesData
            .find((item) => item.id === event.moduleId)
            ?.topics.find((item) => item.id === event.topicId);
          return schedule && topic ? [{ ...event, topicName: topic.title, topicNumber: topic.number }] : [];
        }
        const matchingBySession = schedules.filter(
          (schedule) =>
            schedule.moduleId === event.moduleId &&
            (schedule.id === event.sessionId ||
              event.sessionId?.startsWith(`session-${schedule.id}-`))
        );
        const matchingByBatch = schedules.filter(
          (schedule) =>
            schedule.moduleId === event.moduleId &&
            (schedule.id === event.batchId || schedule.batchId === event.batchId)
        );
        const matchingSchedule =
          matchingBySession.length === 1
            ? matchingBySession[0]
            : matchingBySession.length === 0 && matchingByBatch.length === 1
            ? matchingByBatch[0]
            : undefined;
        if (
          event.eventType === 'Topic Notes Uploaded' ||
          event.eventType === 'Topic Notes Updated' ||
          event.eventType === 'Topic Notes Released'
        ) {
          const topic = initialModulesData
            .find((item) => item.id === event.moduleId)
            ?.topics.find((item) => item.id === event.topicId);
          return matchingSchedule && topic
            ? [{
                ...event,
                batchId: getScheduleBatchId(matchingSchedule),
                topicName: topic.title,
                topicNumber: topic.number
              }]
            : [];
        }
        if (event.eventType === 'Module Submitted for Finance Verification') {
          return matchingSchedule &&
            event.savedStatus === 'Saved' &&
            /^\d{4}-\d{2}-\d{2}$/.test(event.displayDate) &&
            Number.isFinite(Date.parse(event.timestamp))
            ? [{ ...event, batchId: getScheduleBatchId(matchingSchedule), batchName: matchingSchedule.batch }]
            : [];
        }
        const scheduledDate = event.scheduledDate || event.displayDate;
        if (
          !matchingSchedule ||
          !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate) ||
          scheduledDate > getCurrentDateISO() ||
          scheduledDate < matchingSchedule.startDate ||
          !/^\d{4}-\d{2}-\d{2}$/.test(event.displayDate || scheduledDate) ||
          (event.displayDate || scheduledDate) < scheduledDate ||
          !matchingSchedule.scheduledDays.includes(
            new Date(`${scheduledDate}T00:00:00`).getDay()
          ) ||
          event.savedStatus !== 'Saved'
        ) return [];

        const matchingTopic = initialModulesData
          .find((item) => item.id === event.moduleId)
          ?.topics.find(
            (topic) =>
            topic.id === event.topicId ||
            topic.number === event.topicNumber ||
            topic.title === event.topicName
          );

        if (event.eventType === 'Topic Completed' && !matchingTopic) return [];
        if (event.eventType === 'Class Not Conducted' && !event.reason) return [];
        return [{
          ...event,
          displayDate: event.displayDate || scheduledDate,
          scheduledDate,
          batchId: getScheduleBatchId(matchingSchedule),
          sessionId: getScheduledSessionId(matchingSchedule.id, scheduledDate),
          topicId: event.topicId || matchingTopic?.id
        }];
      });

      const initialAssessments = getInitialSyllabusAssessments(schedules, initialModulesData[0]);
      const seededEvents = [
        ...getInitialActivityEvents(schedules),
        ...getInitialAssessmentActivityEvents(initialAssessments, initialModulesData[0])
      ];
      const eventKey = (event: SyllabusActivityEvent) =>
        event.eventType === 'Topic Notes Uploaded'
          ? event.id
          : event.assessmentId
          ? `${event.assessmentId}|${event.id}`
          : [event.batchId, event.moduleId, event.eventType, event.topicId || '', event.sessionId || ''].join('|');
      const uniqueEvents = new Map<string, SyllabusActivityEvent>();
      [...seededEvents, ...migratedEvents].forEach((event) => uniqueEvents.set(eventKey(event), event));
      const mergedEvents = [...uniqueEvents.values()];
      const conductedSessionIds = new Set(
        mergedEvents
          .filter((event) => event.eventType === 'Topic Completed')
          .map((event) => event.sessionId)
      );
      return mergedEvents.filter(
        (event) => !(event.eventType === 'Class Not Conducted' && conductedSessionIds.has(event.sessionId))
      ).sort(
        (a, b) => Date.parse(b.displayDate) - Date.parse(a.displayDate) ||
          Date.parse(b.timestamp) - Date.parse(a.timestamp)
      );
    } catch {
      return getInitialActivityEvents();
    }
  });

  // Load resolved notification IDs
  const [resolvedNotifIds, setResolvedNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RESOLVED_NOTIFS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Persist state updates to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MODULES, JSON.stringify(modules));
  }, [modules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(syllabusSessions));
  }, [syllabusSessions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ADMIN_TASKS, JSON.stringify(adminTasks));
  }, [adminTasks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activityHistory));
  }, [activityHistory]);

  useEffect(() => {
    setSyllabusSessions((previous) => {
      let changed = false;
      const next = previous.map((session) => {
        const recordedEvents = activityHistory.filter(
          (event) =>
            event.sessionId === session.id &&
            event.batchId === session.batchId &&
            event.moduleId === session.moduleId &&
            event.scheduledDate === session.scheduledDate &&
            event.savedStatus === 'Saved'
        );
        const missed = recordedEvents.some((event) => event.eventType === 'Class Not Conducted');
        const conducted = recordedEvents.some((event) => event.eventType === 'Topic Completed');
        const outcome: ScheduledSyllabusSession['outcome'] = missed
          ? 'Not Conducted'
          : conducted
          ? 'Conducted'
          : undefined;
        const status: ScheduledSyllabusSession['syllabusUpdateStatus'] = missed
          ? 'Class Not Conducted'
          : conducted
          ? 'Updated'
          : 'Not Started';
        if (session.outcome === outcome && session.syllabusUpdateStatus === status) return session;
        changed = true;
        return { ...session, outcome, syllabusUpdateStatus: status };
      });
      return changed ? next : previous;
    });

    setModules((previous) => {
      let changed = false;
      const completedTopicEvents = activityHistory
        .filter((event) => event.savedStatus === 'Saved' && event.eventType === 'Topic Completed')
        .reduce((latestByTopic, event) => {
          if (!event.topicId) return latestByTopic;
          const current = latestByTopic.get(event.topicId);
          if (!current || event.displayDate > current.displayDate) {
            latestByTopic.set(event.topicId, event);
          }
          return latestByTopic;
        }, new Map<string, SyllabusActivityEvent>());
      const next = previous.map((item) => ({
        ...item,
        topics: item.topics.map((topic) => {
          const event = completedTopicEvents.get(topic.id);
          const isCompleted = Boolean(event);
          const completedDate = event?.displayDate;
          if (
            topic.isCompleted === isCompleted &&
            topic.completedDate === completedDate &&
            topic.completedSessionId === undefined
          ) return topic;
          changed = true;
          return {
            ...topic,
            isCompleted,
            completedDate,
            completedSessionId: undefined
          };
        })
      }));
      return changed ? next : previous;
    });

    const topicIdsByBatch = new Map<string, Set<string>>();
    activityHistory.forEach((event) => {
      if (event.savedStatus !== 'Saved' || event.eventType !== 'Topic Completed' || !event.topicId) return;
      const ids = topicIdsByBatch.get(event.batchId) || new Set<string>();
      ids.add(event.topicId);
      topicIdsByBatch.set(event.batchId, ids);
    });
    setSchedules((previous) => {
      let changed = false;
      const next = previous.map((schedule) => {
        const completedTopicIds = [...(topicIdsByBatch.get(getScheduleBatchId(schedule)) || [])];
        if (
          completedTopicIds.length === (schedule.completedTopicIds || []).length &&
          completedTopicIds.every((id) => schedule.completedTopicIds?.includes(id))
        ) return schedule;
        changed = true;
        return { ...schedule, completedTopicIds };
      });
      return changed ? next : previous;
    });
  }, [activityHistory]);

  useEffect(() => {
    const today = getCurrentDateISO();
    const generated = generateScheduledSessions(schedules, today);
    setSyllabusSessions((previous) => {
      const existingIds = new Set(previous.map((session) => session.id));
      const newSessions = generated.filter((session) => !existingIds.has(session.id));
      return newSessions.length > 0 ? [...previous, ...newSessions] : previous;
    });
  }, [schedules, currentTime]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RESOLVED_NOTIFS, JSON.stringify(resolvedNotifIds));
  }, [resolvedNotifIds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXAMINATIONS, JSON.stringify(examinations));
  }, [examinations]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXAMINATION_MARKS, JSON.stringify(examinationMarks));
  }, [examinationMarks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(syllabusAssessments));
  }, [syllabusAssessments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTES_RELEASES, JSON.stringify(topicNotesReleases));
  }, [topicNotesReleases]);

  // Toast Management
  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  useEffect(() => {
    let isActive = true;
    getAllTopicNotes()
      .then(async (savedNotes) => {
        let notes = savedNotes;
        if (notes.length === 0) {
          const assignedModule = modules.find((item) =>
            schedules.some(
              (schedule) =>
                schedule.moduleId === item.id &&
                isScheduleAssignedToTrainer(schedule, trainer)
            )
          );
          if (assignedModule) {
            const initialNotes = getInitialTopicNotes(assignedModule, trainer.trainerId);
            await Promise.all(
              initialNotes.map(({ metadata, file }) => saveTopicNotes(metadata, file))
            );
            notes = await getAllTopicNotes();
            const seededEvents: SyllabusActivityEvent[] = initialNotes.flatMap(({ metadata }) => {
              const topic = assignedModule.topics.find((item) => item.id === metadata.topicId);
              if (!topic) return [];
              return schedules
                .filter((schedule) =>
                  schedule.moduleId === assignedModule.id &&
                  isScheduleAssignedToTrainer(schedule, trainer)
                )
                .map((schedule) => ({
                  id: `${metadata.id}-seed-uploaded-${getScheduleBatchId(schedule)}`,
                  timestamp: metadata.uploadedAt,
                  displayDate: metadata.uploadedAt.slice(0, 10),
                  batchId: getScheduleBatchId(schedule),
                  moduleId: assignedModule.id,
                  moduleName: assignedModule.name,
                  eventType: 'Topic Notes Uploaded' as const,
                  topicId: topic.id,
                  topicName: topic.title,
                  topicNumber: topic.number,
                  details: `Sample notes document ${metadata.fileName} is prepared. Batch access remains assessment-gated.`,
                  savedStatus: 'Saved' as const
                }));
            });
            if (isActive) {
              setActivityHistory((previous) => {
                const existingIds = new Set(previous.map((event) => event.id));
                const newEvents = seededEvents.filter((event) => !existingIds.has(event.id));
                return newEvents.length > 0 ? [...newEvents, ...previous] : previous;
              });
            }
          }
        }
        if (isActive) setTopicNotes(notes);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unable to load saved topic notes.';
        addToast({ type: 'error', title: 'Notes Storage Unavailable', message });
      })
      .finally(() => {
        if (isActive) setTopicNotesLoaded(true);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Schedule Approval
  const approveSchedule = (scheduleId: string) => {
    setSchedules((prev) =>
      prev.map((item) =>
        item.id === scheduleId
          ? { ...item, approvalStatus: 'Approved' }
          : item
      )
    );
    addToast({
      type: 'success',
      title: 'Schedule Approved',
      message: 'The class schedule has been confirmed in your roster.'
    });
  };

  // Schedule Change Request
  const requestScheduleChange = (scheduleId: string, reason: string): boolean => {
    if (!reason || reason.trim().length < 5) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please provide a clear reason for the schedule change request (at least 5 characters).'
      });
      return false;
    }

    setSchedules((prev) =>
      prev.map((item) =>
        item.id === scheduleId
          ? { ...item, approvalStatus: 'Change Requested', changeRequestReason: reason.trim() }
          : item
      )
    );

    addToast({
      type: 'success',
      title: 'Change Request Saved',
      message: 'Change request submitted and prepared for administrative review.'
    });
    return true;
  };

  const recordAssessmentActivity = (
    assessment: SyllabusAssessment,
    eventType: SyllabusActivityEvent['eventType'],
    details: string,
    timestamp = new Date().toISOString()
  ) => {
    const targetModule = modules.find((item) => item.id === assessment.moduleId);
    const topic = targetModule?.topics.find((item) => item.id === assessment.topicId);
    if (!targetModule || !topic) return;

    const event: SyllabusActivityEvent = {
      id: `${assessment.id}-${eventType.toLowerCase().replaceAll(' ', '-')}-${Date.now()}`,
      timestamp,
      displayDate: timestamp.slice(0, 10),
      batchId: assessment.batchId,
      moduleId: assessment.moduleId,
      moduleName: targetModule.name,
      eventType,
      topicId: topic.id,
      topicName: topic.title,
      topicNumber: topic.number,
      assessmentId: assessment.id,
      details,
      savedStatus: 'Saved'
    };
    setActivityHistory((previous) => [event, ...previous]);
  };

  const latestSyllabusAssessment = (batchId: string, moduleId: string, topicId: string) =>
    syllabusAssessments
      .filter((assessment) =>
        assessment.batchId === batchId &&
        assessment.moduleId === moduleId &&
        assessment.topicId === topicId
      )
      .sort((a, b) => b.attempt - a.attempt || b.sentAt.localeCompare(a.sentAt))[0];

  const completeAssessedTopic = (
    assessment: SyllabusAssessment,
    assessmentHistory: SyllabusAssessment[]
  ) => {
    const schedule = schedules.find(
      (item) => getScheduleBatchId(item) === assessment.batchId && item.moduleId === assessment.moduleId
    );
    const targetModule = modules.find((item) => item.id === assessment.moduleId);
    const topic = targetModule?.topics.find((item) => item.id === assessment.topicId);
    if (
      !schedule ||
      !targetModule ||
      !topic ||
      !areAllStudentsAssessmentQualified(assessment, schedule.students, assessmentHistory)
    ) return;

    const alreadyCompleted = hasSavedTopicCompletion(
      activityHistory,
      schedule.completedTopicIds || [],
      assessment.batchId,
      assessment.moduleId,
      assessment.topicId
    );
    if (alreadyCompleted) return;

    const qualifyingResults = getQualifyingAssessmentResults(
      assessmentHistory.filter((item) =>
        item.batchId === assessment.batchId &&
        item.moduleId === assessment.moduleId &&
        item.topicId === assessment.topicId
      )
    );
    const finalAssessmentResult = schedule.students
      .map((student) => {
        const result = qualifyingResults.get(student.id);
        const percentage = result?.score === null || result?.score === undefined
          ? 'No qualifying score'
          : `${(result.score / 10) * 100}%`;
        return `${student.name}: ${percentage}`;
      })
      .join('; ');
    const completedAt = assessment.completedAt || new Date().toISOString();
    const event: SyllabusActivityEvent = {
      id: `act-topic-completed-${assessment.batchId}-${assessment.moduleId}-${assessment.topicId}`,
      timestamp: completedAt,
      displayDate: completedAt.slice(0, 10),
      batchId: assessment.batchId,
      batchName: schedule.batch,
      moduleId: assessment.moduleId,
      moduleName: targetModule.name,
      eventType: 'Topic Completed',
      topicId: topic.id,
      topicName: topic.title,
      topicNumber: topic.number,
      assessmentId: assessment.id,
      assessmentCompletionStatus: 'Completed',
      finalAssessmentResult,
      details: `All ${schedule.students.length} students completed the assessment and scored above 75%. Final results: ${finalAssessmentResult}`,
      savedStatus: 'Saved'
    };

    setSchedules((previous) =>
      previous.map((item) =>
        item.id === schedule.id
          ? {
              ...item,
              syllabusUpdateStatus: 'Updated',
              completedTopicIds: [...new Set([...(item.completedTopicIds || []), topic.id])]
            }
          : item
      )
    );
    setActivityHistory((previous) => {
      const alreadyRecorded = hasSavedTopicCompletion(
        previous,
        [],
        event.batchId,
        event.moduleId,
        topic.id
      );
      return alreadyRecorded ? previous : [event, ...previous];
    });
    addToast({
      type: 'success',
      title: 'Topic Automatically Completed',
      message: `${topic.title} for ${schedule.batch} is complete. Every student scored above 75%.`
    });
  };

  const submitModuleForFinanceVerification = (batchId: string, moduleId: string): boolean => {
    const schedule = schedules.find(
      (item) => getScheduleBatchId(item) === batchId && item.moduleId === moduleId
    );
    const targetModule = modules.find((item) => item.id === moduleId);
    if (!schedule || !targetModule) {
      addToast({
        type: 'error',
        title: 'Unable to Submit Module',
        message: 'The selected batch or module could not be matched.'
      });
      return false;
    }

    const submissionKey = `${batchId}|${moduleId}`;
    const alreadySubmitted = moduleFinanceSubmissionLocks.current.has(submissionKey) ||
      hasModuleFinanceSubmission(activityHistory, batchId, moduleId);
    if (alreadySubmitted) {
      addToast({
        type: 'info',
        title: 'Module Already Submitted',
        message: `${targetModule.name} has already been submitted for this batch.`
      });
      return false;
    }

    const isEligible = isModuleReadyForFinanceVerification({
      topicIds: targetModule.topics.map((topic) => topic.id),
      batchId,
      moduleId,
      students: schedule.students,
      completedTopicIds: schedule.completedTopicIds || [],
      activityHistory,
      assessments: syllabusAssessments
    });
    if (!isEligible) {
      addToast({
        type: 'warning',
        title: 'Module Not Ready',
        message: 'Every planned topic must be recorded as completed after all students pass its MCQ assessment above 75%.'
      });
      return false;
    }

    const timestamp = new Date().toISOString();
    const event: SyllabusActivityEvent = {
      id: `act-module-finance-submission-${batchId}-${moduleId}`,
      timestamp,
      displayDate: timestamp.slice(0, 10),
      batchId,
      batchName: schedule.batch,
      moduleId,
      moduleName: targetModule.name,
      sessionId: schedule.id,
      trainerId: trainer.trainerId,
      eventType: 'Module Submitted for Finance Verification',
      details: `Submitted by ${trainer.name} (${trainer.trainerId}) for independent Finance Department verification. No examination has been scheduled or approved.`,
      savedStatus: 'Saved'
    };

    moduleFinanceSubmissionLocks.current.add(submissionKey);
    setActivityHistory((previous) => {
      const alreadyRecorded = previous.some((item) =>
        item.batchId === batchId &&
        item.moduleId === moduleId &&
        item.eventType === 'Module Submitted for Finance Verification' &&
        item.savedStatus === 'Saved'
      );
      return alreadyRecorded ? previous : [event, ...previous];
    });
    addToast({
      type: 'success',
      title: 'Module Submitted',
      message: 'Module successfully submitted for Finance Department verification. The Finance Department will verify student eligibility for the examination.'
    });
    return true;
  };

  const getTopicNotesAvailability = (
    batchId: string,
    moduleId: string,
    topicId: string
  ): { status: TopicNotesAvailabilityStatus; notes?: TopicNotesMetadata } => {
    const schedule = schedules.find(
      (item) => getScheduleBatchId(item) === batchId && item.moduleId === moduleId
    );
    if (!schedule || !isScheduleAssignedToTrainer(schedule, trainer)) {
      return { status: 'Notes Locked' };
    }

    const notes = topicNotes.find(
      (item) => item.moduleId === moduleId && item.topicId === topicId
    );
    const hasSavedCompletion = hasSavedTopicCompletion(
      activityHistory,
      schedule.completedTopicIds || [],
      batchId,
      moduleId,
      topicId
    );
    const status = getTopicNotesAvailabilityStatus(hasSavedCompletion, Boolean(notes));
    return status === 'Notes Uploaded'
      ? { status, notes }
      : { status };
  };

  useEffect(() => {
    if (!topicNotesLoaded) return;

    const releaseEvents: SyllabusActivityEvent[] = [];
    const releasesById = new Map(topicNotesReleases.map((release) => [release.id, release]));
    let releasesChanged = false;

    schedules
      .filter((schedule) => isScheduleAssignedToTrainer(schedule, trainer))
      .forEach((schedule) => {
        const batchId = getScheduleBatchId(schedule);
        topicNotes
          .filter((notes) => notes.moduleId === schedule.moduleId)
          .forEach((notes) => {
            const id = createTopicNotesReleaseId(batchId, notes.moduleId, notes.topicId);
            const current = releasesById.get(id);
            const completionEvent = activityHistory.find(
              (event) =>
                event.batchId === batchId &&
                event.moduleId === notes.moduleId &&
                event.topicId === notes.topicId &&
                event.eventType === 'Topic Completed' &&
                event.savedStatus === 'Saved'
            );
            const topicIsCompleted = hasSavedTopicCompletion(
              activityHistory,
              schedule.completedTopicIds || [],
              batchId,
              notes.moduleId,
              notes.topicId
            );
            const assessment = latestSyllabusAssessment(batchId, notes.moduleId, notes.topicId);
            if (!topicIsCompleted) return;
            if (current?.notesVersion === notes.version) return;

            const topic = modules
              .find((item) => item.id === notes.moduleId)
              ?.topics.find((item) => item.id === notes.topicId);
            const releasedAt = notes.lastUpdatedAt;
            releasesById.set(id, {
              id,
              batchId,
              moduleId: notes.moduleId,
              topicId: notes.topicId,
              notesId: notes.id,
              notesVersion: notes.version,
              assessmentCompletionStatus: 'Completed',
              availabilityStatus: 'Notes Uploaded',
              releasedAt
            });
            releasesChanged = true;
            releaseEvents.push({
              id: `${id}-v${notes.version}`,
              timestamp: releasedAt,
              displayDate: releasedAt.slice(0, 10),
              batchId,
              moduleId: notes.moduleId,
              moduleName: schedule.moduleName,
              eventType: current ? 'Topic Notes Updated' : 'Topic Notes Released',
              topicId: notes.topicId,
              topicName: completionEvent?.topicName || topic?.title,
              topicNumber: completionEvent?.topicNumber || topic?.number,
              assessmentId: assessment?.id,
              relatedCompletionEventId: completionEvent?.id,
              details: current
                ? `Updated notes v${notes.version} (${notes.fileName}) are available to this batch.`
                : `Notes v${notes.version} (${notes.fileName}) were automatically released to this batch.`,
              savedStatus: 'Saved'
            });
          });
      });

    if (releasesChanged) setTopicNotesReleases([...releasesById.values()]);

    if (releaseEvents.length > 0) {
      setActivityHistory((previous) => {
        const existingIds = new Set(previous.map((event) => event.id));
        const newEvents = releaseEvents.filter((event) => !existingIds.has(event.id));
        return newEvents.length > 0 ? [...newEvents, ...previous] : previous;
      });
    }
  }, [topicNotesLoaded, topicNotes, topicNotesReleases, schedules, trainer.assignedBatches, activityHistory, syllabusAssessments, modules]);

  const uploadTopicNotes = async (
    file: File,
    moduleId: string,
    topicId: string
  ): Promise<boolean> => {
    const fileValidationError = getTopicNotesFileValidationError(file);
    if (fileValidationError) {
      addToast({
        type: 'error',
        title: file.size > MAX_TOPIC_NOTES_FILE_SIZE_BYTES ? 'Notes File Too Large' : 'Invalid Notes File',
        message: fileValidationError
      });
      return false;
    }

    const targetModule = modules.find((item) => item.id === moduleId);
    const topic = targetModule?.topics.find((item) => item.id === topicId);
    const assignedSchedules = schedules.filter(
      (schedule) =>
        schedule.moduleId === moduleId &&
        isScheduleAssignedToTrainer(schedule, trainer)
    );
    if (
      !targetModule ||
      !topic ||
      assignedSchedules.length === 0
    ) {
      addToast({
        type: 'error',
        title: 'Module Not Assigned',
        message: 'Notes can only be prepared for a topic in a module assigned to your trainer account.'
      });
      return false;
    }

    const notesId = createTopicNotesId(moduleId, topicId);
    const existingNotes = topicNotes.find((notes) => notes.id === notesId);
    const lastUpdatedAt = new Date().toISOString();
    const version = (existingNotes?.version || 0) + 1;
    const metadata: TopicNotesMetadata = {
      id: notesId,
      trainerId: trainer.trainerId,
      moduleId,
      topicId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      storageReference: `${notesId}:v${version}`,
      version,
      uploadedAt: existingNotes?.uploadedAt || lastUpdatedAt,
      lastUpdatedAt
    };

    try {
      await saveTopicNotes(metadata, file);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'The notes file could not be stored in this browser.';
      addToast({ type: 'error', title: 'Notes Upload Failed', message });
      return false;
    }

    setTopicNotes((previous) => [
      metadata,
      ...previous.filter((item) => item.id !== metadata.id)
    ]);

    const eventType = existingNotes ? 'Topic Notes Updated' : 'Topic Notes Uploaded';
    const events: SyllabusActivityEvent[] = assignedSchedules.map((schedule) => ({
      id: `${notesId}-${eventType.toLowerCase().replaceAll(' ', '-')}-v${version}-${getScheduleBatchId(schedule)}`,
      timestamp: lastUpdatedAt,
      displayDate: getCurrentDateISO(),
      batchId: getScheduleBatchId(schedule),
      moduleId,
      moduleName: targetModule.name,
      eventType,
      topicId,
      topicName: topic.title,
      topicNumber: topic.number,
      details: existingNotes
        ? `Trainer replaced the central notes document with ${file.name} (version ${version}). Batch access remains assessment-gated.`
        : `Trainer uploaded the central notes document ${file.name} (version ${version}). Batch access remains assessment-gated.`,
      savedStatus: 'Saved'
    }));
    setActivityHistory((previous) => [...events, ...previous]);
    addToast({
      type: 'success',
      title: existingNotes ? 'Topic Notes Updated' : 'Topic Notes Saved',
      message: `${file.name} was saved for ${topic.title} and is retained in this browser.`
    });
    return true;
  };

  const downloadTopicNotes = async (
    notes: TopicNotesMetadata,
    batchId: string
  ): Promise<boolean> => {
    const availability = getTopicNotesAvailability(batchId, notes.moduleId, notes.topicId);
    if (
      availability.status !== 'Notes Uploaded' ||
      availability.notes?.storageReference !== notes.storageReference
    ) {
      addToast({
        type: 'error',
        title: 'Notes Locked',
        message: 'This batch has not unlocked the current notes version.'
      });
      return false;
    }

    try {
      const file = await getTopicNotesFile(notes.storageReference);
      if (!file) {
        addToast({
          type: 'error',
          title: 'Notes File Missing',
          message: 'The saved file is no longer available in this browser. Upload the notes again.'
        });
        return false;
      }

      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = notes.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to retrieve the saved notes file.';
      addToast({ type: 'error', title: 'Notes Download Failed', message });
      return false;
    }
  };


  const sendSyllabusAssessment = (
    batchId: string,
    moduleId: string,
    topicId: string
  ): SyllabusAssessment | undefined => {
    const schedule = schedules.find(
      (item) => getScheduleBatchId(item) === batchId && item.moduleId === moduleId
    );
    const targetModule = modules.find((item) => item.id === moduleId);
    const topic = targetModule?.topics.find((item) => item.id === topicId);
    if (!schedule || !targetModule || !topic) {
      addToast({
        type: 'error',
        title: 'Unable to Send MCQ',
        message: 'The selected batch, module, or syllabus topic could not be matched.'
      });
      return undefined;
    }

    const latest = latestSyllabusAssessment(batchId, moduleId, topicId);
    if (latest && latest.status !== 'Completed') {
      addToast({
        type: 'warning',
        title: 'Assessment Still In Progress',
        message: 'Wait until all students have submitted this assessment before sending another one.'
      });
      return undefined;
    }
    if (latest && areAllStudentsAssessmentQualified(latest, schedule.students, syllabusAssessments)) {
      addToast({
        type: 'info',
        title: 'Assessment Passed',
        message: 'All students have a qualifying score above 75%. This topic has been completed automatically.'
      });
      return undefined;
    }
    if (latest && !latest.classAgainStartedAt) {
      addToast({
        type: 'warning',
        title: 'Class Retake Required',
        message: 'Conduct the topic again before sending a fresh assessment.'
      });
      return undefined;
    }

    const previousAttempts = syllabusAssessments.filter((item) =>
      item.batchId === batchId &&
      item.moduleId === moduleId &&
      item.topicId === topicId
    );
    const attempt = (latest?.attempt || 0) + 1;
    const assessmentKey = `${batchId}:${moduleId}:${topicId}`;
    if ((syllabusAssessmentSendAttempts.current.get(assessmentKey) || 0) >= attempt) {
      addToast({
        type: 'info',
        title: 'Assessment Already Sent',
        message: 'This attempt has already been created. Refresh the tracker to view it.'
      });
      return undefined;
    }

    const sentAt = new Date().toISOString();
    const studentsNeedingAssessment = getStudentsRequiringNextAssessment(
      schedule.students,
      previousAttempts
    );
    if (studentsNeedingAssessment.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Students Require a Retake',
        message: 'No students remain below the passing threshold for this batch and topic.'
      });
      return undefined;
    }
    const assessment: SyllabusAssessment = {
      id: `mcq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      batchId,
      moduleId,
      topicId,
      topicName: topic.title,
      attempt,
      questions: createSyllabusAssessmentQuestions(topicId, topic.title, targetModule.topics),
      students: studentsNeedingAssessment.map((student) => ({
        studentId: student.id,
        studentName: student.name,
        score: null
      })),
      status: 'Sent',
      sentAt
    };
    syllabusAssessmentSendAttempts.current.set(assessmentKey, attempt);
    setSyllabusAssessments((previous) => [assessment, ...previous]);
    recordAssessmentActivity(
      assessment,
      'MCQ Assessment Sent',
      `${assessment.questions.length} questions sent to ${assessment.students.length} students.`
    );
    addToast({
      type: 'success',
      title: 'MCQ Assessment Sent',
      message: `10 topic-specific questions have been sent to the ${schedule.batch} batch through the mock LMS workflow.`
    });
    return assessment;
  };

  const simulateSyllabusAssessmentResponses = (assessmentId: string) => {
    const assessment = syllabusAssessments.find((item) => item.id === assessmentId);
    if (!assessment || assessment.status === 'Completed') {
      if (!assessment) {
        addToast({
          type: 'error',
          title: 'Assessment Not Found',
          message: 'The assessment could not be found. Refresh the tracker and try again.'
        });
      }
      return;
    }

    const submittedCount = assessment.students.filter((student) => student.score !== null).length;
    const submitTarget = submittedCount === 0
      ? Math.max(1, Math.ceil(assessment.students.length / 2))
      : assessment.students.length;
    let newlySubmitted = 0;
    const students = assessment.students.map((student, index) => {
      if (student.score !== null || newlySubmitted >= submitTarget - submittedCount) return student;
      newlySubmitted += 1;
      const score = assessment.attempt === 1 && index === 2 ? 7 : 8 + (index % 3);
      return { ...student, score, submittedAt: new Date().toISOString() };
    });
    const completed = students.every((student) => student.score !== null);
    const updatedAssessment: SyllabusAssessment = {
      ...assessment,
      students,
      status: completed ? 'Completed' : 'In Progress',
      ...(completed ? { completedAt: new Date().toISOString() } : {})
    };
    setSyllabusAssessments((previous) =>
      previous.map((item) => item.id === assessmentId ? updatedAssessment : item)
    );

    if (completed) {
      const failedCount = students.filter((student) => student.score === null || (student.score / 10) * 100 <= 75).length;
      recordAssessmentActivity(
        updatedAssessment,
        'MCQ Assessment Completed',
        failedCount === 0 ? 'All students scored above 75%.' : `${failedCount} student${failedCount === 1 ? '' : 's'} scored 75% or below.`,
        updatedAssessment.completedAt
      );
      if (failedCount > 0) {
        recordAssessmentActivity(
          updatedAssessment,
          'Topic Requires Retake',
          `${failedCount} student${failedCount === 1 ? '' : 's'} scored 75% or below.`,
          updatedAssessment.completedAt
        );
      }
      addToast({
        type: failedCount === 0 ? 'success' : 'warning',
        title: failedCount === 0 ? 'Assessment Completed' : 'Topic Requires Retake',
        message: failedCount === 0
          ? 'Every student in this assessment passed. Syllabus completion is being evaluated automatically.'
          : `${failedCount} student${failedCount === 1 ? '' : 's'} scored 75% or below. Conduct the topic again before a fresh assessment.`
      });
      if (failedCount === 0) {
        const assessmentHistory = syllabusAssessments.map((item) =>
          item.id === updatedAssessment.id ? updatedAssessment : item
        );
        completeAssessedTopic(updatedAssessment, assessmentHistory);
      }
      return;
    }

    addToast({
      type: 'info',
      title: 'LMS Responses Received',
      message: `${students.filter((student) => student.score !== null).length} of ${students.length} students have submitted.`
    });
  };

  const conductTopicAgain = (batchId: string, moduleId: string, topicId: string): boolean => {
    const latest = latestSyllabusAssessment(batchId, moduleId, topicId);
    const isFailed = latest?.status === 'Completed' &&
      latest.students.some((student) => student.score === null || (student.score / 10) * 100 <= 75);
    if (!latest || !isFailed) {
      addToast({
        type: 'error',
        title: 'Retake Not Available',
        message: 'A completed assessment with at least one score of 75% or below is required.'
      });
      return false;
    }
    if (latest.classAgainStartedAt) {
      addToast({
        type: 'info',
        title: 'Retake Already Recorded',
        message: 'This topic is already marked as being taught again.'
      });
      return false;
    }

    const startedAt = new Date().toISOString();
    const updatedAssessment = { ...latest, classAgainStartedAt: startedAt };
    setSyllabusAssessments((previous) =>
      previous.map((assessment) => assessment.id === latest.id ? updatedAssessment : assessment)
    );
    recordAssessmentActivity(
      updatedAssessment,
      'Topic Being Taken Again',
      'Trainer conducting another session for this topic.',
      startedAt
    );
    addToast({
      type: 'success',
      title: 'Retake Recorded',
      message: `Another teaching session for ${latest.topicName} has been recorded and Admin has been notified.`
    });
    return true;
  };

  // Record Class as Not Conducted
  const recordClassNotConducted = (payload: {
    moduleId: string;
    scheduledDate: string;
    sessionIds: string[];
    reason: string;
  }): { success: boolean; message?: string } => {
    const { moduleId, scheduledDate, sessionIds, reason } = payload;

    if (!reason || reason.trim().length < 5) {
      const err = 'Please enter a valid reason for the missed session (at least 5 characters).';
      addToast({ type: 'error', title: 'Validation Error', message: err });
      return { success: false, message: err };
    }

    if (!sessionIds || sessionIds.length === 0) {
      const err = 'Please select at least one scheduled session.';
      addToast({ type: 'error', title: 'Session Required', message: err });
      return { success: false, message: err };
    }

    // Check for contradictory status
    const targetModule = modules.find((item) => item.id === moduleId);
    if (!targetModule) {
      const err = 'The selected module could not be found. Please reopen the batch and try again.';
      addToast({ type: 'error', title: 'Unable to Record Missed Class', message: err });
      return { success: false, message: err };
    }

    const affectedBatches = schedules.filter(
      (schedule) => sessionIds.includes(schedule.id) && schedule.moduleId === moduleId
    );
    if (affectedBatches.length !== new Set(sessionIds).size) {
      const err = 'One or more selected sessions do not belong to this module.';
      addToast({ type: 'error', title: 'Invalid Session Selection', message: err });
      return { success: false, message: err };
    }

    const affectedSessions = affectedBatches.flatMap((schedule) => {
      const sessionId = getScheduledSessionId(schedule.id, scheduledDate);
      const session = syllabusSessions.find((candidate) => candidate.id === sessionId);
      return session ? [{ schedule, session }] : [];
    });
    if (affectedSessions.length !== affectedBatches.length) {
      const err = 'The selected date does not contain all of the selected batch sessions.';
      addToast({ type: 'error', title: 'Invalid Session Date', message: err });
      return { success: false, message: err };
    }

    const conflicting = affectedSessions.filter(({ session }) =>
      activityHistory.some(
        (event) =>
          event.sessionId === session.id &&
          event.batchId === session.batchId &&
          event.moduleId === moduleId &&
          event.eventType === 'Topic Completed' &&
          event.savedStatus === 'Saved'
      )
    );

    if (conflicting.length > 0) {
      const err = `Cannot mark session as not conducted: ${conflicting[0].schedule.batch} already has completed topics recorded for this date.`;
      addToast({ type: 'error', title: 'Conflicting Record', message: err });
      return { success: false, message: err };
    }

    const moduleName = targetModule.name;
    const duplicateMissed = affectedSessions.find(({ session }) =>
      activityHistory.some(
        (event) =>
          event.sessionId === session.id &&
          event.batchId === session.batchId &&
          event.moduleId === moduleId &&
          event.eventType === 'Class Not Conducted' &&
          event.savedStatus === 'Saved'
      )
    );
    if (duplicateMissed) {
      const err = `A missed-class record already exists for ${duplicateMissed.schedule.batch} on ${formatReadableDate(scheduledDate)}.`;
      addToast({ type: 'error', title: 'Duplicate Record', message: err });
      return { success: false, message: err };
    }

    // Update affected sessions
    setSchedules((prev) =>
      prev.map((s) => {
        if (affectedSessions.some(({ schedule }) => schedule.id === s.id)) {
          return {
            ...s,
            syllabusUpdateStatus: 'Class Not Conducted',
            missedReason: reason.trim()
          };
        }
        return s;
      })
    );

    // Create history event for each affected session
    const submittedDate = getCurrentDateISO();
    const newEvents: SyllabusActivityEvent[] = affectedSessions.map(({ schedule, session }) => {
      const sessionLabel = `${schedule.batch} · Session #${session.sessionNumber} · ${scheduledDate} (${session.startTime}–${session.endTime})`;
      return {
        id: `act-missed-${session.id}`,
        timestamp: new Date().toISOString(),
        displayDate: submittedDate,
        scheduledDate,
        batchId: getScheduleBatchId(schedule),
        moduleId,
        moduleName,
        eventType: 'Class Not Conducted',
        sessionId: session.id,
        sessionIdentifier: sessionLabel,
        reason: reason.trim(),
        savedStatus: 'Saved'
      };
    });

    setActivityHistory((prev) => {
      const existingIds = new Set(prev.map((event) => event.id));
      const uniqueNewEvents = newEvents.filter((event) => !existingIds.has(event.id));
      return [...uniqueNewEvents, ...prev].sort(
        (a, b) => Date.parse(b.displayDate) - Date.parse(a.displayDate) ||
          Date.parse(b.timestamp) - Date.parse(a.timestamp)
      );
    });

    addToast({
      type: 'warning',
      title: 'Class Marked Not Conducted',
      message: `Recorded ${affectedSessions.length} batch session${affectedSessions.length > 1 ? 's' : ''} as not conducted. Reminder resolved.`
    });
    return { success: true };
  };

  // Update Admin-Assigned Task Status during Free Hours
  const updateAdminTaskStatus = (taskId: string, status: AdminTaskStatus, notes?: string) => {
    setAdminTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status,
              ...(notes ? { completionNotes: notes } : {})
            }
          : task
      )
    );

    addToast({
      type: status === 'Completed' ? 'success' : 'info',
      title: `Admin Task ${status}`,
      message: `Updated task status to "${status}". Recorded for administrative review.`
    });
  };

  // Today's Date
  const todayStr = getCurrentDateISO();

  // Admin Tasks Today
  const todayAdminTasks = useMemo(() => {
    return adminTasks.filter((t) => t.assignedDate === todayStr);
  }, [adminTasks, todayStr]);

  const pendingAdminTasksCount = useMemo(() => {
    return todayAdminTasks.filter((t) => t.status !== 'Completed').length;
  }, [todayAdminTasks]);

  // Compute free windows from actual recurring batch days and times.
  const freeHourSlots = useMemo<FreeHourSlot[]>(() => {
    const candidateSlots: Omit<FreeHourSlot, 'assignedTasks'>[] = [
      { id: 'slot-morning-free', date: todayStr, startTime: '09:00 AM', endTime: '11:00 AM', durationMinutes: 120 },
      { id: 'slot-midday-free', date: todayStr, startTime: '11:00 AM', endTime: '01:00 PM', durationMinutes: 120 },
      { id: 'slot-afternoon-free', date: todayStr, startTime: '02:00 PM', endTime: '04:00 PM', durationMinutes: 120 },
      { id: 'slot-admin-tasks', date: todayStr, startTime: '04:00 PM', endTime: '06:00 PM', durationMinutes: 120 }
    ];
    const baseSlots = candidateSlots.filter((slot) => {
      const slotStart = parseTimeToMinutes(slot.startTime);
      const slotEnd = parseTimeToMinutes(slot.endTime);
      return !schedules.some(
        (schedule) =>
          todayStr >= schedule.startDate &&
          isBatchScheduledOnDate(schedule.batch, todayStr, schedule.scheduledDays) &&
          parseTimeToMinutes(schedule.startTime) < slotEnd &&
          parseTimeToMinutes(schedule.endTime) > slotStart
      );
    });

    return baseSlots.map((slot) => {
      const slotStart = parseTimeToMinutes(slot.startTime);
      const slotEnd = parseTimeToMinutes(slot.endTime);

      const assignedTasks = todayAdminTasks.filter((task) => {
        const taskStart = parseTimeToMinutes(task.startTime);
        return taskStart >= slotStart && taskStart < slotEnd;
      });

      return {
        ...slot,
        assignedTasks
      };
    });
  }, [todayStr, todayAdminTasks, schedules]);

  const publishedExaminations = useMemo(
    () => getPublishedAdminExaminations({
      examinations,
      schedules,
      modules,
      assessments: syllabusAssessments,
      activityHistory
    }),
    [examinations, schedules, modules, syllabusAssessments, activityHistory]
  );

  // Notifications calculation
  const allGeneratedNotifications = useMemo(() => {
    return [
      ...generateReminders(schedules, activityHistory, currentTime),
      ...getAdminExaminationNotifications(publishedExaminations),
      ...examinationMarks.flatMap((record) => {
        const examination = publishedExaminations.find((item) => item.id === record.examinationId);
        if (record.status !== 'Submitted' || !record.submittedAt || !examination) return [];
        return [createAdminMarksSubmittedNotification(record, examination)];
      }),
      ...activityHistory
        .filter((event) => event.eventType === 'Topic Being Taken Again')
        .map((event) => ({
          id: `retake-${event.id}`,
          title: 'Topic Retake Started',
          message: `${event.topicName || 'Syllabus topic'} is being taught again for ${event.batchId}.`,
          timestamp: event.timestamp,
          category: 'system' as const,
          isResolved: false,
          moduleId: event.moduleId,
          actionLabel: 'Review Syllabus Tracker'
        })),
      ...activityHistory
        .filter((event) =>
          event.eventType === 'Topic Completed' &&
          event.assessmentCompletionStatus === 'Completed'
        )
        .map((event) => ({
          id: `syllabus-completion-${event.id}`,
          title: 'Syllabus Topic Completed',
          message: `${event.topicName || 'A topic'} was automatically completed for ${event.batchName || event.batchId} in ${event.moduleName}.`,
          timestamp: event.timestamp,
          category: 'system' as const,
          isResolved: false,
          moduleId: event.moduleId,
          actionLabel: 'Review Syllabus Tracker'
        })),
      ...activityHistory
        .filter((event) =>
          event.eventType === 'Module Submitted for Finance Verification' &&
          event.savedStatus === 'Saved'
        )
        .map(createFinanceModuleSubmissionNotification)
    ];
  }, [schedules, activityHistory, currentTime, publishedExaminations, examinationMarks]);

  const notifications = useMemo(() => {
    return allGeneratedNotifications.map((notif) => ({
      ...notif,
      isResolved: resolvedNotifIds.includes(notif.id)
    }));
  }, [allGeneratedNotifications, resolvedNotifIds]);

  const resolveNotification = (notificationId: string) => {
    setResolvedNotifIds((prev) => (prev.includes(notificationId) ? prev : [...prev, notificationId]));
    addToast({
      type: 'info',
      title: 'Notification Dismissed',
      message: 'The alert has been moved to resolved history.'
    });
  };

  const saveExaminationMarks: TrainerContextType['saveExaminationMarks'] = (examinationId, studentMarks) => {
    if (examinationMarksLocks.current.has(examinationId)) return false;
    examinationMarksLocks.current.add(examinationId);
    try {
      const examination = publishedExaminations.find((item) => item.id === examinationId);
      if (!examination || !schedules.some(
        (schedule) =>
          getScheduleBatchId(schedule) === examination.batchId &&
          schedule.moduleId === examination.moduleId &&
          isScheduleAssignedToTrainer(schedule, trainer)
      )) {
        addToast({ type: 'error', title: 'Unable to Save Marks', message: 'This Admin schedule is not assigned to your trainer account.' });
        return false;
      }
      if (!isExaminationMarksEntryOpen(examination, currentTime)) {
        addToast({ type: 'error', title: 'Marks Entry Not Open', message: 'Marks can be entered from the earliest scheduled examination date and time.' });
        return false;
      }
      const existing = examinationMarks.find((record) => record.examinationId === examinationId);
      if (existing?.status === 'Submitted' || submittedExaminationIds.current.has(examinationId)) {
        addToast({ type: 'error', title: 'Marks Are Locked', message: 'Submitted examination marks cannot be changed.' });
        return false;
      }
      const validationError = getMarksValidationError(examination, studentMarks, false);
      if (validationError) {
        addToast({ type: 'error', title: 'Unable to Save Marks', message: validationError });
        return false;
      }
      const record: ExaminationMarksRecord = {
        id: existing?.id || `marks-${examination.id}`,
        examinationId,
        batchId: examination.batchId,
        moduleId: examination.moduleId,
        trainerId: trainer.trainerId,
        studentMarks: studentMarks.map((student) => ({ ...student })),
        status: 'Draft',
        savedAt: new Date().toISOString()
      };
      setExaminationMarks((previous) => [
        ...previous.filter((item) => item.examinationId !== examinationId),
        record
      ]);
      addToast({ type: 'success', title: 'Marks Saved', message: 'The partial marks draft was saved on this device.' });
      return true;
    } finally {
      examinationMarksLocks.current.delete(examinationId);
    }
  };

  const submitExaminationMarks: TrainerContextType['submitExaminationMarks'] = (examinationId, studentMarks) => {
    if (examinationMarksLocks.current.has(examinationId)) return false;
    examinationMarksLocks.current.add(examinationId);
    try {
      const examination = publishedExaminations.find((item) => item.id === examinationId);
      if (!examination || !schedules.some(
        (schedule) =>
          getScheduleBatchId(schedule) === examination.batchId &&
          schedule.moduleId === examination.moduleId &&
          isScheduleAssignedToTrainer(schedule, trainer)
      )) {
        addToast({ type: 'error', title: 'Unable to Submit Marks', message: 'This Admin schedule is not assigned to your trainer account.' });
        return false;
      }
      if (!isExaminationMarksEntryOpen(examination, currentTime)) {
        addToast({ type: 'error', title: 'Marks Entry Not Open', message: 'Marks can be submitted from the earliest scheduled examination date and time.' });
        return false;
      }
      const existing = examinationMarks.find((record) => record.examinationId === examinationId);
      if (existing?.status === 'Submitted' || submittedExaminationIds.current.has(examinationId)) {
        addToast({ type: 'error', title: 'Marks Already Submitted', message: 'This examination has already been submitted and is locked.' });
        return false;
      }
      const validationError = getMarksValidationError(examination, studentMarks, true);
      if (validationError) {
        addToast({ type: 'error', title: 'Marks Submission Incomplete', message: validationError });
        return false;
      }
      const submittedAt = new Date().toISOString();
      const record: ExaminationMarksRecord = {
        id: existing?.id || `marks-${examination.id}`,
        examinationId,
        batchId: examination.batchId,
        moduleId: examination.moduleId,
        trainerId: trainer.trainerId,
        studentMarks: studentMarks.map((student) => ({ ...student })),
        status: 'Submitted',
        savedAt: submittedAt,
        submittedAt
      };
      submittedExaminationIds.current.add(examinationId);
      setExaminationMarks((previous) => [
        ...previous.filter((item) => item.examinationId !== examinationId),
        record
      ]);
      addToast({
        type: 'success',
        title: 'Marks Submitted',
        message: 'Marks are final and read-only. A mock Admin notification is visible in Notifications.'
      });
      return true;
    } finally {
      examinationMarksLocks.current.delete(examinationId);
    }
  };

  // Dynamic Counts - Today's classes count based on day-of-week schedule (MWF / TTS / Everyday)
  const todayClassesCount = useMemo(() => {
    return schedules.filter(
      (s) => todayStr >= s.startDate && isBatchScheduledOnDate(s.batch, todayStr, s.scheduledDays)
    ).length;
  }, [schedules, todayStr]);

  const pendingApprovalsCount = useMemo(() => {
    return schedules.filter((s) => s.approvalStatus === 'Pending').length;
  }, [schedules]);

  const completedSessionsCount = useMemo(() => {
    return syllabusSessions.filter((session) => session.outcome === 'Conducted').length;
  }, [syllabusSessions]);

  const syllabusPendingCount = useMemo(() => {
    return getPendingTodaySessions(schedules, activityHistory, currentTime).length;
  }, [schedules, activityHistory, currentTime]);

  const activeRemindersCount = useMemo(() => {
    return notifications.filter((n) => !n.isResolved).length;
  }, [notifications]);

  // Reset function to clear mock modifications
  const resetAllMockData = () => {
    moduleFinanceSubmissionLocks.current.clear();
    syllabusAssessmentSendAttempts.current.clear();
    const initialModule = initialModulesData[0];
    const initialSchedules = getInitialSchedules();
    const initialNotes = getInitialTopicNotes(initialModule, trainer.trainerId);
    const initialNoteEvents: SyllabusActivityEvent[] = initialNotes.flatMap(({ metadata }) => {
      const topic = initialModule.topics.find((item) => item.id === metadata.topicId);
      if (!topic) return [];
      return initialSchedules
        .filter((schedule) =>
          schedule.moduleId === initialModule.id &&
          isScheduleAssignedToTrainer(schedule, trainer)
        )
        .map((schedule) => ({
          id: `${metadata.id}-seed-uploaded-${getScheduleBatchId(schedule)}`,
          timestamp: metadata.uploadedAt,
          displayDate: metadata.uploadedAt.slice(0, 10),
          batchId: getScheduleBatchId(schedule),
          moduleId: initialModule.id,
          moduleName: initialModule.name,
          eventType: 'Topic Notes Uploaded' as const,
          topicId: topic.id,
          topicName: topic.title,
          topicNumber: topic.number,
          details: `Sample notes document ${metadata.fileName} is prepared. Batch access remains assessment-gated.`,
          savedStatus: 'Saved' as const
        }));
    });

    setTopicNotes([]);
    clearAllTopicNotes()
      .then(async () => {
        await Promise.all(initialNotes.map(({ metadata, file }) => saveTopicNotes(metadata, file)));
        setTopicNotes(initialNotes.map(({ metadata }) => metadata));
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unable to restore the sample topic notes.';
        addToast({ type: 'error', title: 'Notes Reset Failed', message });
      });
    localStorage.removeItem(STORAGE_KEYS.MODULES);
    localStorage.removeItem(STORAGE_KEYS.SCHEDULES);
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    localStorage.removeItem(STORAGE_KEYS.ADMIN_TASKS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVITY);
    localStorage.removeItem(STORAGE_KEYS.RESOLVED_NOTIFS);
    localStorage.removeItem(STORAGE_KEYS.EXAMINATIONS);
    localStorage.removeItem('academia_trainer_examination_requests_v1');
    localStorage.removeItem(STORAGE_KEYS.EXAMINATION_MARKS);
    localStorage.removeItem(STORAGE_KEYS.ASSESSMENTS);
    localStorage.removeItem(STORAGE_KEYS.NOTES_RELEASES);

    setModules(initialModulesData);
    setTopicNotesReleases([]);
    setTopicNotes([]);
    setSchedules(getInitialSchedules());
    setSyllabusSessions(getInitialScheduledSessions());
    setAdminTasks(getInitialAdminTasks());
    const initialAssessments = getInitialSyllabusAssessments(initialSchedules, initialModulesData[0]);
    setActivityHistory([
      ...getInitialActivityEvents(initialSchedules),
      ...getInitialAssessmentActivityEvents(initialAssessments, initialModule),
      ...initialNoteEvents
    ]);
    setSyllabusAssessments(initialAssessments);
    setResolvedNotifIds([]);
    setExaminations(getInitialAdminExaminations(initialSchedules));
    setExaminationMarks([]);
    submittedExaminationIds.current.clear();

    addToast({
      type: 'info',
      title: 'Mock Data Reset',
      message: 'All schedules, syllabus records, and admin tasks have been restored to initial state.'
    });
  };

  return (
    <TrainerContext.Provider
      value={{
        trainer,
        modules,
        module: modules[0] || initialModulesData[0],
        schedules,
        syllabusSessions,
        currentTime,
        adminTasks,
        todayAdminTasks,
        pendingAdminTasksCount,
        freeHourSlots,
        activityHistory,
        notifications,
        examinations: publishedExaminations,
        examinationMarks,
        syllabusAssessments,
        topicNotes,
        topicNotesReleases,
        topicNotesLoaded,
        activeRemindersCount,
        pendingApprovalsCount,
        todayClassesCount,
        completedSessionsCount,
        syllabusPendingCount,
        toasts,
        addToast,
        removeToast,
        approveSchedule,
        requestScheduleChange,
        submitModuleForFinanceVerification,
        sendSyllabusAssessment,
        simulateSyllabusAssessmentResponses,
        conductTopicAgain,
        uploadTopicNotes,
        getTopicNotesAvailability,
        downloadTopicNotes,
        recordClassNotConducted,
        updateAdminTaskStatus,
        resolveNotification,
        saveExaminationMarks,
        submitExaminationMarks,
        resetAllMockData
      }}
    >
      {children}
    </TrainerContext.Provider>
  );
};

export const useTrainer = () => {
  const context = useContext(TrainerContext);
  if (!context) {
    throw new Error('useTrainer must be used within a TrainerProvider');
  }
  return context;
};
