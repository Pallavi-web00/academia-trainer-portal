import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  BookOpenCheck,
  ChevronRight,
  ShieldAlert,
  Users,
  Coffee,
  Briefcase,
  Check,
  Info,
  Layers,
  Calendar
} from 'lucide-react';
import { useTrainer } from '../context/TrainerContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { ScheduleItem, AdminTask } from '../types';
import {
  formatReadableDate,
  getCurrentDateISO,
  isBatchScheduledOnDate,
  getDayOfWeekName,
  getBatchDaysDescription,
  getTodaysSyllabusStatus
} from '../utils/dateTimeUtils';
import { StudentListModal } from '../components/modals/StudentListModal';
import { ScheduleDetailsModal } from '../components/modals/ScheduleDetailsModal';
import { ChangeRequestModal } from '../components/modals/ChangeRequestModal';
import { getScheduleCompletionStatus } from '../utils/scheduleCompletion';

const AnimatedMetric: React.FC<{ value: number }> = ({ value }) => {
  const [displayedValue, setDisplayedValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayedValue(value);
      return;
    }

    const duration = 650;
    const startTime = performance.now();
    let frameId = 0;
    const updateCount = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      setDisplayedValue(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frameId = window.requestAnimationFrame(updateCount);
    };

    frameId = window.requestAnimationFrame(updateCount);
    return () => window.cancelAnimationFrame(frameId);
  }, [value]);

  return <span className="metric-count" aria-label={String(value)}>{displayedValue}</span>;
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    schedules,
    modules,
    currentTime,
    activityHistory,
    syllabusAssessments,
    examinations,
    examinationMarks,
    module,
    pendingApprovalsCount,
    completedSessionsCount,
    syllabusPendingCount,
    todayAdminTasks,
    freeHourSlots,
    updateAdminTaskStatus,
    notifications,
    approveSchedule,
    requestScheduleChange
  } = useTrainer();

  // Modals state
  const [selectedStudentSchedule, setSelectedStudentSchedule] = useState<ScheduleItem | null>(null);
  const [detailsSchedule, setDetailsSchedule] = useState<ScheduleItem | null>(null);
  const [changeSchedule, setChangeSchedule] = useState<ScheduleItem | null>(null);
  const [selectedTask, setSelectedTask] = useState<AdminTask | null>(null);

  // Today's real system date and day of week
  const todayStr = getCurrentDateISO();
  const todayDayName = getDayOfWeekName(todayStr); // e.g. "Tuesday" for Oct 27, 2026

  // Date context state (defaults to today's date, e.g. October 27, 2026 = Tuesday)
  const [activeDate, setActiveDate] = useState<string>(todayStr);
  const activeDayName = getDayOfWeekName(activeDate);
  const isViewingToday = activeDate === todayStr;

  const completedModuleSchedules = useMemo(
    () => schedules.filter((schedule) => getScheduleCompletionStatus({
      schedule,
      modules,
      activityHistory,
      assessments: syllabusAssessments,
      examinations,
      examinationMarks
    }).isModuleCompleted),
    [schedules, modules, activityHistory, syllabusAssessments, examinations, examinationMarks]
  );
  const activeSchedules = useMemo(() => {
    const completedScheduleIds = new Set(completedModuleSchedules.map((schedule) => schedule.id));
    return schedules.filter((schedule) => !completedScheduleIds.has(schedule.id));
  }, [schedules, completedModuleSchedules]);

  // Weekly days are explicit on each mock schedule so custom patterns need no name-based assumptions.
  const todayClasses = useMemo(() => {
    return activeSchedules.filter(
      (s) => activeDate >= s.startDate && isBatchScheduledOnDate(s.batch, activeDate, s.scheduledDays)
    );
  }, [activeSchedules, activeDate]);

  // Batches not scheduled on this day of the week
  const offDayClasses = useMemo(() => {
    return activeSchedules.filter(
      (s) => activeDate >= s.startDate && !isBatchScheduledOnDate(s.batch, activeDate, s.scheduledDays)
    );
  }, [activeSchedules, activeDate]);

  const activeBatchNames = todayClasses.map((schedule) => schedule.batch).join(' + ') || 'No scheduled batches';
  const dayScheduleOptions = useMemo(() => {
    const weekStart = new Date(`${activeDate}T00:00:00`);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return dayNames.map((dayName, dayIndex) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + dayIndex);
      const dateISO = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const batches = activeSchedules.filter(
        (schedule) =>
          dateISO >= schedule.startDate &&
          isBatchScheduledOnDate(schedule.batch, dateISO, schedule.scheduledDays)
      );
      return {
        dayName,
        date: dateISO,
        label: `${dayName} (${batches.map((schedule) => schedule.batch).join(' + ') || 'No classes'})`
      };
    });
  }, [activeDate, activeSchedules]);

  // Active overdue reminders
  const overdueReminders = notifications.filter(
    (n) => !n.isResolved && n.category === 'syllabus_overdue'
  );

  return (
    <div className="space-y-1">
      {/* Welcome Banner */}
      <div className="dashboard-welcome p-2 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Academic Faculty Portal</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Welcome back, Priyanka
            </h2>
            <p className="mt-1 text-[9px] sm:text-[10px] text-slate-300 max-w-2xl leading-relaxed">
              Teaching <span className="font-semibold text-white">{module.name}</span>. Today is{' '}
              <span className="font-semibold text-indigo-200">{todayDayName}, {formatReadableDate(todayStr)}</span>.
              Displaying <span className="font-semibold text-white">{todayClasses.length} active batch sessions</span>{' '}
              ({activeBatchNames}) and{' '}
              <span className="font-semibold text-indigo-200">{todayAdminTasks.length} admin tasks</span> during your free hours today.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/syllabus')}
              className="px-4 py-2.5 text-xs font-semibold text-indigo-950 bg-indigo-100 hover:bg-white rounded-xl transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <BookOpenCheck className="w-4 h-4" />
              <span>Syllabus Checklist</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="dashboard-metrics grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Today's Classes */}
        <div
          onClick={() => navigate('/schedule')}
          className="dashboard-stat-card p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-indigo-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Today's Classes
            </span>
            <div className="dashboard-stat-icon w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono-numbers">
              <AnimatedMetric value={todayClasses.length} />
            </span>
            <span className="text-xs text-slate-500">batches ({activeDayName})</span>
          </div>
          <div className="mt-1 text-[11px] text-indigo-700 font-semibold truncate">
            {activeBatchNames}
          </div>
          
        </div>

        {/* Card 2: Free Hours & Admin Tasks */}
        <div className="dashboard-stat-card p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Free Hours & Admin Tasks
            </span>
            <div className="dashboard-stat-icon w-7 h-7 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono-numbers">
              <AnimatedMetric value={todayAdminTasks.filter((t) => t.status !== 'Completed').length} />
            </span>
            <span className="text-xs text-slate-500">
              active tasks ({freeHourSlots.length} free windows)
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Admin assigned during free hours
          </div>
        </div>

        {/* Card 3: Pending Schedule Approvals */}
        <div
          onClick={() => navigate('/schedule')}
          className="dashboard-stat-card p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-amber-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Approvals
            </span>
            <div className="dashboard-stat-icon w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono-numbers">
              <AnimatedMetric value={pendingApprovalsCount} />
            </span>
            <span className="text-xs text-slate-500">awaiting review</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-amber-600 font-medium group-hover:translate-x-0.5 transition-transform">
            <span>Review assignments</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 4: Syllabus Updates Pending */}
        <div
          onClick={() => navigate('/notifications')}
          className="dashboard-stat-card p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-rose-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Syllabus Pending
            </span>
            <div className="dashboard-stat-icon w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono-numbers">
              <AnimatedMetric value={syllabusPendingCount} />
            </span>
            <span className="text-xs text-slate-500">actions needed</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-rose-600 font-medium group-hover:translate-x-0.5 transition-transform">
            <span>Check reminders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Classes & Free-Hour Admin Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Classes & Free Hours Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Classes */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    {isViewingToday ? "Today's Batch Schedules" : `${activeDayName}'s Batch Schedules`}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono-numbers">
                    {activeDayName}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Scheduled for <strong className="text-slate-700 font-medium">{formatReadableDate(activeDate)}</strong> ({activeDayName}):{' '}
                  <span className="text-indigo-700 font-medium">
                    {activeBatchNames}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  onClick={() => navigate('/schedule')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Full Roster</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick day selector */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-1 text-xs">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mr-1">
                  Day Schedule:
                </span>
                {dayScheduleOptions.map((d) => {
                  const isSelected = activeDayName === d.dayName;
                  return (
                    <button
                      key={d.dayName}
                      onClick={() => setActiveDate(d.date)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>

              {!isViewingToday && (
                <button
                  onClick={() => setActiveDate(todayStr)}
                  className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                >
                  Reset to Today ({todayDayName})
                </button>
              )}
            </div>

            {todayClasses.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No Batches Scheduled Today"
                description={`You have no assigned academic batches scheduled on ${activeDayName}. You may use this time for admin-assigned tasks or curriculum preparation.`}
                actionText="Browse Upcoming Schedule"
                onAction={() => navigate('/schedule')}
              />
            ) : (
              <div className="space-y-2">
                {todayClasses.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            {item.batch} ({item.scheduledDays.length === 7
                              ? 'All Days'
                              : item.scheduledDays.map((day) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]).join(', ')})
                          </span>
                          <span className="text-[10px] text-slate-400">·</span>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            Scheduled {activeDayName}
                          </span>
                          <span className="text-[10px] text-slate-400">·</span>
                          <span className="text-[10px] font-medium text-slate-600 font-mono-numbers">
                            {item.approvalStatus === 'Approved' && (item.startDate || item.scheduledDate) <= todayStr && (item.sessionNumber || 0) > 0
                              ? `Session #${item.sessionNumber} of ${item.totalSessions}`
                              : `0 / ${item.totalSessions} (No classes conducted)`}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {item.moduleName}
                        </h4>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500 font-mono-numbers">
                          <span className="font-semibold text-slate-700">
                            {item.startTime} – {item.endTime}
                          </span>
                          <span>·</span>
                          <button
                            onClick={() => setSelectedStudentSchedule(item)}
                            className="text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>{item.students.length} Students</span>
                          </button>
                          <span>·</span>
                          <span>{item.roomOrLink}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap sm:flex-col items-end gap-2 shrink-0">
                        <div className="flex items-center gap-2">
                          <StatusBadge
                            status={getTodaysSyllabusStatus(item, schedules, activityHistory, currentTime)}
                            size="sm"
                          />
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => setDetailsSchedule(item)}
                            className="px-3 py-1.5 text-[10px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            Details
                          </button>
                          <button
                            onClick={() =>
                              navigate(`/syllabus?session=${item.id}&date=${activeDate}`)
                            }
                            className="px-3 py-1.5 text-[10px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <span>Syllabus Checklist</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Off-Day Notice: Explicitly explains why MWF or TTS is not running today */}
            {offDayClasses.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200 text-[10px] text-slate-600 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800">
                    Off-Schedule Batches Today ({activeDayName}):
                  </span>
                  <p className="mt-0.5 text-slate-500 leading-relaxed">
                    {offDayClasses
                      .map((batch) =>
                        `${batch.batch} (${batch.startTime}–${batch.endTime}; ${getBatchDaysDescription(batch.batch, batch.scheduledDays)})`
                      )
                      .join(', ')}{' '}
                    is not scheduled on {activeDayName}s. That slot is designated as free hours for curriculum preparation, grading, and admin-assigned tasks.
                  </p>
                </div>
              </div>
            )}

            {completedModuleSchedules.length > 0 && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5">
                <h3 className="text-xs font-bold text-emerald-900">Completed Modules · No Further Classes Scheduled</h3>
                <div className="mt-2 space-y-2">
                  {completedModuleSchedules.map((schedule) => {
                    const status = getScheduleCompletionStatus({
                      schedule,
                      modules,
                      activityHistory,
                      assessments: syllabusAssessments,
                      examinations,
                      examinationMarks
                    });
                    const exam = status.examination;
                    return (
                      <div
                        key={`${schedule.id}-${schedule.moduleId}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-white px-3 py-2"
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-900">{schedule.batch} · {schedule.moduleName}</p>
                          <p className="text-[10px] text-slate-500">{schedule.students.length} students</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Class Completed
                          </span>
                          {exam && (
                            <button
                              type="button"
                              onClick={() => navigate(`/examinations?exam=${encodeURIComponent(exam.id)}`)}
                              className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-900 hover:bg-rose-100"
                            >
                              {status.isExamCompleted ? 'Exam Completed' : 'Exam Scheduled'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Admin Assigned Tasks During Trainer Free Hours */}
          <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-indigo-700 text-[10px] font-semibold uppercase tracking-wider mb-0.5">
                  <Coffee className="w-4 h-4 text-amber-600" />
                  <span>Faculty Free Hours & Administration Duties</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Admin-Assigned Tasks in Free Hours
                </h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono-numbers">
                {todayAdminTasks.length} Assigned Task{todayAdminTasks.length === 1 ? '' : 's'}
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              During the trainer's non-teaching free hours between scheduled batches, administrators assign evaluation, mentoring, and curriculum tasks.
            </p>

            <div className="space-y-3">
              {todayAdminTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border transition-all ${
                    task.status === 'Completed'
                      ? 'bg-slate-50/70 border-slate-200 opacity-80'
                      : 'bg-white border-slate-200 shadow-2xs hover:border-indigo-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-mono-numbers">
                          Free Slot: {task.startTime} – {task.endTime}
                        </span>
                        <span className="text-[10px] text-slate-400">·</span>
                        <span className="text-[10px] font-semibold text-indigo-700">
                          {task.category}
                        </span>
                        <span className="text-[10px] text-slate-400">·</span>
                        <span className="text-[10px] text-slate-500">By {task.assignedBy}</span>
                      </div>

                      <h4
                        className={`text-[10px] font-bold ${
                          task.status === 'Completed' ? 'line-through text-slate-600' : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </h4>

                      <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">
                        {task.description}
                      </p>

                      {task.deliverables && (
                        <p className="text-[10px] text-indigo-900 mt-1.5 font-medium">
                          Deliverable: {task.deliverables}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                      {task.status !== 'Completed' ? (
                        <>
                          <button
                            onClick={() => updateAdminTaskStatus(task.id, 'In Progress')}
                            className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
                              task.status === 'In Progress'
                                ? 'bg-indigo-100 text-indigo-800 font-semibold'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {task.status === 'In Progress' ? 'In Progress' : 'Start Task'}
                          </button>
                          <button
                            onClick={() => updateAdminTaskStatus(task.id, 'Completed')}
                            className="px-3 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Done</span>
                          </button>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Completed</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Pending Overdue Reminders & Free Slots Summary */}
        <div className="space-y-6">
          {/* Overdue Reminders */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Pending Reminders</h3>
                <p className="text-[11px] text-slate-500">Overdue syllabus updates</p>
              </div>
              {overdueReminders.length > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-100 text-rose-700 font-mono-numbers">
                  {overdueReminders.length} Overdue
                </span>
              )}
            </div>

            {overdueReminders.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h4 className="text-[11px] font-bold text-slate-900">You're all caught up!</h4>
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                  All ended sessions have their syllabus topics or missed-class outcomes recorded.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {overdueReminders.map((rem) => (
                  <div
                    key={rem.id}
                    className="p-4 rounded-xl bg-white border border-rose-200 shadow-2xs hover:border-rose-300 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[11px] font-bold text-slate-900 leading-tight">
                          {rem.title}
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                          {rem.message}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 font-mono-numbers">
                            {rem.timestamp}
                          </span>
                          <button
                            onClick={() => {
                              navigate(
                                `/syllabus?session=${rem.sessionId || ''}&date=${
                                  rem.dateContext || ''
                                }`
                              );
                            }}
                            className="px-3 py-1.5 text-[10px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <span>Record Now</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Non-Teaching Free Windows */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <h4 className="text-[11px] font-bold text-slate-900">Today's Free Hour Windows</h4>
            <p className="text-[11px] text-slate-500">
              Gaps between non-overlapping batches designated for admin tasks.
            </p>

            <div className="space-y-2 text-[11px]">
              {freeHourSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-slate-900 font-mono-numbers block">
                      {slot.startTime} – {slot.endTime}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {slot.id === 'slot-admin-tasks'
                        ? `Admin Assigned Free Window (${slot.durationMinutes} mins)`
                        : `Unscheduled teaching window (${slot.durationMinutes} mins)`}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 font-mono-numbers">
                    {slot.assignedTasks.length > 0
                      ? `${slot.assignedTasks.length} task${slot.assignedTasks.length === 1 ? '' : 's'}`
                      : 'Faculty Free Slot'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <StudentListModal
        isOpen={Boolean(selectedStudentSchedule)}
        onClose={() => setSelectedStudentSchedule(null)}
        students={selectedStudentSchedule?.students || []}
        moduleName={selectedStudentSchedule?.moduleName || ''}
        batch={selectedStudentSchedule?.batch || ''}
        onViewProfile={() => {}}
      />

      <ScheduleDetailsModal
        isOpen={Boolean(detailsSchedule)}
        onClose={() => setDetailsSchedule(null)}
        schedule={detailsSchedule}
        onApprove={(id) => approveSchedule(id)}
        onRequestChange={(item) => setChangeSchedule(item)}
        onViewRoster={(item) => setSelectedStudentSchedule(item)}
        activityHistory={activityHistory}
        currentTime={currentTime}
      />

      <ChangeRequestModal
        isOpen={Boolean(changeSchedule)}
        onClose={() => setChangeSchedule(null)}
        schedule={changeSchedule}
        onSubmit={(id, reason) => requestScheduleChange(id, reason)}
      />
    </div>
  );
};
