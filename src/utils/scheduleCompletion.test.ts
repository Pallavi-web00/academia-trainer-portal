import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getInitialAdminExaminations } from '../data/examinationData';
import { initialModulesData } from '../data/modulesData';
import { getInitialSchedules } from '../data/scheduleData';
import { getInitialSyllabusAssessments } from '../data/syllabusAssessmentData';
import { getScheduleCompletionStatus } from './scheduleCompletion';
import { getScheduleBatchId } from './dateTimeUtils';
import { ScheduleItem, SyllabusActivityEvent } from '../types';

describe('schedule completion status', () => {
  const schedules = getInitialSchedules();
  const modules = initialModulesData;
  const module = modules[0];
  const initialAssessments = getInitialSyllabusAssessments(schedules, module);
  const initialExaminations = getInitialAdminExaminations(schedules);

  it('reflects the seeded completed batch and its existing Admin exam', () => {
    const daily = schedules.find((schedule) => schedule.id === 'batch-daily');
    assert.ok(daily);

    const status = getScheduleCompletionStatus({
      schedule: daily,
      modules,
      activityHistory: getInitialActivityEventsForDaily(daily),
      assessments: initialAssessments,
      examinations: initialExaminations,
      examinationMarks: []
    });

    assert.equal(status.isModuleCompleted, true);
    assert.equal(status.examination?.id, 'ADM-EXAM-DAILY-MOD2-2026');
    assert.equal(status.isExamCompleted, false);
  });

  it('updates future batch completion independently and reflects a matching exam submission', () => {
    const futureBatch = schedules.find((schedule) => schedule.id === 'batch-mwf');
    const daily = schedules.find((schedule) => schedule.id === 'batch-daily');
    assert.ok(futureBatch);
    assert.ok(daily);

    const completedSchedule: ScheduleItem = {
      ...futureBatch,
      completedTopicIds: module.topics.map((topic) => topic.id)
    };
    const activityHistory: SyllabusActivityEvent[] = module.topics.map((topic) => ({
      id: `future-complete-${topic.id}`,
      timestamp: '2026-11-07T10:00:00.000Z',
      displayDate: '2026-11-07',
      batchId: getScheduleBatchId(completedSchedule),
      moduleId: module.id,
      moduleName: module.name,
      eventType: 'Topic Completed',
      topicId: topic.id,
      savedStatus: 'Saved'
    }));
    const passedAssessments = module.topics.map((topic) => ({
      id: `future-assessment-${topic.id}`,
      batchId: getScheduleBatchId(completedSchedule),
      moduleId: module.id,
      topicId: topic.id,
      topicName: topic.title,
      attempt: 1,
      questions: [],
      students: completedSchedule.students.map((student) => ({
        studentId: student.id,
        studentName: student.name,
        score: 9
      })),
      status: 'Completed' as const,
      sentAt: '2026-11-07T09:00:00.000Z',
      completedAt: '2026-11-07T10:00:00.000Z'
    }));
    const examination = initialExaminations.find((exam) =>
      exam.batchId === getScheduleBatchId(completedSchedule) &&
      exam.moduleId === completedSchedule.moduleId
    );
    assert.ok(examination);

    const status = getScheduleCompletionStatus({
      schedule: completedSchedule,
      modules,
      activityHistory,
      assessments: passedAssessments,
      examinations: initialExaminations,
      examinationMarks: []
    });
    assert.equal(status.isModuleCompleted, true);
    assert.equal(status.examination?.id, examination.id);
    assert.equal(status.isExamCompleted, false);

    const otherBatchStatus = getScheduleCompletionStatus({
      schedule: daily,
      modules,
      activityHistory,
      assessments: passedAssessments,
      examinations: initialExaminations,
      examinationMarks: []
    });
    assert.equal(otherBatchStatus.isModuleCompleted, false);

    const submittedMarks = {
      id: `marks-${examination.id}`,
      examinationId: examination.id,
      batchId: examination.batchId,
      moduleId: examination.moduleId,
      trainerId: 'trainer-1',
      studentMarks: [],
      status: 'Submitted' as const,
      submittedAt: '2026-11-10T12:00:00.000Z'
    };
    const examCompletedStatus = getScheduleCompletionStatus({
      schedule: completedSchedule,
      modules,
      activityHistory,
      assessments: passedAssessments,
      examinations: initialExaminations,
      examinationMarks: [submittedMarks]
    });
    assert.equal(examCompletedStatus.isExamCompleted, true);
    assert.equal(otherBatchStatus.isExamCompleted, false);
  });
});

function getInitialActivityEventsForDaily(schedule: ScheduleItem): SyllabusActivityEvent[] {
  const topics = initialModulesData.find((module) => module.id === schedule.moduleId)?.topics || [];
  return topics.map((topic) => ({
    id: `daily-complete-${topic.id}`,
    timestamp: '2026-11-05T10:00:00.000Z',
    displayDate: '2026-11-05',
    batchId: getScheduleBatchId(schedule),
    moduleId: schedule.moduleId,
    moduleName: schedule.moduleName,
    eventType: 'Topic Completed',
    topicId: topic.id,
    savedStatus: 'Saved'
  }));
}
