import { ScheduleItem, SyllabusActivityEvent, SyllabusAssessment } from '../types';

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
