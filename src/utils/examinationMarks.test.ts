import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AdminExamination, ExaminationStudentMarks } from '../types';
import {
  getAdminExaminationNotifications,
  getInitialAdminExaminations,
  getPublishedAdminExaminations
} from '../data/examinationData';
import { initialModulesData } from '../data/modulesData';
import {
  getInitialActivityEvents,
  getInitialSchedules
} from '../data/scheduleData';
import {
  getInitialSyllabusAssessments,
  mergeInitialSyllabusAssessments
} from '../data/syllabusAssessmentData';
import {
  getEarliestExaminationDate,
  getMarksValidationError,
  isExaminationMarksEntryOpen,
  sanitizePersistedExaminationMarks
} from './examinationMarks';

function makeExamination(): AdminExamination {
  return {
    id: 'exam-one',
    batchId: 'batch-one',
    batchName: 'Batch One',
    moduleId: 'module-one',
    moduleName: 'Module One',
    components: {
      Theory: { scheduledDate: '2026-11-02', scheduledTime: '10:00 AM', maxMarks: 100 },
      Practical: { scheduledDate: '2026-11-04', scheduledTime: '11:00 AM', maxMarks: 50 }
    },
    eligibleStudents: [
      { studentId: 'student-1', studentName: 'Student One', batchName: 'Batch One' },
      { studentId: 'student-2', studentName: 'Student Two', batchName: 'Batch One' }
    ],
    publishedAt: '2026-10-01T10:00:00.000Z',
    status: 'Admin Published',
    publishedBy: 'ADMIN-MOCK-01',
    scheduleUpdates: []
  };
}

function completeMarks(): ExaminationStudentMarks[] {
  return [
    { studentId: 'student-1', theory: 75, practical: 42, project: null },
    { studentId: 'student-2', theory: 90, practical: 45, project: null }
  ];
}

describe('Examination marks workflow', () => {
  it('opens marks entry at the earliest scheduled component date and time', () => {
    const examination = makeExamination();
    const earliest = getEarliestExaminationDate(examination);
    assert.ok(earliest);
    assert.equal(earliest.getDate(), 2);
    assert.equal(isExaminationMarksEntryOpen(examination, new Date(earliest.getTime() - 1)), false);
    assert.equal(isExaminationMarksEntryOpen(examination, earliest), true);
  });

  it('keeps the Everyday sample locked until the exact local start time', () => {
    const examination = getInitialAdminExaminations(getInitialSchedules())
      .find((exam) => exam.id === 'ADM-EXAM-DAILY-MOD2-2026');
    assert.ok(examination);
    assert.equal(isExaminationMarksEntryOpen(examination, new Date(2026, 10, 5, 16, 0)), false);
    assert.equal(isExaminationMarksEntryOpen(examination, new Date(2026, 10, 9, 23, 59)), false);
    assert.equal(isExaminationMarksEntryOpen(examination, new Date(2026, 10, 10, 9, 59)), false);
    assert.equal(isExaminationMarksEntryOpen(examination, new Date(2026, 10, 10, 10, 0)), true);
    assert.equal(isExaminationMarksEntryOpen(examination, new Date(2026, 10, 10, 10, 1)), true);
    assert.equal(isExaminationMarksEntryOpen({
      ...examination,
      components: {}
    }, new Date(2026, 10, 10, 10, 0)), false);
  });

  it('allows partial drafts but requires all eligible students and components to submit', () => {
    const examination = makeExamination();
    const partial = completeMarks();
    partial[0].theory = null;
    assert.equal(getMarksValidationError(examination, partial, false), undefined);
    assert.match(getMarksValidationError(examination, partial, true) || '', /Theory marks/);
    assert.equal(getMarksValidationError(examination, completeMarks(), true), undefined);
  });

  it('rejects negative values and marks above the supplied maximum', () => {
    const examination = makeExamination();
    const negative = completeMarks();
    negative[0].theory = -1;
    assert.match(getMarksValidationError(examination, negative, false) || '', /non-negative/);
    const tooHigh = completeMarks();
    tooHigh[1].practical = 51;
    assert.match(getMarksValidationError(examination, tooHigh, false) || '', /maximum of 50/);
  });

  it('requires exactly one marks row for every eligible student', () => {
    const examination = makeExamination();
    assert.match(
      getMarksValidationError(examination, completeMarks().slice(0, 1), false) || '',
      /every Admin-approved eligible student/
    );
    const unknownStudent = completeMarks();
    unknownStudent[0].studentId = 'another-batch-student';
    assert.match(
      getMarksValidationError(examination, unknownStudent, false) || '',
      /every Admin-approved eligible student/
    );
  });

  it('seeds the completed Everyday module with its own scheduled examination and submission', () => {
    const schedules = getInitialSchedules();
    const daily = schedules.find((schedule) => schedule.id === 'batch-daily');
    assert.ok(daily);
    assert.equal(daily.completedTopicIds?.length, 40);

    const assessments = getInitialSyllabusAssessments(schedules, initialModulesData[0]);
    const dailyAssessments = assessments.filter((assessment) => assessment.batchId === 'batch-daily');
    assert.equal(dailyAssessments.length, 40);
    assert.ok(dailyAssessments.every((assessment) =>
      assessment.status === 'Completed' &&
      assessment.students.every((student) => student.score !== null && student.score > 7.5)
    ));

    const dailyExam = getInitialAdminExaminations(schedules).find((exam) => exam.batchId === 'batch-daily');
    assert.ok(dailyExam);
    assert.deepEqual(dailyExam.components.Theory, {
      scheduledDate: '2026-11-10',
      scheduledTime: '10:00 AM',
      endTime: '12:00 PM',
      maxMarks: 100
    });
    assert.deepEqual(dailyExam.components.Practical, {
      scheduledDate: '2026-11-12',
      scheduledTime: '10:00 AM',
      endTime: '12:00 PM',
      maxMarks: 100
    });
    assert.deepEqual(dailyExam.components.Project, {
      scheduledDate: '2026-11-15',
      scheduledTime: '02:00 PM',
      endTime: '04:00 PM',
      maxMarks: 100
    });
    assert.equal(dailyExam.status, 'Admin Published');
    assert.equal(dailyExam.publishedBy, 'ADMIN-MOCK-01');
    assert.equal(dailyExam.publishedAt, '2026-11-05T04:30:00.000Z');
    assert.equal(dailyExam.eligibleStudents.length, 6);
    assert.deepEqual(
      dailyExam.eligibleStudents.map((student) => student.studentId),
      ['st-21', 'st-22', 'st-24', 'st-26', 'st-27', 'st-28']
    );
    assert.equal(new Set(dailyExam.eligibleStudents.map((student) => student.studentId)).size, 6);
    assert.ok(dailyExam.eligibleStudents.every((eligible) =>
      daily.students.some((student) =>
        student.id === eligible.studentId && student.name === eligible.studentName
      )
    ));

    const notifications = getAdminExaminationNotifications([dailyExam]);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].title, 'Examination Schedule Published');
    assert.match(notifications[0].message, /Theory: 2026-11-10 10:00 AM–12:00 PM/);
    assert.match(notifications[0].message, /Practical: 2026-11-12 10:00 AM–12:00 PM/);
    assert.match(notifications[0].message, /Project: 2026-11-15 02:00 PM–04:00 PM/);
    assert.match(notifications[0].message, /Mock notification/);

    assert.equal(isExaminationMarksEntryOpen(dailyExam, new Date(2026, 10, 5, 16, 0)), false);
    assert.equal(isExaminationMarksEntryOpen(dailyExam, new Date(2026, 10, 10, 9, 59)), false);
    assert.equal(isExaminationMarksEntryOpen(dailyExam, new Date(2026, 10, 10, 10, 0)), true);

    const history = getInitialActivityEvents(schedules);
    assert.equal(
      history.filter((event) =>
        event.batchId === 'batch-daily' && event.eventType === 'Topic Completed'
      ).length,
      40
    );
    assert.ok(history.some((event) =>
      event.batchId === 'batch-daily' &&
      event.moduleId === 'mod-2' &&
      event.eventType === 'Module Submitted for Finance Verification' &&
      event.trainerId === 'SA101' &&
      event.displayDate === '2026-11-05' &&
      event.timestamp === '2026-11-05T04:30:00.000Z'
    ));
  });

  it('repairs old local sample completion data without replacing real assessment records', () => {
    const schedules = getInitialSchedules();
    const seeded = getInitialSyllabusAssessments(schedules, initialModulesData[0]);
    const oldSaved = seeded.filter((assessment) =>
      assessment.batchId !== 'batch-daily' ||
      ['top-2-11', 'top-2-12', 'top-2-13'].includes(assessment.topicId)
    );
    const realAttempt = {
      ...seeded[0],
      id: 'real-attempt-id',
      batchId: 'batch-daily',
      topicId: 'top-2-05'
    };
    const merged = mergeInitialSyllabusAssessments([...oldSaved, realAttempt], seeded);
    const mergedDailySeeds = merged.filter((assessment) =>
      assessment.batchId === 'batch-daily' && assessment.id.startsWith('sample-batch-daily-')
    );
    assert.equal(mergedDailySeeds.length, 40);
    assert.equal(merged.filter((assessment) => assessment.id === 'real-attempt-id').length, 1);
  });

  it('removes stale or pre-exam saved marks but preserves a valid post-start submission', () => {
    const examination = getInitialAdminExaminations(getInitialSchedules())
      .find((exam) => exam.id === 'ADM-EXAM-DAILY-MOD2-2026');
    assert.ok(examination);
    const studentMarks: ExaminationStudentMarks[] = examination.eligibleStudents.map((student) => ({
      studentId: student.studentId,
      theory: 80,
      practical: 85,
      project: 90
    }));
    const staleSubmitted = {
      id: 'stale-submitted',
      examinationId: examination.id,
      batchId: examination.batchId,
      moduleId: examination.moduleId,
      trainerId: 'SA101',
      studentMarks,
      status: 'Submitted' as const,
      submittedAt: '2026-11-05T10:00:00.000Z'
    };
    const staleDraft = {
      ...staleSubmitted,
      id: 'stale-draft',
      status: 'Draft' as const,
      submittedAt: undefined,
      savedAt: '2026-11-05T10:00:00.000Z'
    };
    const actualSubmission = {
      ...staleSubmitted,
      id: 'actual-submission',
      submittedAt: new Date(2026, 10, 10, 10, 1).toISOString()
    };
    const now = new Date(2026, 10, 10, 10, 2);
    assert.deepEqual(
      sanitizePersistedExaminationMarks(
        [examination],
        [staleSubmitted, staleDraft, actualSubmission],
        now
      ).map((record) => record.id),
      ['actual-submission']
    );
    assert.deepEqual(sanitizePersistedExaminationMarks([examination], [], now), []);
  });

  it('reveals Admin schedules and eligible students only after a fully qualified module submission', () => {
    const schedules = getInitialSchedules();
    const assessments = getInitialSyllabusAssessments(schedules, initialModulesData[0]);
    const examinations = getInitialAdminExaminations(schedules);
    const history = getInitialActivityEvents(schedules);
    const dailySubmission = history.find((event) =>
      event.batchId === 'batch-daily' &&
      event.moduleId === 'mod-2' &&
      event.eventType === 'Module Submitted for Finance Verification'
    );
    assert.ok(dailySubmission);

    const unpublished = getPublishedAdminExaminations({
      examinations,
      schedules,
      modules: initialModulesData,
      assessments,
      activityHistory: history.filter((event) => event !== dailySubmission)
    });
    assert.equal(unpublished.some((exam) => exam.batchId === 'batch-daily'), false);

    const incompleteHistory = history.filter((event) =>
      !(event.batchId === 'batch-daily' &&
        event.eventType === 'Topic Completed' &&
        event.topicId === 'top-2-01')
    );
    const incompleteModule = getPublishedAdminExaminations({
      examinations,
      schedules: schedules.map((schedule) =>
        schedule.id === 'batch-daily'
          ? {
              ...schedule,
              completedTopicIds: schedule.completedTopicIds?.filter((topicId) => topicId !== 'top-2-01')
            }
          : schedule
      ),
      modules: initialModulesData,
      assessments,
      activityHistory: incompleteHistory
    });
    assert.equal(incompleteModule.some((exam) => exam.batchId === 'batch-daily'), false);

    const incompleteAssessments = assessments.map((assessment) =>
      assessment.batchId === 'batch-daily' && assessment.topicId === 'top-2-01'
        ? {
            ...assessment,
            students: assessment.students.map((student, index) =>
              index === 0 ? { ...student, score: null } : student
            )
          }
        : assessment
    );
    const awaitingMcq = getPublishedAdminExaminations({
      examinations,
      schedules,
      modules: initialModulesData,
      assessments: incompleteAssessments,
      activityHistory: history
    });
    assert.equal(awaitingMcq.some((exam) => exam.batchId === 'batch-daily'), false);

    const published = getPublishedAdminExaminations({
      examinations,
      schedules,
      modules: initialModulesData,
      assessments,
      activityHistory: history
    });
    const dailyExam = published.find((exam) => exam.batchId === 'batch-daily');
    assert.ok(dailyExam);
    assert.equal(dailyExam.eligibleStudents.length, 6);
    assert.deepEqual(
      dailyExam.eligibleStudents.map((student) => student.studentId),
      ['st-21', 'st-22', 'st-24', 'st-26', 'st-27', 'st-28']
    );
    assert.equal(
      published.some((exam) => exam.batchId === 'batch-mwf'),
      false
    );
  });
});
