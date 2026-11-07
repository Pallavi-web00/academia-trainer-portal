import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ScheduleItem, Student, SyllabusActivityEvent, SyllabusAssessment } from '../types';
import {
  areAllStudentsAssessmentQualified,
  getStudentsRequiringNextAssessment,
  getTopicAssessmentAttempts,
  hasModuleFinanceSubmission,
  hasSavedTopicCompletion,
  isModuleReadyForFinanceVerification,
  isModuleSuccessfullyCompletedForBatch
} from './syllabusAssessment';
import { createFinanceModuleSubmissionNotification } from './financeNotifications';

const makeStudent = (id: string, name: string): Student => ({
  id,
  name,
  rollNumber: id,
  attendancePercent: 100,
  email: `${id}@example.test`
});

const roster: ScheduleItem['students'] = [
  makeStudent('student-1', 'Student One'),
  makeStudent('student-2', 'Student Two')
];

function assessment(
  batchId: string,
  attempt: number,
  scores: Array<[string, number | null]>,
  status: SyllabusAssessment['status'] = 'Completed',
  topicId = 'topic-1'
): SyllabusAssessment {
  return {
    id: `${batchId}-attempt-${attempt}`,
    batchId,
    moduleId: 'module-1',
    topicId,
    topicName: 'Topic One',
    attempt,
    questions: [],
    students: scores.map(([studentId, score]) => ({
      studentId,
      studentName: studentId,
      score
    })),
    status,
    sentAt: `2026-01-0${attempt}T00:00:00.000Z`
  };
}

function completedTopic(batchId: string, topicId: string): SyllabusActivityEvent {
  return {
    id: `${batchId}-${topicId}-completed`,
    timestamp: '2026-01-01T10:00:00.000Z',
    displayDate: '2026-01-01',
    batchId,
    moduleId: 'module-1',
    moduleName: 'Module One',
    eventType: 'Topic Completed',
    topicId,
    savedStatus: 'Saved'
  };
}

describe('syllabus assessment completion criteria', () => {
  it('keeps every batch- and topic-specific attempt available after topic completion', () => {
    const firstAttempt = assessment('batch-1', 1, [
      ['student-1', 7],
      ['student-2', 9]
    ]);
    const retake = assessment('batch-1', 2, [['student-1', 8]]);
    const otherBatch = assessment('batch-2', 1, [
      ['student-1', 10],
      ['student-2', 10]
    ]);

    const attempts = getTopicAssessmentAttempts(
      [firstAttempt, retake, otherBatch],
      'batch-1',
      'module-1',
      'topic-1'
    );

    assert.deepEqual(attempts.map((item) => item.id), [retake.id, firstAttempt.id]);
    assert.deepEqual(attempts[1].students.map((student) => student.score), [7, 9]);
    assert.deepEqual(attempts[0].students.map((student) => student.studentId), ['student-1']);
    assert.equal(attempts.every((item) => item.batchId === 'batch-1'), true);
  });

  it('passes only when every student scores strictly above 75%', () => {
    const completed = assessment('batch-1', 1, [
      ['student-1', 9],
      ['student-2', 7.6]
    ]);

    assert.equal(areAllStudentsAssessmentQualified(completed, roster, [completed]), true);
    assert.equal(
      areAllStudentsAssessmentQualified(
        assessment('batch-1', 1, [['student-1', 9], ['student-2', 7.5]]),
        roster,
        [assessment('batch-1', 1, [['student-1', 9], ['student-2', 7.5]])]
      ),
      false
    );
    assert.equal(
      areAllStudentsAssessmentQualified(
        assessment('batch-1', 1, [['student-1', 9], ['student-2', 7]]),
        roster,
        [assessment('batch-1', 1, [['student-1', 9], ['student-2', 7]])]
      ),
      false
    );
  });

  it('keeps the topic pending when a student has not completed an assessment', () => {
    const incomplete = assessment('batch-1', 1, [['student-1', 9]], 'In Progress');
    assert.equal(areAllStudentsAssessmentQualified(incomplete, roster, [incomplete]), false);
  });

  it('retains a passed result and qualifies a student who passes on retest', () => {
    const firstAttempt = assessment('batch-1', 1, [
      ['student-1', 9],
      ['student-2', 7]
    ]);
    const retest = assessment('batch-1', 2, [['student-2', 8]]);

    assert.equal(
      areAllStudentsAssessmentQualified(retest, roster, [firstAttempt, retest]),
      true
    );
  });

  it('includes all students initially and only previously failed students in later attempts', () => {
    const sixStudents = Array.from({ length: 6 }, (_, index) =>
      makeStudent(`student-${index + 1}`, `Student ${index + 1}`)
    );
    const firstAttempt = assessment('batch-1', 1, [
      ['student-1', 8],
      ['student-2', 7.5],
      ['student-3', 6],
      ['student-4', 9],
      ['student-5', 7],
      ['student-6', 10]
    ]);

    assert.deepEqual(
      getStudentsRequiringNextAssessment(sixStudents, []).map((student) => student.id),
      sixStudents.map((student) => student.id)
    );
    assert.deepEqual(
      getStudentsRequiringNextAssessment(sixStudents, [firstAttempt]).map((student) => student.id),
      ['student-2', 'student-3', 'student-5']
    );
    assert.deepEqual(
      getStudentsRequiringNextAssessment(
        [...sixStudents, makeStudent('new-student', 'New Student')],
        [firstAttempt]
      ).map((student) => student.id),
      ['student-2', 'student-3', 'student-5']
    );

    const secondAttempt = assessment('batch-1', 2, [
      ['student-2', 7.5],
      ['student-3', 8],
      ['student-5', 7]
    ]);
    assert.deepEqual(
      getStudentsRequiringNextAssessment(sixStudents, [firstAttempt, secondAttempt])
        .map((student) => student.id),
      ['student-2', 'student-5']
    );

    const thirdAttempt = assessment('batch-1', 3, [
      ['student-2', 8],
      ['student-5', 9]
    ]);
    assert.deepEqual(
      getStudentsRequiringNextAssessment(sixStudents, [firstAttempt, secondAttempt, thirdAttempt]),
      []
    );
  });

  it('creates only one participation record per student in an attempt', () => {
    const duplicateRoster = [roster[0], roster[0], roster[1]];
    assert.deepEqual(
      getStudentsRequiringNextAssessment(duplicateRoster, []).map((student) => student.id),
      ['student-1', 'student-2']
    );
  });

  it('does not use passing results from another batch', () => {
    const batchA = assessment('batch-a', 1, [
      ['student-1', 9],
      ['student-2', 8]
    ]);
    const batchB = assessment('batch-b', 1, [
      ['student-1', 9],
      ['student-2', 7]
    ]);

    assert.equal(
      areAllStudentsAssessmentQualified(batchB, roster, [batchA, batchB]),
      false
    );
  });

  it('does not complete an empty roster', () => {
    const completed = assessment('batch-1', 1, []);
    assert.equal(areAllStudentsAssessmentQualified(completed, [], [completed]), false);
  });

  it('recognizes an existing completion only for the same batch and topic', () => {
    const completion: SyllabusActivityEvent = {
      id: 'completion-1',
      timestamp: '2026-01-01T10:00:00.000Z',
      displayDate: '2026-01-01',
      batchId: 'batch-1',
      moduleId: 'module-1',
      moduleName: 'Module One',
      eventType: 'Topic Completed',
      topicId: 'topic-1',
      savedStatus: 'Saved'
    };

    assert.equal(
      hasSavedTopicCompletion([completion], [], 'batch-1', 'module-1', 'topic-1'),
      true
    );
    assert.equal(
      hasSavedTopicCompletion([completion], [], 'batch-2', 'module-1', 'topic-1'),
      false
    );
    assert.equal(
      hasSavedTopicCompletion([], ['topic-1'], 'batch-1', 'module-1', 'topic-1'),
      true
    );
  });

  it('allows module submission only after every planned topic is completed and every student qualifies', () => {
    const assessments = [
      assessment('batch-1', 1, [['student-1', 9], ['student-2', 8]], 'Completed', 'topic-1'),
      assessment('batch-1', 1, [['student-1', 8], ['student-2', 9]], 'Completed', 'topic-2')
    ];
    const completions = [
      completedTopic('batch-1', 'topic-1'),
      completedTopic('batch-1', 'topic-2')
    ];
    const input = {
      topicIds: ['topic-1', 'topic-2'],
      batchId: 'batch-1',
      moduleId: 'module-1',
      students: roster,
      completedTopicIds: ['topic-1', 'topic-2'],
      activityHistory: completions,
      assessments
    };

    assert.equal(isModuleReadyForFinanceVerification(input), true);
    assert.equal(
      isModuleReadyForFinanceVerification({
        ...input,
        completedTopicIds: ['topic-1'],
        activityHistory: [completions[0]]
      }),
      false
    );
    assert.equal(
      isModuleReadyForFinanceVerification({
        ...input,
        assessments: [
          assessments[0],
          assessment('batch-1', 1, [['student-1', 8], ['student-2', 7.5]], 'Completed', 'topic-2')
        ]
      }),
      false
    );
    assert.equal(
      isModuleReadyForFinanceVerification({
        ...input,
        assessments: [
          assessments[0],
          assessment('batch-1', 1, [['student-1', 8], ['student-2', null]], 'In Progress', 'topic-2')
        ]
      }),
      false
    );
    assert.equal(
      isModuleReadyForFinanceVerification({
        ...input,
        assessments: [
          assessment('batch-2', 1, [['student-1', 9], ['student-2', 9]], 'Completed', 'topic-1'),
          assessments[1]
        ]
      }),
      false
    );
  });

  it('requires saved topic completion history and qualified assessments for every planned topic', () => {
    const assessments = [
      assessment('batch-1', 1, [['student-1', 9], ['student-2', 8]], 'Completed', 'topic-1'),
      assessment('batch-1', 1, [['student-1', 8], ['student-2', 9]], 'Completed', 'topic-2')
    ];
    const completions = [
      completedTopic('batch-1', 'topic-1'),
      completedTopic('batch-1', 'topic-2')
    ];
    const schedule: ScheduleItem = {
      id: 'schedule-1',
      batchId: 'batch-1',
      moduleId: 'module-1',
      moduleName: 'Module One',
      batch: 'Morning Batch',
      startDate: '2026-01-01',
      scheduledDate: '2026-01-01',
      scheduledDays: [1],
      startTime: '09:00 AM',
      endTime: '11:00 AM',
      sessionNumber: 1,
      totalSessions: 2,
      roomOrLink: 'Room 1',
      approvalStatus: 'Approved',
      syllabusUpdateStatus: 'Updated',
      students: roster,
      completedTopicIds: ['topic-1', 'topic-2']
    };
    const input = {
      topicIds: ['topic-1', 'topic-2'],
      schedule,
      activityHistory: completions,
      assessments
    };

    assert.equal(isModuleSuccessfullyCompletedForBatch(input), true);
    assert.equal(
      isModuleSuccessfullyCompletedForBatch({
        ...input,
        activityHistory: [completions[0]]
      }),
      false
    );
    assert.equal(
      isModuleSuccessfullyCompletedForBatch({
        ...input,
        activityHistory: completions.map((event) => ({ ...event, savedStatus: 'Pending' }))
      }),
      false
    );
    assert.equal(
      isModuleSuccessfullyCompletedForBatch({
        ...input,
        assessments: [
          assessments[0],
          assessment('batch-1', 1, [['student-1', 8], ['student-2', 7.5]], 'Completed', 'topic-2')
        ]
      }),
      false
    );
  });

  it('creates a Finance-audience mock notification with the submission details', () => {
    const notification = createFinanceModuleSubmissionNotification({
      id: 'module-submission-1',
      timestamp: '2026-01-01T10:00:00.000Z',
      displayDate: '2026-01-01',
      batchId: 'batch-1',
      batchName: 'Morning Batch',
      moduleId: 'module-1',
      moduleName: 'Module One',
      sessionId: 'schedule-1',
      trainerId: 'trainer-1',
      eventType: 'Module Submitted for Finance Verification',
      savedStatus: 'Saved'
    });

    assert.equal(notification.targetRole, 'Finance Department');
    assert.match(notification.title, /Module Submitted for Finance Verification/);
    assert.match(notification.message, /Morning Batch \(batch-1\)/);
    assert.match(notification.message, /Module One \(module-1\)/);
    assert.match(notification.message, /trainer-1/);
    assert.match(notification.message, /2026-01-01T10:00:00.000Z/);
    assert.match(notification.message, /mock Finance handoff/);
  });

  it('prevents a duplicate submission only for the same batch and module', () => {
    const submission: SyllabusActivityEvent = {
      id: 'module-submission-1',
      timestamp: '2026-01-01T10:00:00.000Z',
      displayDate: '2026-01-01',
      batchId: 'batch-1',
      batchName: 'Morning Batch',
      moduleId: 'module-1',
      moduleName: 'Module One',
      trainerId: 'trainer-1',
      eventType: 'Module Submitted for Finance Verification',
      savedStatus: 'Saved'
    };

    assert.equal(hasModuleFinanceSubmission([submission], 'batch-1', 'module-1'), true);
    assert.equal(hasModuleFinanceSubmission([submission], 'batch-2', 'module-1'), false);
    assert.equal(hasModuleFinanceSubmission([submission], 'batch-1', 'module-2'), false);
  });
});
