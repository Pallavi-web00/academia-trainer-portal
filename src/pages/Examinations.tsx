import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  Users
} from 'lucide-react';
import { useTrainer } from '../context/TrainerContext';
import {
  AdminExamination,
  ExaminationComponentType,
  ExaminationMarksRecord,
  ExaminationStudentMarks
} from '../types';
import { getScheduleBatchId, isScheduleAssignedToTrainer } from '../utils/dateTimeUtils';
import {
  createEmptyStudentMarks,
  getEarliestExaminationDate,
  getExaminationComponents,
  isExaminationMarksEntryOpen
} from '../utils/examinationMarks';

const formatDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
};

const emptyDraft = (examination: AdminExamination): ExaminationStudentMarks[] =>
  createEmptyStudentMarks(examination.eligibleStudents.map((student) => student.studentId));

export const Examinations: React.FC = () => {
  const {
    trainer,
    examinations,
    examinationMarks,
    schedules,
    currentTime,
    saveExaminationMarks,
    submitExaminationMarks
  } = useTrainer();
  const [searchParams] = useSearchParams();
  const [expandedEligibleExamId, setExpandedEligibleExamId] = useState<string | null>(null);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ExaminationStudentMarks[]>([]);
  const [confirmingExamId, setConfirmingExamId] = useState<string | null>(null);
  const [showingMarksExamId, setShowingMarksExamId] = useState<string | null>(null);

  const assignedExaminations = useMemo(
    () => examinations.filter((exam) =>
      schedules.some((schedule) =>
        getScheduleBatchId(schedule) === exam.batchId &&
        schedule.moduleId === exam.moduleId &&
        isScheduleAssignedToTrainer(schedule, trainer)
      )
    ),
    [examinations, schedules, trainer]
  );

  useEffect(() => {
    const examinationId = searchParams.get('exam');
    if (examinationId && assignedExaminations.some((exam) => exam.id === examinationId)) {
      setActiveExamId(null);
      setExpandedEligibleExamId(examinationId);
      const record = examinationMarks.find((item) => item.examinationId === examinationId);
      setShowingMarksExamId(record?.status === 'Submitted' ? examinationId : null);
    }
  }, [assignedExaminations, examinationMarks, searchParams]);

  const setMark = (
    studentId: string,
    component: ExaminationComponentType,
    rawValue: string
  ) => {
    const key = component.toLowerCase() as 'theory' | 'practical' | 'project';
    const value = rawValue === '' ? null : Number(rawValue);
    setDraft((current) => current.map((student) =>
      student.studentId === studentId
        ? { ...student, [key]: value !== null && Number.isFinite(value) ? value : null }
        : student
    ));
  };

  const openEntry = (exam: AdminExamination, saved?: ExaminationMarksRecord) => {
    setDraft(saved ? saved.studentMarks.map((student) => ({ ...student })) : emptyDraft(exam));
    setActiveExamId(exam.id);
    setConfirmingExamId(null);
    setShowingMarksExamId(null);
  };

  const confirmSubmit = (exam: AdminExamination) => {
    if (submitExaminationMarks(exam.id, draft)) {
      setConfirmingExamId(null);
      setActiveExamId(null);
      setShowingMarksExamId(null);
    }
  };

  const summary = [
    {
      label: 'Admin-scheduled examinations',
      count: assignedExaminations.length,
      icon: CalendarDays,
      color: 'bg-rose-50 text-rose-900'
    },
    {
      label: 'Eligible students',
      count: assignedExaminations.reduce((total, exam) => total + exam.eligibleStudents.length, 0),
      icon: Users,
      color: 'bg-pink-50 text-pink-700'
    },
    {
      label: 'Marks submitted',
      count: examinationMarks.filter((record) =>
        record.status === 'Submitted' &&
        assignedExaminations.some((exam) => exam.id === record.examinationId)
      ).length,
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-700'
    }
  ];

  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-rose-100 bg-gradient-to-r from-rose-50 to-white p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-rose-900 p-2 text-white">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Examinations</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Review Admin-published schedules and eligible students, then enter and submit examination marks.
            </p>
          </div>
        </div>
        <p className="mt-4 rounded-lg border border-rose-100 bg-white/80 px-3 py-2 text-xs leading-relaxed text-rose-900">
          Admin schedules and eligibility lists are mock data in this frontend. Drafts and submitted marks are saved in this browser only; notifications are mock handoffs and do not reach an external Admin service.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {summary.map(({ label, count, icon: Icon, color }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <span className={`rounded-lg p-2 ${color}`}><Icon className="h-5 w-5" /></span>
            <div>
              <p className="text-xl font-bold text-slate-900">{count}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {assignedExaminations.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-rose-300" />
          <h2 className="mt-3 text-sm font-bold text-slate-800">No examination schedules</h2>
          <p className="mt-1 text-xs text-slate-500">Admin-published schedules for your assigned batches will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignedExaminations.map((exam) => {
            const record = examinationMarks.find((item) => item.examinationId === exam.id);
            const submitted = record?.status === 'Submitted';
            const editing = activeExamId === exam.id && !submitted;
            const viewing = showingMarksExamId === exam.id;
            const entryOpen = isExaminationMarksEntryOpen(exam, currentTime);
            const earliest = getEarliestExaminationDate(exam);
            const components = getExaminationComponents(exam);

            return (
              <article
                key={exam.id}
                className={`rounded-xl border bg-white p-4 shadow-2xs sm:p-5 ${
                  activeExamId === exam.id ? 'border-rose-300 ring-1 ring-rose-100' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900">{exam.moduleName}</h2>
                      <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-900">{exam.batchName}</span>
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">{exam.status}</span>
                      {submitted ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Marks Submitted
                        </span>
                      ) : record?.status === 'Draft' ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">Draft Saved</span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                          {earliest && !entryOpen ? 'Examination Upcoming · Marks Pending' : 'Marks Pending'}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Schedule ID: {exam.id}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedEligibleExamId((current) => current === exam.id ? null : exam.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-900 hover:bg-rose-50"
                    >
                      <Users className="h-4 w-4" />
                      {exam.eligibleStudents.length} Eligible Students
                    </button>
                    {submitted ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveExamId(null);
                          setShowingMarksExamId(exam.id);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-900 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800"
                      >
                        <FileText className="h-4 w-4" /> View Marks
                      </button>
                    ) : entryOpen && !editing ? (
                      <button
                        type="button"
                        onClick={() => openEntry(exam, record)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-900 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800"
                      >
                        <FileText className="h-4 w-4" /> {record ? 'Continue Marks' : 'Enter Marks'}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {components.map((component) => (
                    <div key={component.type} className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2">
                      <p className="text-xs font-bold text-slate-800">{component.type}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {formatDate(component.scheduledDate)} · {component.scheduledTime}
                        {component.endTime ? ` – ${component.endTime}` : ''}
                      </p>
                      {component.maxMarks !== undefined && (
                        <p className="mt-0.5 text-[11px] text-slate-500">Maximum: {component.maxMarks}</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" />
                    {!earliest
                      ? 'Marks entry is locked because no examination component is scheduled.'
                      : entryOpen
                        ? 'Marks entry is open.'
                        : `Marks entry locked — opens ${formatDateTime(earliest.toISOString())}.`}
                  </span>
                  <span>Published {formatDateTime(exam.publishedAt)} by {exam.publishedBy}</span>
                </div>

                {expandedEligibleExamId === exam.id && (
                  <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full min-w-[400px] text-left text-xs">
                      <thead className="bg-rose-50 text-[10px] uppercase tracking-wide text-rose-900">
                        <tr>
                          <th className="px-3 py-2">Student</th>
                          <th className="px-3 py-2">Student ID</th>
                          <th className="px-3 py-2">Batch</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {exam.eligibleStudents.map((student) => (
                          <tr key={student.studentId} className="text-slate-700">
                            <td className="px-3 py-2 font-medium">{student.studentName}</td>
                            <td className="px-3 py-2 font-mono">{student.studentId}</td>
                            <td className="px-3 py-2">{student.batchName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {record?.status === 'Draft' && (
                  <p className="mt-3 text-[11px] text-slate-500">Last saved locally: {formatDateTime(record.savedAt)}</p>
                )}
                {submitted && (
                  <p className="mt-3 text-[11px] text-emerald-800">
                    Submitted {formatDateTime(record.submittedAt)} by trainer {record.trainerId}. Submitted marks are locked.
                  </p>
                )}

                {editing && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <h3 className="text-sm font-bold text-slate-900">Enter examination marks</h3>
                    <p className="mt-1 text-xs text-slate-500">Enter values for the scheduled components. Partial drafts can be saved; final submission requires every value.</p>
                    <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full min-w-[640px] text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Student</th>
                            {components.map((component) => (
                              <th key={component.type} className="px-3 py-2">
                                {component.type}{component.maxMarks !== undefined ? ` (/${component.maxMarks})` : ''}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {exam.eligibleStudents.map((student) => (
                            <tr key={student.studentId}>
                              <td className="px-3 py-2 font-medium text-slate-800">
                                {student.studentName}<span className="ml-1 font-mono text-[10px] text-slate-400">{student.studentId}</span>
                              </td>
                              {components.map((component) => {
                                const key = component.type.toLowerCase() as 'theory' | 'practical' | 'project';
                                const value = draft.find((item) => item.studentId === student.studentId)?.[key];
                                return (
                                  <td key={component.type} className="px-3 py-2">
                                    <input
                                      type="number"
                                      min="0"
                                      max={component.maxMarks}
                                      step="any"
                                      value={value ?? ''}
                                      onChange={(event) => setMark(student.studentId, component.type, event.target.value)}
                                      aria-label={`${component.type} marks for ${student.studentName}`}
                                      className="w-24 rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {confirmingExamId === exam.id ? (
                      <div className="mt-4 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs font-medium text-amber-900">Submit these final marks? They will be locked and read-only.</p>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setConfirmingExamId(null)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Cancel</button>
                          <button type="button" onClick={() => confirmSubmit(exam)} className="rounded-lg bg-rose-900 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800">Confirm Submission</button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (saveExaminationMarks(exam.id, draft)) setActiveExamId(null);
                          }}
                          className="rounded-lg border border-rose-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-900 hover:bg-rose-50"
                        >
                          Save Draft
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingExamId(exam.id)}
                          className="rounded-lg bg-rose-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-800"
                        >
                          Submit Final Marks
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {submitted && viewing && record && (
                  <div className="mt-4 overflow-x-auto rounded-lg border border-emerald-200">
                    <table className="w-full min-w-[640px] text-left text-xs">
                      <thead className="bg-emerald-50 text-[10px] uppercase tracking-wide text-emerald-800">
                        <tr>
                          <th className="px-3 py-2">Student</th>
                          {components.map((component) => <th key={component.type} className="px-3 py-2">{component.type}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {record.studentMarks.map((marks) => {
                          const student = exam.eligibleStudents.find((item) => item.studentId === marks.studentId);
                          return (
                            <tr key={marks.studentId}>
                              <td className="px-3 py-2 font-medium text-slate-800">{student?.studentName || marks.studentId}</td>
                              {components.map((component) => {
                                const key = component.type.toLowerCase() as 'theory' | 'practical' | 'project';
                                return <td key={component.type} className="px-3 py-2 text-slate-700">{marks[key]}</td>;
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
