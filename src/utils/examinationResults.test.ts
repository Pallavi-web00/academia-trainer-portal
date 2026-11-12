import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AdminExamination, ExaminationMarksRecord } from '../types';
import { createExaminationResultsPdf, getExaminationResultRows } from './examinationResults';

const examination: AdminExamination = {
  id: 'exam-one',
  batchId: 'batch-one',
  batchName: 'Batch One',
  moduleId: 'module-one',
  moduleName: 'Module One',
  components: {},
  eligibleStudents: [
    { studentId: 'student-1', studentName: 'A Student', batchName: 'Batch One' },
    { studentId: 'student-2', studentName: 'B Student', batchName: 'Batch One' },
    { studentId: 'student-3', studentName: 'C Student', batchName: 'Batch One' },
    { studentId: 'student-4', studentName: 'D Student', batchName: 'Batch One' }
  ],
  publishedAt: '2026-11-01T00:00:00.000Z',
  status: 'Admin Published',
  publishedBy: 'ADMIN-01',
  scheduleUpdates: []
};

const submittedRecord: ExaminationMarksRecord = {
  id: 'marks-one',
  examinationId: examination.id,
  batchId: examination.batchId,
  moduleId: examination.moduleId,
  trainerId: 'TRAINER-01',
  status: 'Submitted',
  studentMarks: [
    { studentId: 'student-1', theory: 85, practical: 90, project: 95 },
    { studentId: 'student-2', theory: 80, practical: 90, project: 90 },
    { studentId: 'student-3', theory: 85, practical: 90, project: 85 },
    { studentId: 'student-4', theory: 70, practical: 75, project: 80 }
  ]
};

describe('Examination result export data', () => {
  it('maps all finalized marks to eligible students and applies descending competition ranks', () => {
    const rows = getExaminationResultRows(examination, submittedRecord);

    assert.deepEqual(rows.map(({ rank, studentName, studentId, theory, practical, project, total }) => ({
      rank,
      studentName,
      studentId,
      theory,
      practical,
      project,
      total
    })), [
      { rank: 1, studentName: 'A Student', studentId: 'student-1', theory: 85, practical: 90, project: 95, total: 270 },
      { rank: 2, studentName: 'B Student', studentId: 'student-2', theory: 80, practical: 90, project: 90, total: 260 },
      { rank: 2, studentName: 'C Student', studentId: 'student-3', theory: 85, practical: 90, project: 85, total: 260 },
      { rank: 4, studentName: 'D Student', studentId: 'student-4', theory: 70, practical: 75, project: 80, total: 225 }
    ]);
  });

  it('rejects drafts and missing finalized marks instead of exporting placeholder values', () => {
    assert.throws(
      () => getExaminationResultRows(examination, { ...submittedRecord, status: 'Draft' }),
      /Only submitted examination marks/
    );
    assert.throws(
      () => getExaminationResultRows(examination, {
        ...submittedRecord,
        studentMarks: submittedRecord.studentMarks.slice(1)
      }),
      /missing for eligible student student-1/
    );
    assert.throws(
      () => getExaminationResultRows(examination, {
        ...submittedRecord,
        studentMarks: submittedRecord.studentMarks.map((marks) =>
          marks.studentId === 'student-1' ? { ...marks, theory: null } : marks
        )
      }),
      /incomplete for eligible student student-1/
    );
  });

  it('generates a landscape PDF with all marks, headings, signatures, and footer', () => {
    const pdf = createExaminationResultsPdf(examination, getExaminationResultRows(examination, submittedRecord));
    const output = pdf.output();

    for (const text of [
      'MODULE ONE EXAMINATION RESULT',
      'Rank-wise Merit List',
      'RANK',
      'NAME',
      'STUDENT ID',
      'THEORY / 100',
      'PRACTICAL / 100',
      'PROJECT / 100',
      'TOTAL / 300',
      '85',
      '90',
      '95',
      '270',
      'Exam In-Charge',
      'Director',
      'SKILL AI | MODULE ONE EXAMINATION RESULT'
    ]) {
      assert.ok(output.includes(text), `Expected generated PDF to include "${text}".`);
    }

    const expectedDate = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());
    assert.ok(output.includes(`Date: ${expectedDate}`));
    assert.equal(pdf.internal.pageSize.getWidth() > pdf.internal.pageSize.getHeight(), true);
    assert.ok(output.indexOf('Exam In-Charge') > output.indexOf('270'));
    assert.ok(output.indexOf('Director') > output.indexOf('Exam In-Charge'));
    assert.ok(output.indexOf('SKILL AI | MODULE ONE EXAMINATION RESULT') > output.indexOf('Director'));
  });
});
