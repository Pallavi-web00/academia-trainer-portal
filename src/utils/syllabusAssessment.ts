import { ScheduleItem, SyllabusActivityEvent, SyllabusAssessment } from '../types';

export function getTopicAssessmentAttempts(
  assessments: SyllabusAssessment[],
  batchId: string,
  moduleId: string,
  topicId: string
): SyllabusAssessment[] {
  return assessments
    .filter((assessment) =>
      assessment.batchId === batchId &&
      assessment.moduleId === moduleId &&
      assessment.topicId === topicId
    )
    .sort((a, b) => b.attempt - a.attempt || b.sentAt.localeCompare(a.sentAt));
}

export function getQualifyingAssessmentResults(
  assessments: SyllabusAssessment[]
): Map<string, SyllabusAssessment['students'][number]> {
  const resultsByStudent = new Map<string, SyllabusAssessment['students'][number]>();
  assessments
    .filter((assessment) => assessment.status === 'Completed')
    .sort((a, b) => a.attempt - b.attempt || a.sentAt.localeCompare(b.sentAt))
    .forEach((assessment) => {
      assessment.students.forEach((result) => {
        if (result.score !== null && (result.score / 10) * 100 > 75) {
          resultsByStudent.set(result.studentId, result);
        }
      });
    });
  return resultsByStudent;
}

export function getStudentsRequiringNextAssessment(
  students: ScheduleItem['students'],
  previousAttempts: SyllabusAssessment[]
): ScheduleItem['students'] {
  const previouslyPassed = getQualifyingAssessmentResults(previousAttempts);
  const latestAttempt = [...previousAttempts]
    .sort((a, b) => b.attempt - a.attempt || b.sentAt.localeCompare(a.sentAt))[0];
  const failedStudentIds = new Set(
    latestAttempt?.status === 'Completed'
      ? latestAttempt.students
        .filter((result) =>
          result.score !== null && (result.score / 10) * 100 <= 75
        )
        .map((result) => result.studentId)
      : []
  );
  const seenStudentIds = new Set<string>();

  return students.filter((student) => {
    if (
      seenStudentIds.has(student.id) ||
      previouslyPassed.has(student.id) ||
      (latestAttempt && !failedStudentIds.has(student.id))
    ) return false;
    seenStudentIds.add(student.id);
    return true;
  });
}

export function areAllStudentsAssessmentQualified(
  latestAssessment: SyllabusAssessment | undefined,
  expectedStudents: ScheduleItem['students'],
  assessmentHistory: SyllabusAssessment[]
): boolean {
  if (!latestAssessment || latestAssessment.status !== 'Completed' || expectedStudents.length === 0) {
    return false;
  }

  const relevantAssessments = assessmentHistory.filter((assessment) =>
    assessment.batchId === latestAssessment.batchId &&
    assessment.moduleId === latestAssessment.moduleId &&
    assessment.topicId === latestAssessment.topicId
  );
  const resultsByStudent = getQualifyingAssessmentResults(relevantAssessments);
  return expectedStudents.every((student) => resultsByStudent.has(student.id));
}

export function hasSavedTopicCompletion(
  activityHistory: SyllabusActivityEvent[],
  completedTopicIds: string[],
  batchId: string,
  moduleId: string,
  topicId: string
): boolean {
  return completedTopicIds.includes(topicId) || activityHistory.some((event) =>
    event.batchId === batchId &&
    event.moduleId === moduleId &&
    event.topicId === topicId &&
    event.eventType === 'Topic Completed' &&
    event.savedStatus === 'Saved'
  );
}

export function isModuleReadyForFinanceVerification(input: {
  topicIds: string[];
  batchId: string;
  moduleId: string;
  students: ScheduleItem['students'];
  completedTopicIds: string[];
  activityHistory: SyllabusActivityEvent[];
  assessments: SyllabusAssessment[];
}): boolean {
  const {
    topicIds,
    batchId,
    moduleId,
    students,
    completedTopicIds,
    activityHistory,
    assessments
  } = input;
  if (topicIds.length === 0 || students.length === 0) return false;

  return topicIds.every((topicId) => {
    if (!hasSavedTopicCompletion(activityHistory, completedTopicIds, batchId, moduleId, topicId)) {
      return false;
    }

    const topicAssessments = assessments
      .filter((assessment) =>
        assessment.batchId === batchId &&
        assessment.moduleId === moduleId &&
        assessment.topicId === topicId
      )
      .sort((a, b) => b.attempt - a.attempt || b.sentAt.localeCompare(a.sentAt));
    return areAllStudentsAssessmentQualified(topicAssessments[0], students, topicAssessments);
  });
}

export function isModuleSuccessfullyCompletedForBatch(input: {
  topicIds: string[];
  schedule: ScheduleItem;
  activityHistory: SyllabusActivityEvent[];
  assessments: SyllabusAssessment[];
}): boolean {
  const { topicIds, schedule, activityHistory, assessments } = input;
  const batchId = schedule.batchId || schedule.id;
  const completedTopicEvents = new Set(
    activityHistory
      .filter((event) =>
        event.batchId === batchId &&
        event.moduleId === schedule.moduleId &&
        event.eventType === 'Topic Completed' &&
        event.savedStatus === 'Saved' &&
        Boolean(event.topicId)
      )
      .flatMap((event) => event.topicId ? [event.topicId] : [])
  );

  return topicIds.length > 0 &&
    topicIds.every((topicId) => completedTopicEvents.has(topicId)) &&
    isModuleReadyForFinanceVerification({
      topicIds,
      batchId,
      moduleId: schedule.moduleId,
      students: schedule.students,
      completedTopicIds: schedule.completedTopicIds || [],
      activityHistory,
      assessments
    });
}

export function hasModuleFinanceSubmission(
  activityHistory: SyllabusActivityEvent[],
  batchId: string,
  moduleId: string
): boolean {
  return activityHistory.some((event) =>
    event.batchId === batchId &&
    event.moduleId === moduleId &&
    event.eventType === 'Module Submitted for Finance Verification' &&
    event.savedStatus === 'Saved'
  );
}
