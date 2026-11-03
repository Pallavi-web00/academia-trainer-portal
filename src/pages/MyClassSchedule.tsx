import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Calendar,
  Users,
  Check,
  RotateCcw,
  BookOpen,
  ArrowUpRight,
  Eye,
  Coffee,
  Briefcase,
  Layers,
  Clock,
  Info,
  Lock,
  Utensils
} from 'lucide-react';
import { useTrainer } from '../context/TrainerContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { CustomDropdown } from '../components/common/CustomDropdown';
import { ScheduleItem } from '../types';
import {
  formatReadableDate,
  getBatchDaysDescription,
  parseTimeToMinutes,
  getSessionSyllabusStatus,
  getScheduleBatchId
} from '../utils/dateTimeUtils';
import { StudentListModal } from '../components/modals/StudentListModal';
import { ScheduleDetailsModal } from '../components/modals/ScheduleDetailsModal';
import { ChangeRequestModal } from '../components/modals/ChangeRequestModal';

export const MyClassSchedule: React.FC = () => {
  const navigate = useNavigate();
  const {
    schedules,
    syllabusSessions,
    module,
    currentTime,
    activityHistory,
    approveSchedule,
    requestScheduleChange
  } = useTrainer();

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'TABLE' | 'TIMELINE'>('TABLE');

  // Modals state
  const [rosterSchedule, setRosterSchedule] = useState<ScheduleItem | null>(null);
  const [detailsSchedule, setDetailsSchedule] = useState<ScheduleItem | null>(null);
  const [changeSchedule, setChangeSchedule] = useState<ScheduleItem | null>(null);

  // Group schedules so each batch appears in exactly ONE row with its start date
  // "do not display the same batch with different dates in different rows. one batch one row with one start date."
  const batchList = useMemo(() => {
    const seenBatches = new Set<string>();
    const uniqueBatchRows: ScheduleItem[] = [];

    for (const item of schedules) {
      const key = `${item.batch}-${item.startTime}`;
      if (!seenBatches.has(key)) {
        seenBatches.add(key);
        uniqueBatchRows.push(item);
      }
    }
    return uniqueBatchRows;
  }, [schedules]);

  // Extract unique batch options for filter dropdown
  const uniqueBatchOptions = useMemo(() => {
    return Array.from(new Set(batchList.map((s) => s.batch)));
  }, [batchList]);

  // Filter batches for the table
  const filteredBatches = useMemo(() => {
    return batchList.filter((item) => {
      // Search
      const matchesSearch =
        item.moduleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.batch.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.roomOrLink.toLowerCase().includes(searchTerm.toLowerCase());

      // Batch
      const matchesBatch = selectedBatch === 'ALL' || item.batch === selectedBatch;

      // Status
      const matchesStatus = selectedStatus === 'ALL' || item.approvalStatus === selectedStatus;

      // Start Date filter
      const itemStartDate = item.startDate || item.scheduledDate;
      const matchesStartDate = !startDateFilter || itemStartDate === startDateFilter;

      return matchesSearch && matchesBatch && matchesStatus && matchesStartDate;
    });
  }, [batchList, searchTerm, selectedBatch, selectedStatus, startDateFilter]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedBatch('ALL');
    setSelectedStatus('ALL');
    setStartDateFilter('');
  };

  const isFiltered =
    searchTerm !== '' ||
    selectedBatch !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    startDateFilter !== '';
  const timelineBatches = batchList
    .slice()
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
  const renderTimelineBatch = (item: ScheduleItem) => (
    <div key={item.id} className="relative">
      <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-indigo-600 border-2 border-white shadow-xs" />
      <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-indigo-800 font-mono-numbers">
            {item.startTime} – {item.endTime}
          </span>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {item.batch} · {item.approvalStatus}
          </span>
        </div>
        <h4 className="text-sm font-bold text-slate-900 mt-1">
          {item.moduleName} ({getBatchDaysDescription(item.batch, item.scheduledDays)})
        </h4>
        <p className="text-xs text-slate-600 mt-0.5">
          Batch Start Date: {formatReadableDate(item.startDate)} · Venue: {item.roomOrLink} · {item.students.length} Enrolled Students
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>{module.name}</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Trainer working hours: <strong className="text-slate-700 font-mono-numbers">09:00 AM – 06:00 PM</strong> · Lunch hour: <strong className="text-slate-700 font-mono-numbers">01:00 PM – 02:00 PM</strong>.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'TABLE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Batch Roster Table
            </button>
            <button
              onClick={() => setViewMode('TIMELINE')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'TIMELINE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily Timeline (9 AM – 6 PM)
            </button>
          </div>

          {isFiltered && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Info notice explaining the approval rule */}
      <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-xs flex items-start gap-2.5">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Schedule Approval & Syllabus Tracker Integration:</span>
          <p className="mt-0.5 text-indigo-800 leading-relaxed">
            Only after the trainer approves a batch schedule here does that batch become visible in the <strong>Syllabus Tracker</strong>. Once approved, the trainer can update completed syllabus topics, and those updates are reflected directly in this table.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search batch, room..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* Batch Filter */}
          <div>
            <CustomDropdown
              value={selectedBatch}
              onChange={setSelectedBatch}
              options={[
                { value: 'ALL', label: 'All Batches' },
                ...uniqueBatchOptions.map((batch) => ({ value: batch, label: `Batch: ${batch}` }))
              ]}
              ariaLabel="Filter by batch"
              size="compact"
            />
          </div>

          {/* Status Filter */}
          <div>
            <CustomDropdown
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={[
                { value: 'ALL', label: 'All Approval Statuses' },
                { value: 'Pending', label: 'Pending Review', status: 'pending' },
                { value: 'Approved', label: 'Approved', status: 'approved' },
                { value: 'Change Requested', label: 'Change Requested', status: 'change-requested' }
              ]}
              ariaLabel="Filter by approval status"
              size="compact"
            />
          </div>

          {/* Start Date Filter */}
          <div>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono-numbers"
              title="Filter by Batch Start Date"
            />
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: Standard Table */}
      {viewMode === 'TABLE' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {filteredBatches.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Filter}
                title="No Matching Batches"
                description="No batch schedules match your active filter settings. Try clearing filters or search query."
                actionText="Reset Filters"
                onAction={resetFilters}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Subject / Module</th>
                    <th className="py-3 px-3">Students</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Batch</th>
                    <th className="py-3 px-3">Batch Timings</th>
                    <th className="py-3 px-3">Session</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBatches.map((item) => {
                    const todayStr = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}-${String(currentTime.getDate()).padStart(2, '0')}`;
                    const batchStartDate = item.startDate || item.scheduledDate;
                    const hasStarted = batchStartDate <= todayStr;
                    const isApproved = item.approvalStatus === 'Approved';
                    const todaySyllabusStatus = getSessionSyllabusStatus(
                      item,
                      activityHistory,
                      currentTime
                    );
                    const wasMissedToday = activityHistory.some(
                      (event) =>
                        event.batchId === getScheduleBatchId(item) &&
                        event.moduleId === item.moduleId &&
                        event.sessionId === `session-${item.id}-${todayStr}` &&
                        (event.scheduledDate || event.displayDate) === todayStr &&
                        event.eventType === 'Class Not Conducted' &&
                        event.savedStatus === 'Saved'
                    );

                    // Rule:
                    // If the batch has not yet started -> display 0 / totalSessions, no classes have been conducted
                    // If the trainer hasn't approved the schedule -> trainer is not able to conduct class -> sessions completed is 0
                    // If classes are not conducted -> number of sessions completed is zero
                    const completedSessions = syllabusSessions.filter(
                      (session) =>
                        session.batchId === getScheduleBatchId(item) &&
                        session.outcome === 'Conducted'
                    ).length;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* 1. Subject / Module */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{item.moduleName}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{item.roomOrLink}</div>
                        </td>

                        {/* 2. Students (Clickable Count) */}
                        <td className="py-3 px-3">
                          <button
                            onClick={() => setRosterSchedule(item)}
                            className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer group"
                            title="Click to view full class roster"
                          >
                            <Users className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="font-mono-numbers">{item.students.length} Students</span>
                          </button>
                        </td>

                        {/* 3. Date (Start Date of the Batch) */}
                        <td className="py-3 px-3 font-mono-numbers text-slate-700 whitespace-nowrap font-medium">
                          {formatReadableDate(batchStartDate)}
                        </td>

                        {/* 4. Batch (MWF / TTS / or Just Timings for all days) */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div>
                            <span className="font-bold text-slate-900 text-sm">{item.batch}</span>
                            <span className="block text-[10px] text-slate-400">
                              {getBatchDaysDescription(item.batch, item.scheduledDays)}
                            </span>
                          </div>
                        </td>

                        {/* 5. Batch Timings */}
                        <td className="py-3 px-3 font-mono-numbers text-indigo-900 font-semibold whitespace-nowrap">
                          {item.startTime} – {item.endTime}
                        </td>

                        {/* 6. Session: Displays 0/totalSessions & No classes conducted if unapproved or not started */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {completedSessions > 0 ? (
                            <div>
                              <div className="font-mono-numbers font-bold text-slate-900">
                                {completedSessions} / {item.totalSessions}
                              </div>
                              <div className="text-[11px] text-emerald-700 font-medium">
                                {completedSessions} sessions conducted
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-mono-numbers font-bold text-slate-900">
                                0 / {item.totalSessions}
                              </div>
                              <div className="text-[11px] text-amber-700 font-medium">
                                No saved conducted outcomes
                              </div>
                              {!isApproved ? (
                                <div className="text-[10px] text-slate-400">
                                  Approval required to conduct class
                                </div>
                              ) : !hasStarted ? (
                                <div className="text-[10px] text-slate-400">
                                  Batch starts {formatReadableDate(batchStartDate)}
                                </div>
                              ) : null}
                            </div>
                          )}
                        </td>

                        {/* 7. Status & Syllabus Updates Reflection */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="space-y-1">
                            <StatusBadge status={item.approvalStatus} size="sm" />

                            {/* "this update will be seen in the table in the my class schedule menu, this happens only after the trainer approves the syllabus in the my class schedule menu." */}
                            {isApproved ? (
                              <div className="flex items-center gap-1 text-[11px] font-mono-numbers">
                                <StatusBadge status={todaySyllabusStatus} size="sm" />
                                {wasMissedToday && (
                                  <StatusBadge status="Class Not Conducted" size="sm" />
                                )}
                                {todaySyllabusStatus !== 'No Class Today' &&
                                  todaySyllabusStatus !== 'Updated' &&
                                  !wasMissedToday && (
                                    <button
                                      onClick={() => navigate(`/syllabus?session=${item.id}`)}
                                      className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium flex items-center gap-0.5 cursor-pointer"
                                    >
                                      <span>Update Syllabus</span>
                                      <ArrowUpRight className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                              </div>
                            ) : (
                              <div className="text-[10px] text-amber-700 flex items-center gap-1 font-medium">
                                <Lock className="w-2.5 h-2.5 shrink-0 text-amber-600" />
                                <span>Tracker Locked</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 8. Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {/* View Details */}
                            <button
                              onClick={() => setDetailsSchedule(item)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Approve (if Pending) -> Unlocks batch in Syllabus Tracker */}
                            {item.approvalStatus === 'Pending' && (
                              <button
                                onClick={() => approveSchedule(item.id)}
                                className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                                title="Approve batch schedule and unlock in Syllabus Tracker"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                            )}

                            {/* Request Change */}
                            {item.approvalStatus !== 'Change Requested' ? (
                              <button
                                onClick={() => setChangeSchedule(item)}
                                className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                                title="Request timing or room change"
                              >
                                Request Change
                              </button>
                            ) : (
                              <button
                                onClick={() => setDetailsSchedule(item)}
                                className="px-2 py-1 text-[11px] font-medium text-slate-500 bg-slate-100 rounded-md cursor-pointer"
                              >
                                Requested
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* VIEW MODE 2: Weekly batch schedule and free hours */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Weekly Schedule: 09:00 AM – 06:00 PM
              </h3>
              <p className="text-xs text-slate-500">
                Time slots can be reused on separate days; scheduled batches do not overlap.
              </p>
            </div>
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 font-mono-numbers">
              Working Days: Mon – Sat · 9 AM – 6 PM
            </span>
          </div>

          <div className="relative border-l-2 border-indigo-200 ml-4 space-y-6 pl-6 py-2">
            {timelineBatches
              .filter((item) => parseTimeToMinutes(item.startTime) < 13 * 60)
              .map(renderTimelineBatch)}

            {/* Lunch break: no classes or administrative tasks are scheduled. */}
            <div className="relative">
              <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white shadow-xs" />
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Utensils className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-amber-900 font-mono-numbers block">
                      01:00 PM – 02:00 PM (Lunch Break)
                    </span>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      No classes or trainer tasks are scheduled during lunch.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md">
                  Lunch Break
                </span>
              </div>
            </div>

            {timelineBatches
              .filter((item) => parseTimeToMinutes(item.startTime) >= 13 * 60)
              .map(renderTimelineBatch)}

            {/* Free Hours / Admin Tasks (04:00 PM - 06:00 PM) */}
            <div className="relative">
              <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-violet-600 border-2 border-white shadow-xs" />
              <div className="p-4 rounded-xl bg-violet-50/60 border border-violet-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-violet-900 font-mono-numbers flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-violet-700" />
                    04:00 PM – 06:00 PM (Weekday Faculty Free Hours)
                  </span>
                  <span className="text-xs font-semibold text-violet-700 bg-white px-2 py-0.5 rounded shadow-2xs">
                    Tasks assigned only when no class is scheduled
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-lg bg-white border border-violet-100">
                    <span className="font-semibold text-slate-900 block">
                      Task: Evaluate MWF Batch OOP Mini-Projects
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono-numbers">
                      04:00 PM – 05:00 PM · By Academic Head
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-violet-100">
                    <span className="font-semibold text-slate-900 block">
                      Task: 1-on-1 Mentoring & Code Consultations
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono-numbers">
                      05:00 PM – 06:00 PM · By Academic Counselor
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <StudentListModal
        isOpen={Boolean(rosterSchedule)}
        onClose={() => setRosterSchedule(null)}
        students={rosterSchedule?.students || []}
        moduleName={rosterSchedule?.moduleName || ''}
        batch={rosterSchedule?.batch || ''}
      />

      <ScheduleDetailsModal
        isOpen={Boolean(detailsSchedule)}
        onClose={() => setDetailsSchedule(null)}
        schedule={detailsSchedule}
        onApprove={(id) => approveSchedule(id)}
        onRequestChange={(item) => setChangeSchedule(item)}
        onViewRoster={(item) => setRosterSchedule(item)}
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
