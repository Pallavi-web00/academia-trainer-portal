import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
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
  ExaminationRequest,
  SyllabusAssessment
} from '../types';
import { initialModulesData } from '../data/modulesData';
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
  getScheduleBatchId
} from '../utils/dateTimeUtils';
import { generateReminders } from '../utils/reminderLogic';
import { getExaminationNotifications, getInitialExaminationRequests } from '../data/examinationData';
import {
  createSyllabusAssessmentQuestions,
  getInitialAssessmentActivityEvents,
  getInitialSyllabusAssessments
} from '../data/syllabusAssessmentData';

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
  examinationRequests: ExaminationRequest[];
  syllabusAssessments: SyllabusAssessment[];
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
  submitSyllabusUpdates: (
    moduleId: string,
    topicIds: string[],
    sessionContextId: string,
    scheduledDate?: string
  ) => boolean;
  sendSyllabusAssessment: (batchId: string, moduleId: string, topicId: string) => SyllabusAssessment | undefined;
  simulateSyllabusAssessmentResponses: (assessmentId: string) => void;
  conductTopicAgain: (batchId: string, moduleId: string, topicId: string) => boolean;
  recordClassNotConducted: (payload: {
    moduleId: string;
    scheduledDate: string;
    sessionIds: string[];
    reason: string;
  }) => { success: boolean; message?: string };
  updateAdminTaskStatus: (taskId: string, status: AdminTaskStatus, notes?: string) => void;
  resolveNotification: (notificationId: string) => void;
  submitExaminationRequest: (
    request: Omit<ExaminationRequest,
      'id' | 'submittedAt' | 'requestStatus' | 'eventStatus' | 'batchName' | 'moduleName' | 'topicNames'>
  ) => ExaminationRequest | undefined;
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
  EXAMINATIONS: 'academia_trainer_examination_requests_v1',
  ASSESSMENTS: 'academia_trainer_syllabus_assessments_v1'
};

export const TrainerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [trainer] = useState<TrainerProfile>(trainerProfile);
  const [currentTime, setCurrentTime] = useState(() => new Date());

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
      const initialDaysById = new Map(
        getInitialSchedules().map((schedule) => [schedule.id, schedule.scheduledDays])
      );
      return parsed.map((schedule) => ({
        ...schedule,
        scheduledDays: initialDaysById.get(schedule.id) ?? schedule.scheduledDays
      }));
    } catch {
      return getInitialSchedules();
    }
  });

  const [syllabusAssessments, setSyllabusAssessments] = useState<SyllabusAssessment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ASSESSMENTS);
      return saved
        ? JSON.parse(saved) as SyllabusAssessment[]
        : getInitialSyllabusAssessments(schedules, initialModulesData[0]);
    } catch {
      return getInitialSyllabusAssessments(schedules, initialModulesData[0]);
    }
  });

  const [examinationRequests, setExaminationRequests] = useState<ExaminationRequest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXAMINATIONS);
      return saved ? JSON.parse(saved) as ExaminationRequest[] : getInitialExaminationRequests(schedules);
    } catch {
      return getInitialExaminationRequests(schedules);
    }
  });

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
        event.assessmentId
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
    localStorage.setItem(STORAGE_KEYS.EXAMINATIONS, JSON.stringify(examinationRequests));
  }, [examinationRequests]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(syllabusAssessments));
  }, [syllabusAssessments]);

  // Toast Management
  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

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

  const isSyllabusAssessmentEligible = (
    assessment: SyllabusAssessment | undefined,
    expectedStudents: ScheduleItem['students']
  ) => {
    if (!assessment || assessment.status !== 'Completed' || assessment.students.length !== expectedStudents.length) {
      return false;
    }
    const resultsByStudent = new Map(assessment.students.map((result) => [result.studentId, result]));
    return expectedStudents.every((student) => {
      const result = resultsByStudent.get(student.id);
      return result?.score !== null && result?.score !== undefined && (result.score / 10) * 100 > 75;
    });
  };

  // Submit Syllabus Updates
  const submitSyllabusUpdates = (
    moduleId: string,
    topicIds: string[],
    sessionContextId: string,
    scheduledDate: string = getCurrentDateISO()
  ): boolean => {
    if (!topicIds || topicIds.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Topics Selected',
        message: 'Please select at least one newly covered topic before submitting.'
      });
      return false;
    }

    const targetModule = modules.find((item) => item.id === moduleId);
    const affectedSession = schedules.find(
      (schedule) => schedule.id === sessionContextId && schedule.moduleId === moduleId
    );
    if (!targetModule || !affectedSession) {
      addToast({
        type: 'error',
        title: 'Unable to Save Syllabus',
        message: 'The selected module and batch could not be matched. Please reopen the batch and try again.'
      });
      return false;
    }

    const batchId = getScheduleBatchId(affectedSession);
    const ineligibleTopicIds = topicIds.filter((topicId) =>
      !isSyllabusAssessmentEligible(
        latestSyllabusAssessment(batchId, moduleId, topicId),
        affectedSession.students
      )
    );
    if (ineligibleTopicIds.length > 0) {
      const names = ineligibleTopicIds
        .map((topicId) => targetModule.topics.find((topic) => topic.id === topicId)?.title)
        .filter((name): name is string => Boolean(name));
      addToast({
        type: 'error',
        title: 'Assessment Criteria Not Met',
        message: `${names.join(', ')} cannot be submitted until every student has submitted and scored above 75%.`
      });
      return false;
    }

    const scheduledSessionId = getScheduledSessionId(affectedSession.id, scheduledDate);
    const scheduledSession = syllabusSessions.find((session) => session.id === scheduledSessionId);
    if (!scheduledSession) {
      addToast({
        type: 'error',
        title: 'Unable to Save Syllabus',
        message: 'The selected date is not a scheduled session for this batch.'
      });
      return false;
    }

    const conflictingMissedRecord = activityHistory.some(
      (event) =>
        event.sessionId === scheduledSession.id &&
        event.batchId === getScheduleBatchId(affectedSession) &&
        event.moduleId === moduleId &&
        event.eventType === 'Class Not Conducted' &&
        event.savedStatus === 'Saved'
    );
    if (conflictingMissedRecord) {
      addToast({
        type: 'error',
        title: 'Unable to Save Syllabus',
        message: 'This scheduled session already has a saved class-not-conducted outcome.'
      });
      return false;
    }

    const batchCompletedTopicIds = new Set(affectedSession.completedTopicIds || []);
    const newCompletedTopics = targetModule.topics.filter(
      (topic) => topicIds.includes(topic.id) && !batchCompletedTopicIds.has(topic.id)
    );
    if (newCompletedTopics.length !== topicIds.length) {
      addToast({
        type: 'error',
        title: 'Unable to Save Syllabus',
        message: 'One or more selected topics are invalid or already recorded for this batch.'
      });
      return false;
    }

    const submittedDate = getCurrentDateISO();

    setModules((prevModules) =>
      prevModules.map((m) => {
        if (m.id !== moduleId) return m;

        const updatedTopics = m.topics.map((t) => {
          if (topicIds.includes(t.id) && !t.isCompleted) {
            return {
              ...t,
              isCompleted: true,
              completedDate: submittedDate,
              completedSessionId: sessionContextId
            };
          }
          return t;
        });

        return { ...m, topics: updatedTopics };
      })
    );

    setSchedules((prevSchedules) =>
      prevSchedules.map((schedule) =>
        schedule.id === affectedSession.id
          ? {
              ...schedule,
              syllabusUpdateStatus: 'Updated',
              completedTopicIds: [...new Set([...(schedule.completedTopicIds || []), ...topicIds])]
            }
          : schedule
      )
    );

    // Add activity history events for each completed topic (newest first)
    const newActivityEvents: SyllabusActivityEvent[] = newCompletedTopics.map((topic) => ({
      id: `act-${scheduledSession.id}-${topic.id}`,
      timestamp: new Date().toISOString(),
      displayDate: submittedDate,
      scheduledDate,
      batchId: getScheduleBatchId(affectedSession),
      moduleId,
      moduleName: targetModule.name,
      eventType: 'Topic Completed',
      topicId: topic.id,
      topicName: topic.title,
      topicNumber: topic.number,
      sessionId: scheduledSession.id,
      sessionIdentifier: `${affectedSession.batch} · Session #${scheduledSession.sessionNumber} · ${scheduledDate} (${scheduledSession.startTime}–${scheduledSession.endTime})`,
      savedStatus: 'Saved'
    }));

    setActivityHistory((prev) => {
      const existingIds = new Set(prev.map((event) => event.id));
      const uniqueNewEvents = newActivityEvents.filter((event) => !existingIds.has(event.id));
      return [...uniqueNewEvents, ...prev].sort(
        (a, b) => Date.parse(b.displayDate) - Date.parse(a.displayDate) ||
          Date.parse(b.timestamp) - Date.parse(a.timestamp)
      );
    });

    addToast({
      type: 'success',
      title: 'Syllabus Updated',
      message: `Successfully recorded ${topicIds.length} topic${topicIds.length > 1 ? 's' : ''} for ${formatReadableDate(scheduledDate)}.`
    });

    return true;
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
    if (latest && isSyllabusAssessmentEligible(latest, schedule.students)) {
      addToast({
        type: 'info',
        title: 'Assessment Passed',
        message: 'All students scored above 75%. Submit this topic to Admin instead of sending another assessment.'
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

    const sentAt = new Date().toISOString();
    const assessment: SyllabusAssessment = {
      id: `mcq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      batchId,
      moduleId,
      topicId,
      topicName: topic.title,
      attempt: (latest?.attempt || 0) + 1,
      questions: createSyllabusAssessmentQuestions(topicId, topic.title, targetModule.topics),
      students: schedule.students.map((student) => ({
        studentId: student.id,
        studentName: student.name,
        score: null
      })),
      status: 'Sent',
      sentAt
    };
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
          ? 'Every student scored above 75%. The topic is eligible for submission to Admin.'
          : `${failedCount} student${failedCount === 1 ? '' : 's'} scored 75% or below. Conduct the topic again before a fresh assessment.`
      });
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

  // Notifications calculation
  const allGeneratedNotifications = useMemo(() => {
    return [
      ...generateReminders(schedules, activityHistory, currentTime),
      ...getExaminationNotifications(examinationRequests),
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
        }))
    ];
  }, [schedules, activityHistory, currentTime, examinationRequests]);

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

  const submitExaminationRequest: TrainerContextType['submitExaminationRequest'] = (request) => {
    const schedule = schedules.find(
      (item) => getScheduleBatchId(item) === request.batchId && item.moduleId === request.moduleId
    );
    const selectedModule = modules.find((item) => item.id === request.moduleId);
    if (!schedule || !selectedModule) {
      addToast({
        type: 'error',
        title: 'Unable to Submit Request',
        message: 'The selected batch or module is no longer available.'
      });
      return undefined;
    }

    const nextRequest: ExaminationRequest = {
      ...request,
      id: `EXR-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      submittedAt: new Date().toISOString(),
      requestStatus: 'Pending Admin Review',
      eventStatus: 'Upcoming',
      batchName: schedule.batch,
      moduleName: selectedModule.name,
      topicNames: request.topicIds
        .map((topicId) => selectedModule.topics.find((topic) => topic.id === topicId)?.title)
        .filter((name): name is string => Boolean(name))
    };
    setExaminationRequests((previous) => [nextRequest, ...previous]);
    addToast({
      type: 'success',
      title: 'Examination Request Submitted',
      message: `${nextRequest.id} is awaiting admin review.`
    });
    return nextRequest;
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
    localStorage.removeItem(STORAGE_KEYS.MODULES);
    localStorage.removeItem(STORAGE_KEYS.SCHEDULES);
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    localStorage.removeItem(STORAGE_KEYS.ADMIN_TASKS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVITY);
    localStorage.removeItem(STORAGE_KEYS.RESOLVED_NOTIFS);
    localStorage.removeItem(STORAGE_KEYS.EXAMINATIONS);
    localStorage.removeItem(STORAGE_KEYS.ASSESSMENTS);

    setModules(initialModulesData);
    setSchedules(getInitialSchedules());
    setSyllabusSessions(getInitialScheduledSessions());
    setAdminTasks(getInitialAdminTasks());
    const initialSchedules = getInitialSchedules();
    const initialAssessments = getInitialSyllabusAssessments(initialSchedules, initialModulesData[0]);
    setActivityHistory([
      ...getInitialActivityEvents(initialSchedules),
      ...getInitialAssessmentActivityEvents(initialAssessments, initialModulesData[0])
    ]);
    setSyllabusAssessments(initialAssessments);
    setResolvedNotifIds([]);
    setExaminationRequests(getInitialExaminationRequests(initialSchedules));

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
        examinationRequests,
        syllabusAssessments,
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
        submitSyllabusUpdates,
        sendSyllabusAssessment,
        simulateSyllabusAssessmentResponses,
        conductTopicAgain,
        recordClassNotConducted,
        updateAdminTaskStatus,
        resolveNotification,
        submitExaminationRequest,
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
