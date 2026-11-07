import {
  AdminExamination,
  ExaminationComponentType,
  ExaminationMarksRecord,
  ExaminationStudentMarks
} from '../types';
import { parseTimeToMinutes } from './dateTimeUtils';

const COMPONENTS: ExaminationComponentType[] = ['Theory', 'Practical', 'Project'];

export function getExaminationComponents(examination: AdminExamination) {
  return COMPONENTS.flatMap((type) => {
    const component = examination.components[type];
    return component ? [{ type, ...component }] : [];
  });
}

export function getEarliestExaminationDate(examination: AdminExamination): Date | undefined {
  const dates = getExaminationComponents(examination).map((component) => {
    const match = component.scheduledDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const timeMatch = component.scheduledTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match || !timeMatch) return undefined;
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    if (hours < 1 || hours > 12 || minutes > 59) return undefined;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (
      date.getFullYear() !== Number(match[1]) ||
      date.getMonth() !== Number(match[2]) - 1 ||
      date.getDate() !== Number(match[3])
    ) return undefined;
    date.setHours(0, parseTimeToMinutes(component.scheduledTime), 0, 0);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }).filter((date): date is Date => date !== undefined);
  return dates.sort((a, b) => a.getTime() - b.getTime())[0];
}

export function isExaminationMarksEntryOpen(
  examination: AdminExamination,
  now: Date = new Date()
): boolean {
  const earliest = getEarliestExaminationDate(examination);
  return Boolean(earliest && now.getTime() >= earliest.getTime());
}

export function isExaminationCompleted(
  examination: AdminExamination,
  records: ExaminationMarksRecord[]
): boolean {
  return records.some((record) =>
    record.examinationId === examination.id &&
    record.batchId === examination.batchId &&
    record.moduleId === examination.moduleId &&
    record.status === 'Submitted'
  );
}

export function sanitizePersistedExaminationMarks(
  examinations: AdminExamination[],
  records: ExaminationMarksRecord[],
  now: Date = new Date()
): ExaminationMarksRecord[] {
  const examinationsById = new Map(examinations.map((exam) => [exam.id, exam]));
  return records.filter((record) => {
    const examination = examinationsById.get(record.examinationId);
    const earliest = examination && getEarliestExaminationDate(examination);
    const timestamp = record.status === 'Submitted' ? record.submittedAt : record.savedAt;
    const savedAt = timestamp ? Date.parse(timestamp) : Number.NaN;
    if (
      !examination ||
      !earliest ||
      !Number.isFinite(savedAt) ||
      savedAt < earliest.getTime() ||
      savedAt > now.getTime()
    ) return false;
    if (record.status === 'Submitted') {
      return Boolean(
        record.submittedAt &&
        record.trainerId &&
        !getMarksValidationError(examination, record.studentMarks, true)
      );
    }
    return record.status === 'Draft' &&
      !getMarksValidationError(examination, record.studentMarks, false);
  });
}

export function getMarksValidationError(
  examination: AdminExamination,
  studentMarks: ExaminationStudentMarks[],
  requireComplete: boolean
): string | undefined {
  const eligibleIds = examination.eligibleStudents.map((student) => student.studentId);
  if (new Set(eligibleIds).size !== eligibleIds.length) {
    return 'The Admin eligibility list contains duplicate student IDs.';
  }
  const entries = new Map(studentMarks.map((student) => [student.studentId, student]));
  if (
    entries.size !== studentMarks.length ||
    studentMarks.some((student) => !eligibleIds.includes(student.studentId)) ||
    eligibleIds.some((studentId) => !entries.has(studentId))
  ) return 'Marks must be recorded once for every Admin-approved eligible student.';

  for (const component of getExaminationComponents(examination)) {
    const key = component.type.toLowerCase() as 'theory' | 'practical' | 'project';
    for (const student of examination.eligibleStudents) {
      const value = entries.get(student.studentId)?.[key];
      if (value === null || value === undefined) {
        if (requireComplete) return `Enter ${component.type} marks for every eligible student before submitting.`;
        continue;
      }
      if (!Number.isFinite(value) || value < 0) {
        return `${component.type} marks must be a non-negative number.`;
      }
      if (component.maxMarks !== undefined && value > component.maxMarks) {
        return `${component.type} marks cannot exceed the Admin-supplied maximum of ${component.maxMarks}.`;
      }
    }
  }
  return undefined;
}

export function createEmptyStudentMarks(studentIds: string[]): ExaminationStudentMarks[] {
  return studentIds.map((studentId) => ({
    studentId,
    theory: null,
    practical: null,
    project: null
  }));
}
