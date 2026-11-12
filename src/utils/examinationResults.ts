import autoTable from 'jspdf-autotable';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { AdminExamination, ExaminationMarksRecord } from '../types';

export type ExaminationExportFormat = 'pdf' | 'xlsx' | 'csv';

export const getStudentTotalMarks = (
  studentMarks: { theory: number | null; practical: number | null; project: number | null }
): number | null => {
  const { theory, practical, project } = studentMarks;
  if (theory === null || practical === null || project === null) return null;
  const total = theory + practical + project;
  return Number.isFinite(total) ? total : null;
};

export interface ExaminationResultRow {
  rank: number;
  studentName: string;
  studentId: string;
  theory: number;
  practical: number;
  project: number;
  total: number;
}

export const getExaminationResultRows = (
  examination: AdminExamination,
  record: ExaminationMarksRecord
): ExaminationResultRow[] => {
  if (record.status !== 'Submitted') {
    throw new Error('Only submitted examination marks can be exported.');
  }

  const marksById = new Map(record.studentMarks.map((studentMarks) => [studentMarks.studentId, studentMarks]));
  if (marksById.size !== record.studentMarks.length) {
    throw new Error('Submitted marks contain duplicate student IDs.');
  }

  const rows = examination.eligibleStudents
    .map((student) => {
      const studentMarks = marksById.get(student.studentId);
      if (!studentMarks) {
        throw new Error(`Submitted marks are missing for eligible student ${student.studentId}.`);
      }

      const { theory, practical, project } = studentMarks;
      if (
        theory === null ||
        practical === null ||
        project === null ||
        !Number.isFinite(theory) ||
        !Number.isFinite(practical) ||
        !Number.isFinite(project)
      ) {
        throw new Error(`Submitted marks are incomplete for eligible student ${student.studentId}.`);
      }

      return {
        studentName: student.studentName,
        studentId: student.studentId,
        theory,
        practical,
        project,
        total: theory + practical + project
      };
    })
    .sort((first, second) => second.total - first.total || first.studentName.localeCompare(second.studentName));
  if (rows.length !== marksById.size) {
    throw new Error('Submitted marks do not match the examination eligibility list.');
  }

  let previousTotal: number | null = null;
  let previousRank = 0;

  return rows.map((row, index) => {
    const rank = previousTotal !== null && row.total === previousTotal ? previousRank : index + 1;
    previousTotal = row.total;
    previousRank = rank;
    return { ...row, rank };
  });
};

const createDownloadUrl = (content: BlobPart, fileName: string) => {
  const blob = new Blob([content], {
    type: fileName.endsWith('.csv') ? 'text/csv;charset=utf-8' : 'application/octet-stream'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const buildFilename = (examination: AdminExamination, format: ExaminationExportFormat) => {
  const moduleName = (examination.moduleName || 'Module')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Module';
  const batchName = (examination.batchName || 'Batch')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Batch';
  return `${moduleName}_Examination_Result(${batchName}).${format}`;
};

const formatDateForPdf = (value: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(value);

export const createExaminationResultsPdf = (
  examination: AdminExamination,
  rows: ExaminationResultRow[]
): jsPDF => {
  const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const moduleHeading = `${examination.moduleName.toUpperCase()} EXAMINATION RESULT`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(moduleHeading, pageWidth / 2, 26, { align: 'center', maxWidth: pageWidth - 30 });

  doc.setFontSize(12);
  doc.text('Rank-wise Merit List', 15, 43);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDateForPdf(new Date())}`, pageWidth - 15, 43, { align: 'right' });

  autoTable(doc, {
    startY: 51,
    head: [['RANK', 'NAME', 'STUDENT ID', 'THEORY / 100', 'PRACTICAL / 100', 'PROJECT / 100', 'TOTAL / 300']],
    body: rows.map((row) => [
      String(row.rank),
      row.studentName,
      row.studentId,
      String(row.theory),
      String(row.practical),
      String(row.project),
      String(row.total)
    ]),
    theme: 'grid',
    headStyles: { fillColor: [116, 60, 80], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2.5, minCellHeight: 10, halign: 'center', valign: 'middle', overflow: 'linebreak' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { halign: 'left', cellWidth: 65 },
      2: { halign: 'center', cellWidth: 45 },
      3: { halign: 'center', cellWidth: 34 },
      4: { halign: 'center', cellWidth: 38 },
      5: { halign: 'center', cellWidth: 34 },
      6: { halign: 'center', cellWidth: 30 }
    },
    margin: { top: 51, left: 18, right: 18, bottom: 48 },
    showHead: 'everyPage'
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 160;
  const signatureLineY = finalY + 18;
  const signatureLabelY = signatureLineY + 7;
  const signatureCenters = [pageWidth * 0.27, pageWidth * 0.73];
  doc.setDrawColor(120, 120, 120);
  signatureCenters.forEach((center) => doc.line(center - 38, signatureLineY, center + 38, signatureLineY));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Exam In-Charge', signatureCenters[0], signatureLabelY, { align: 'center' });
  doc.text('Director', signatureCenters[1], signatureLabelY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(`SKILL AI | ${moduleHeading}`, pageWidth / 2, pageHeight - 9, { align: 'center' });
  return doc;
};

export const downloadExaminationResults = (
  examination: AdminExamination,
  record: ExaminationMarksRecord,
  format: ExaminationExportFormat
): void => {
  const rows = getExaminationResultRows(examination, record);

  if (format === 'csv') {
    const csvRows = [
      ['Rank', 'Student Name', 'Student ID', 'Theory Marks', 'Practical Marks', 'Project Marks', 'Total Marks'],
      ...rows.map((row) => [
        row.rank,
        row.studentName,
        row.studentId,
        row.theory,
        row.practical,
        row.project,
        row.total
      ])
    ];
    const csv = csvRows
      .map((cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    createDownloadUrl(csv, buildFilename(examination, format));
    return;
  }

  if (format === 'xlsx') {
    const sheet = XLSX.utils.json_to_sheet(
      rows.map((row) => ({
        Rank: row.rank,
        'Student Name': row.studentName,
        'Student ID': row.studentId,
        'Theory Marks': row.theory,
        'Practical Marks': row.practical,
        'Project Marks': row.project,
        'Total Marks': row.total
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Examination Results');
    XLSX.writeFile(workbook, buildFilename(examination, format));
    return;
  }

  createExaminationResultsPdf(examination, rows).save(buildFilename(examination, format));
};
