import {
  AdminExamination,
  ExaminationMarksRecord,
  ModuleData,
  ScheduleItem,
  SyllabusActivityEvent,
  SyllabusAssessment
} from '../types';
import { isExaminationCompleted } from './examinationMarks';
import { getScheduleBatchId } from './dateTimeUtils';
import { isModuleSuccessfullyCompletedForBatch } from './syllabusAssessment';

export function getScheduleCompletionStatus(input: {
  schedule: ScheduleItem;
  modules: ModuleData[];
  activityHistory: SyllabusActivityEvent[];
  assessments: SyllabusAssessment[];
  examinations: AdminExamination[];
  examinationMarks: ExaminationMarksRecord[];
}): {
  isModuleCompleted: boolean;
  examination?: AdminExamination;
  isExamCompleted: boolean;
} {
  const { schedule, modules, activityHistory, assessments, examinations, examinationMarks } = input;
  const module = modules.find((item) => item.id === schedule.moduleId);
  const isModuleCompleted = Boolean(module && isModuleSuccessfullyCompletedForBatch({
    topicIds: module.topics.map((topic) => topic.id),
    schedule,
    activityHistory,
    assessments
  }));
  const examination = isModuleCompleted
    ? examinations.find((item) =>
        item.status === 'Admin Published' &&
        item.batchId === getScheduleBatchId(schedule) &&
        item.moduleId === schedule.moduleId
      )
    : undefined;

  return {
    isModuleCompleted,
    examination,
    isExamCompleted: Boolean(examination && isExaminationCompleted(examination, examinationMarks))
  };
}
