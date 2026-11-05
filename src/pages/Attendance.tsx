import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardClock,
  Clock3,
  Users,
  UserRound,
  CheckCircle2,
  XCircle,
  CalendarCheck2
} from 'lucide-react';
import { ScheduleItem, Student, AttendanceRecord, AttendanceStatus } from '../types';
import { createMockAttendanceRecords, attendancePolicyDescription, getAttendancePercentage } from '../data/attendanceData';
import { getBatchDaysDescription, getScheduleBatchId } from '../utils/dateTimeUtils';
import { useTrainer } from '../context/TrainerContext';

type AttendanceView = 'monthly' | 'today' | 'overall' | 'student';
type StatusFilter = 'All' | AttendanceStatus;

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const localDateString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const formatMonth = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const statusStyles: Record<AttendanceStatus, string> = {
  Present: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Absent: 'bg-rose-100 text-rose-800 border-rose-200',
  Late: 'bg-amber-100 text-amber-800 border-amber-200',
  Holiday: 'bg-slate-100 text-slate-700 border-slate-200'
};

const statusLetters: Record<AttendanceStatus, string> = {
  Present: 'P',
  Absent: 'A',
  Late: 'L',
  Holiday: 'H'
};

const StatusIndicator: React.FC<{ status: AttendanceStatus; compact?: boolean }> = ({ status, compact }) => (
  <span
    className={`inline-flex items-center justify-center border font-bold ${
      compact ? 'h-7 w-7 rounded-md text-[11px]' : 'min-w-8 rounded-md px-2 py-1 text-[11px]'
    } ${statusStyles[status]}`}
    aria-label={status}
  >
    {statusLetters[status]}
  </span>
);

const SummaryCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.FC<{ className?: string }>;
  tone: string;
}> = ({ label, value, icon: Icon, tone }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5">
    <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
      <Icon className="h-4 w-4" />
    </div>
    <p className="text-xl font-bold leading-none text-slate-900 sm:text-2xl">{value}</p>
    <p className="mt-2 text-xs font-medium text-slate-500">{label}</p>
  </div>
);

const StatCards: React.FC<{
  records: AttendanceRecord[];
  showPercentages?: boolean;
}> = ({ records, showPercentages = false }) => {
  const nonHolidayRecords = records.filter((record) => record.status !== 'Holiday');
  const denominator = nonHolidayRecords.length;
  const count = (status: AttendanceStatus) => records.filter((record) => record.status === status).length;
  const percent = (status: AttendanceStatus) =>
    denominator ? `${Math.round((count(status) / denominator) * 100)}%` : '0%';
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <SummaryCard
        label={showPercentages ? 'Total Present %' : 'Total Present'}
        value={showPercentages ? percent('Present') : count('Present')}
        icon={CheckCircle2}
        tone="bg-emerald-50 text-emerald-700"
      />
      <SummaryCard
        label={showPercentages ? 'Total Late %' : 'Total Late'}
        value={showPercentages ? percent('Late') : count('Late')}
        icon={Clock3}
        tone="bg-amber-50 text-amber-700"
      />
      <SummaryCard
        label={showPercentages ? 'Total Absent %' : 'Total Absent'}
        value={showPercentages ? percent('Absent') : count('Absent')}
        icon={XCircle}
        tone="bg-rose-50 text-rose-700"
      />
      <SummaryCard
        label="Total Holidays"
        value={count('Holiday')}
        icon={CalendarDays}
        tone="bg-sky-50 text-sky-700"
      />
    </div>
  );
};

const getMonthRecords = (records: AttendanceRecord[], date: Date) =>
  records.filter((record) => record.attendanceDate.startsWith(monthKey(date)));

const getRecordCounts = (records: AttendanceRecord[], status: AttendanceStatus) =>
  records.filter((record) => record.status === status).length;

const getAttendanceTone = (percentage: number) =>
  percentage >= 90
    ? 'text-emerald-700 bg-emerald-50'
    : percentage >= 75
      ? 'text-amber-800 bg-amber-50'
      : 'text-rose-700 bg-rose-50';

export const Attendance: React.FC = () => {
  const { schedules } = useTrainer();
  const [selectedBatch, setSelectedBatch] = useState<ScheduleItem | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [view, setView] = useState<AttendanceView>('monthly');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [highlightedStudentId, setHighlightedStudentId] = useState<string | null>(null);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [sortMode, setSortMode] = useState<'name' | 'highest' | 'lowest'>('name');
  const [showCompleteHistory, setShowCompleteHistory] = useState(false);

  const allRecords = useMemo(() => createMockAttendanceRecords(schedules), [schedules]);
  const today = localDateString(new Date());
  const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const batchRecords = useMemo(
    () => selectedBatch
      ? allRecords.filter((record) => record.batchId === getScheduleBatchId(selectedBatch))
      : [],
    [allRecords, selectedBatch]
  );

  const monthlyRecords = useMemo(
    () => getMonthRecords(batchRecords, selectedMonth),
    [batchRecords, selectedMonth]
  );

  const goToMonth = (offset: number) => {
    const nextMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + offset, 1);
    if (nextMonth > currentMonth) return;
    setSelectedMonth(nextMonth);
  };

  const goBackToMonthly = () => {
    setView('monthly');
    setSelectedStudent(null);
  };

  const openStudent = (student: Student) => {
    setSelectedStudent(student);
    setView('student');
  };

  const changeBatch = (batch: ScheduleItem) => {
    setSelectedBatch(batch);
    setSelectedStudent(null);
    setSelectedMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    setStatusFilter('All');
    setView('monthly');
    setRangeStart('');
    setRangeEnd('');
  };

  if (!selectedBatch) {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-800">
            <ClipboardClock className="h-4 w-4" />
            Biometric attendance
          </div>
          <p className="mt-1 text-sm text-slate-500">Choose an assigned batch to review its read-only attendance records.</p>
        </div>

        <div role="status" className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Demonstration data only: biometric synchronization is not connected. These sample records are read-only and are not live institutional data.</p>
        </div>

        {schedules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            No assigned batches are available.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {schedules.map((batch) => {
              const batchId = getScheduleBatchId(batch);
              const records = allRecords.filter((record) => record.batchId === batchId);
              const todayRecords = records.filter((record) => record.attendanceDate === today);
              const isTodayScheduled = batch.startDate <= today && batch.scheduledDays.includes(new Date().getDay());
              const overallPercentage = getAttendancePercentage(records);
              return (
                <article key={batch.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold text-slate-900">{batch.batch}</h2>
                      <p className="mt-1 text-xs text-slate-500">{getBatchDaysDescription(batch.batch, batch.scheduledDays)}</p>
                    </div>
                    <span className="rounded-lg bg-rose-50 p-2 text-rose-800"><Users className="h-4 w-4" /></span>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-lg font-bold text-slate-900">{batch.students.length}</p>
                      <p className="text-[11px] text-slate-500">Students</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-lg font-bold text-slate-900">{overallPercentage}%</p>
                      <p className="text-[11px] text-slate-500">Overall attendance</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-600">
                    Today: {isTodayScheduled
                      ? todayRecords.length
                        ? `${getRecordCounts(todayRecords, 'Present')} present · ${getRecordCounts(todayRecords, 'Late')} late · ${getRecordCounts(todayRecords, 'Absent')} absent`
                        : 'Biometric sync pending'
                      : 'No Scheduled Class Today'}
                  </p>
                  <button
                    type="button"
                    onClick={() => changeBatch(batch)}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-800 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-rose-900"
                  >
                    <CalendarCheck2 className="h-4 w-4" />
                    View Attendance
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const scopedStudentRecords = selectedStudent
    ? batchRecords.filter((record) => record.studentId === selectedStudent.id)
    : [];
  const studentMonthRecords = getMonthRecords(scopedStudentRecords, selectedMonth);
  const todayRecords = batchRecords.filter((record) => record.attendanceDate === today);
  const todayIsScheduled = selectedBatch.startDate <= today &&
    selectedBatch.scheduledDays.includes(new Date().getDay());
  const isTodayHoliday = todayRecords.some((record) => record.status === 'Holiday');
  const latestSync = batchRecords.reduce<string | undefined>((latest, record) => {
    if (!record.lastSynchronizedAt) return latest;
    return !latest || record.lastSynchronizedAt > latest ? record.lastSynchronizedAt : latest;
  }, undefined);

  const monthlyStudents = selectedBatch.students.map((student) => {
    const studentRecords = monthlyRecords.filter((record) => record.studentId === student.id);
    return {
      student,
      records: studentRecords,
      present: getRecordCounts(studentRecords, 'Present'),
      absent: getRecordCounts(studentRecords, 'Absent'),
      late: getRecordCounts(studentRecords, 'Late'),
      holiday: getRecordCounts(studentRecords, 'Holiday'),
      percentage: getAttendancePercentage(studentRecords)
    };
  }).filter((row) =>
    statusFilter === 'All' || row.records.some((record) => record.status === statusFilter)
  );

  const filteredOverallRecords = batchRecords.filter((record) =>
    (!rangeStart || record.attendanceDate >= rangeStart) &&
    (!rangeEnd || record.attendanceDate <= rangeEnd)
  );
  const overallStudents = selectedBatch.students.map((student) => {
    const records = filteredOverallRecords.filter((record) => record.studentId === student.id);
    return {
      student,
      records,
      present: getRecordCounts(records, 'Present'),
      late: getRecordCounts(records, 'Late'),
      absent: getRecordCounts(records, 'Absent'),
      holiday: getRecordCounts(records, 'Holiday'),
      percentage: getAttendancePercentage(records)
    };
  }).sort((a, b) => sortMode === 'name'
    ? a.student.name.localeCompare(b.student.name)
    : sortMode === 'highest'
      ? b.percentage - a.percentage || a.student.name.localeCompare(b.student.name)
      : a.percentage - b.percentage || a.student.name.localeCompare(b.student.name)
  );
  const averageBatchPercentage = overallStudents.length
    ? Math.round(overallStudents.reduce((sum, row) => sum + row.percentage, 0) / overallStudents.length)
    : 0;
  const allMonthsForStudentYear = selectedStudent
    ? scopedStudentRecords.filter((record) =>
        record.attendanceDate.startsWith(String(selectedMonth.getFullYear()))
      )
    : [];

  const statusFilterControl = (
    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
      Status
      <select
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/10"
      >
        {(['All', 'Present', 'Absent', 'Late', 'Holiday'] as StatusFilter[]).map((status) => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => {
              if (view === 'monthly') {
                setSelectedBatch(null);
                setSelectedStudent(null);
              } else {
                goBackToMonthly();
              }
            }}
            className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {view === 'monthly' ? 'All Batches' : 'Back to Monthly Attendance'}
          </button>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">
              {view === 'student' && selectedStudent ? selectedStudent.name : `${selectedBatch.batch} Attendance`}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {view === 'student' && selectedStudent
                ? `${selectedStudent.rollNumber} · ${selectedBatch.batch}`
                : `${selectedBatch.students.length} students · ${getBatchDaysDescription(selectedBatch.batch, selectedBatch.scheduledDays)}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {view === 'monthly' && (
            <>
              <button type="button" onClick={() => setView('today')} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-900 hover:bg-rose-100">
                Today's Attendance
              </button>
              <button type="button" onClick={() => setView('overall')} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                Overall Attendance
              </button>
            </>
          )}
        </div>
      </div>

      <div role="status" className="flex flex-col gap-1 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-3 text-xs text-sky-900 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-start gap-2">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Mock biometric demonstration. Attendance is read-only; live biometric synchronization is not connected.</span>
        </span>
        <span className="whitespace-nowrap pl-6 sm:pl-0">
          {latestSync ? `Sample data generated ${new Date(latestSync).toLocaleString()}` : 'Synchronization unavailable'}
        </span>
      </div>

      {view === 'monthly' && (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => goToMonth(-1)} aria-label="Previous month" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-rose-50 hover:text-rose-800">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h3 className="min-w-40 text-center text-sm font-bold text-slate-900">{formatMonth(selectedMonth)}</h3>
              <button type="button" onClick={() => goToMonth(1)} aria-label="Next month" disabled={monthKey(selectedMonth) === monthKey(currentMonth)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-rose-50 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {statusFilterControl}
          </div>

          <StatCards records={monthlyRecords} showPercentages />

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] leading-relaxed text-slate-500">
            Attendance % excludes holidays. {attendancePolicyDescription} Students without records remain visible; only biometric records are counted.
          </div>

          {monthlyRecords.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              No attendance records for {formatMonth(selectedMonth)}. Student rows are shown with zero counts.
            </div>
          )}

          {monthlyStudents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No student records match the {statusFilter.toLowerCase()} filter for this month.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Student ID</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3 text-center">Present</th>
                    <th className="px-4 py-3 text-center">Absent</th>
                    <th className="px-4 py-3 text-right">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyStudents.map(({ student, present, absent, percentage }) => (
                    <tr
                      key={student.id}
                      tabIndex={0}
                      title="Double-click to view this student's attendance calendar"
                      onClick={() => setHighlightedStudentId(student.id)}
                      onDoubleClick={() => openStudent(student)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') openStudent(student);
                      }}
                      className={`cursor-pointer transition-colors hover:bg-rose-50/50 focus:bg-rose-50 ${
                        highlightedStudentId === student.id ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-mono-numbers font-semibold text-slate-600">{student.rollNumber}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{student.name}</td>
                      <td className="px-4 py-3 text-center font-mono-numbers text-emerald-700">{present}</td>
                      <td className="px-4 py-3 text-center font-mono-numbers text-rose-700">{absent}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex min-w-14 justify-center rounded-lg px-2 py-1 font-bold ${getAttendanceTone(percentage)}`}>{percentage}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-right text-[11px] text-slate-400">Click a row to select; double-click or press Enter to open student details.</p>
        </>
      )}

      {view === 'today' && (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Today's Attendance</h3>
              <p className="mt-1 text-xs text-slate-500">{new Date(`${today}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
            <span className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-900">{selectedBatch.batch}</span>
          </div>
          {!todayIsScheduled ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-slate-400" />
              <h3 className="mt-3 text-base font-bold text-slate-800">No Scheduled Class Today</h3>
              <p className="mt-1 text-xs text-slate-500">This batch does not meet on {new Date().toLocaleDateString('en-US', { weekday: 'long' })}.</p>
            </div>
          ) : (
            <>
              {isTodayHoliday && (
                <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 text-xs font-semibold text-slate-700">
                  Today is an institutional holiday. Students are shown as Holiday, not Absent.
                </div>
              )}
              {todayRecords.length === 0 && (
                <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  Biometric synchronization is pending or unavailable. Missing data is not treated as confirmed absence.
                </div>
              )}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Student ID</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Attendance Status</th>
                      <th className="px-4 py-3">Biometric Check-in</th>
                      <th className="px-4 py-3">Biometric Check-out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedBatch.students.map((student) => {
                      const record = todayRecords.find((item) => item.studentId === student.id);
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3 font-mono-numbers font-semibold text-slate-600">{student.rollNumber}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{student.name}</td>
                          <td className="px-4 py-3">
                            {record
                              ? <StatusIndicator status={record.status} />
                              : <span className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">Sync pending</span>}
                          </td>
                          <td className="px-4 py-3 font-mono-numbers text-slate-600">{record?.checkInTime || '—'}</td>
                          <td className="px-4 py-3 font-mono-numbers text-slate-600">{record?.checkOutTime || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {view === 'overall' && (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-semibold text-slate-600">
                From
                <input type="date" max={today} value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                To
                <input type="date" max={today} min={rangeStart || undefined} value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal" />
              </label>
              <button type="button" onClick={() => { setRangeStart(''); setRangeEnd(''); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Clear range</button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                Sort
                <select value={sortMode} onChange={(event) => setSortMode(event.target.value as typeof sortMode)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal">
                  <option value="name">Student name</option>
                  <option value="highest">Attendance: high to low</option>
                  <option value="lowest">Attendance: low to high</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={showCompleteHistory} onChange={(event) => setShowCompleteHistory(event.target.checked)} className="accent-rose-800" />
                View complete history
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <SummaryCard label="Total Students" value={selectedBatch.students.length} icon={Users} tone="bg-slate-100 text-slate-700" />
            <SummaryCard label="Overall Present" value={getRecordCounts(filteredOverallRecords, 'Present')} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-700" />
            <SummaryCard label="Overall Late" value={getRecordCounts(filteredOverallRecords, 'Late')} icon={Clock3} tone="bg-amber-50 text-amber-700" />
            <SummaryCard label="Overall Absent" value={getRecordCounts(filteredOverallRecords, 'Absent')} icon={XCircle} tone="bg-rose-50 text-rose-700" />
            <SummaryCard label="Average Batch Attendance" value={`${averageBatchPercentage}%`} icon={CalendarCheck2} tone="bg-sky-50 text-sky-700" />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-500">
            {attendancePolicyDescription} Holidays are excluded from attendance percentages.
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Student ID</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3 text-center">Total Present</th>
                  <th className="px-4 py-3 text-center">Total Late</th>
                  <th className="px-4 py-3 text-center">Total Absent</th>
                  <th className="px-4 py-3 text-right">Overall Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overallStudents.map((row) => (
                  <tr key={row.student.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono-numbers font-semibold text-slate-600">{row.student.rollNumber}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.student.name}</td>
                    <td className="px-4 py-3 text-center font-mono-numbers text-emerald-700">{row.present}</td>
                    <td className="px-4 py-3 text-center font-mono-numbers text-amber-700">{row.late}</td>
                    <td className="px-4 py-3 text-center font-mono-numbers text-rose-700">{row.absent}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex min-w-14 justify-center rounded-lg px-2 py-1 font-bold ${getAttendanceTone(row.percentage)}`}>{row.percentage}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showCompleteHistory && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900">Complete Batch Attendance History</h3>
              <div className="max-h-[520px] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                    <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Student ID</th><th className="px-4 py-3">Student Name</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Check-in / Check-out</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOverallRecords.slice().sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate)).map((record) => {
                      const student = selectedBatch.students.find((item) => item.id === record.studentId);
                      if (!student) return null;
                      return (
                        <tr key={record.id}>
                          <td className="whitespace-nowrap px-4 py-2.5">{new Date(`${record.attendanceDate}T00:00:00`).toLocaleDateString()}</td>
                          <td className="px-4 py-2.5 font-mono-numbers">{student.rollNumber}</td>
                          <td className="px-4 py-2.5 font-semibold">{student.name}</td>
                          <td className="px-4 py-2.5"><StatusIndicator status={record.status} /></td>
                          <td className="px-4 py-2.5 font-mono-numbers text-slate-500">{record.checkInTime || '—'} / {record.checkOutTime || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {view === 'student' && selectedStudent && (
        <>
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:grid-cols-4">
            <div className="flex items-center gap-3 sm:col-span-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-800"><UserRound className="h-5 w-5" /></span>
              <div><p className="text-sm font-bold text-slate-900">{selectedStudent.name}</p><p className="mt-0.5 text-xs text-slate-500">{selectedStudent.rollNumber} · {selectedBatch.batch}</p></div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 sm:col-span-2">
              <p className="text-[11px] text-slate-500">Overall Attendance</p>
              <p className={`mt-1 inline-flex rounded-lg px-2 py-1 text-lg font-bold ${getAttendanceTone(getAttendancePercentage(scopedStudentRecords))}`}>
                {getAttendancePercentage(scopedStudentRecords)}%
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => goToMonth(-1)} aria-label="Previous month" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-rose-50 hover:text-rose-800"><ChevronLeft className="h-4 w-4" /></button>
              <h3 className="min-w-40 text-center text-sm font-bold text-slate-900">{formatMonth(selectedMonth)}</h3>
              <button type="button" onClick={() => goToMonth(1)} aria-label="Next month" disabled={monthKey(selectedMonth) === monthKey(currentMonth)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-rose-50 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <p className="text-[11px] text-slate-500">Month summaries use the selected month; Sundays are shown as holidays throughout the year.</p>
          </div>

          <StatCards records={studentMonthRecords} />

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <div className="border-b border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-900">Attendance Status</h3>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-700">
                {(['Present', 'Late', 'Absent', 'Holiday'] as AttendanceStatus[]).map((status) => (
                  <span key={status} className="inline-flex items-center gap-2"><StatusIndicator status={status} compact />{statusLetters[status]} = {status}</span>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-slate-500">Attendance cells are read-only. Missing biometric records are left blank and are not treated as absence.</p>
            </div>
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-bold text-slate-900">Month-wise Attendance · {selectedMonth.getFullYear()}</h3>
            </div>
            <div className="overflow-x-auto p-4">
              <table className="w-full min-w-[1040px] border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700">
                    <th className="sticky left-0 z-10 border border-slate-200 bg-slate-50 px-2.5 py-2.5 text-left">Monthly</th>
                    {Array.from({ length: 31 }, (_, index) => (
                      <th key={index + 1} className="border border-slate-200 px-1.5 py-2.5 text-center">{index + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthNames.map((name, monthIndex) => {
                    const daysInMonth = new Date(selectedMonth.getFullYear(), monthIndex + 1, 0).getDate();
                    const monthPrefix = `${selectedMonth.getFullYear()}-${String(monthIndex + 1).padStart(2, '0')}-`;
                    const monthlyStudentRecords = allMonthsForStudentYear.filter((record) => record.attendanceDate.startsWith(monthPrefix));
                    const isSelectedMonth = monthIndex === selectedMonth.getMonth();
                    return (
                      <tr key={name} className={isSelectedMonth ? 'bg-rose-50/50' : 'hover:bg-slate-50/50'}>
                        <th className={`sticky left-0 z-10 whitespace-nowrap border border-slate-200 px-2.5 py-2 text-left font-semibold ${isSelectedMonth ? 'bg-rose-50 text-rose-900' : 'bg-white text-slate-700'}`}>{name}</th>
                        {Array.from({ length: 31 }, (_, index) => {
                          const day = index + 1;
                          if (day > daysInMonth) return <td key={day} className="border border-slate-200 bg-slate-50/50 px-1 py-1" />;
                          const attendanceDate = `${monthPrefix}${String(day).padStart(2, '0')}`;
                          if (new Date(`${attendanceDate}T00:00:00`).getDay() === 0) {
                            return (
                              <td key={day} className="border border-slate-200 px-1 py-1 text-center">
                                <span
                                  title="Sunday · Holiday"
                                  className="mx-auto flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-700"
                                >
                                  H
                                </span>
                              </td>
                            );
                          }
                          if (attendanceDate > today) return <td key={day} className="border border-slate-200 px-1 py-1" />;
                          const record = monthlyStudentRecords.find((item) => item.attendanceDate === attendanceDate);
                          return (
                            <td key={day} className="border border-slate-200 px-1 py-1 text-center">
                              {record ? (
                                <span
                                  title={record.status === 'Present' || record.status === 'Late'
                                    ? `Check-in: ${record.checkInTime || 'Unavailable'} · Check-out: ${record.checkOutTime || 'Unavailable'}`
                                    : record.status}
                                  className={`mx-auto flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-bold ${
                                    record.status === 'Present' ? 'bg-emerald-100 text-emerald-800'
                                      : record.status === 'Late' ? 'bg-amber-100 text-amber-800'
                                        : record.status === 'Absent' ? 'bg-rose-100 text-rose-800'
                                          : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {statusLetters[record.status]}
                                </span>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-500">
            {attendancePolicyDescription} Sundays are holidays throughout the selected year and are excluded from attendance percentages.
          </div>
        </>
      )}
    </div>
  );
};
