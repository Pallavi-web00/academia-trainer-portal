import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Users
} from 'lucide-react';
import { useTrainer } from '../context/TrainerContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { CustomDropdown } from '../components/common/CustomDropdown';
import { EmptyState } from '../components/common/EmptyState';
import { ScheduleItem } from '../types';
import { formatReadableDate } from '../utils/dateTimeUtils';
import { SessionDetailsModal } from '../components/modals/SessionDetailsModal';
import { StudentListModal } from '../components/modals/StudentListModal';

export const SessionHistory: React.FC = () => {
  const { schedules, syllabusSessions, modules, activityHistory } = useTrainer();

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [selectedBatch, setSelectedBatch] = useState<string>('ALL');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals state
  const [selectedSession, setSelectedSession] = useState<ScheduleItem | null>(null);
  const [rosterSession, setRosterSession] = useState<ScheduleItem | null>(null);

  // Extract unique batches
  const uniqueBatches = useMemo(() => {
    return Array.from(new Set(schedules.map((s) => s.batch)));
  }, [schedules]);

  // Filter historical sessions
  const filteredSessions = useMemo(() => {
    const records = syllabusSessions.flatMap((record) => {
      const batchSchedule = schedules.find(
        (schedule) => schedule.id === record.batchId && schedule.moduleId === record.moduleId
      );
      if (!batchSchedule) return [];
      const missedEvent = activityHistory.find(
        (event) =>
          event.sessionId === record.id &&
          event.batchId === record.batchId &&
          event.eventType === 'Class Not Conducted' &&
          event.savedStatus === 'Saved'
      );
      return [{
        ...batchSchedule,
        id: record.id,
        batchId: record.batchId,
        scheduledDate: record.scheduledDate,
        startTime: record.startTime,
        endTime: record.endTime,
        sessionNumber: record.sessionNumber,
        syllabusUpdateStatus: record.syllabusUpdateStatus,
        missedReason: missedEvent?.reason
      }];
    });

    return records.filter((item) => {
      // Derive outcome for filtering
      const outcome =
        item.syllabusUpdateStatus === 'Class Not Conducted'
          ? 'Not Conducted'
          : item.syllabusUpdateStatus === 'Updated'
          ? 'Completed'
          : 'Pending';

      const matchesSearch =
        item.moduleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.batch.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.missedReason && item.missedReason.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesModule = selectedModule === 'ALL' || item.moduleId === selectedModule;
      const matchesBatch = selectedBatch === 'ALL' || item.batch === selectedBatch;
      const matchesOutcome = selectedOutcome === 'ALL' || outcome === selectedOutcome;

      let matchesDateRange = true;
      if (startDate && item.scheduledDate < startDate) matchesDateRange = false;
      if (endDate && item.scheduledDate > endDate) matchesDateRange = false;

      return matchesSearch && matchesModule && matchesBatch && matchesOutcome && matchesDateRange;
    }).sort(
      (a, b) => Date.parse(b.scheduledDate) - Date.parse(a.scheduledDate) ||
        a.startTime.localeCompare(b.startTime)
    );
  }, [
    schedules,
    syllabusSessions,
    activityHistory,
    searchTerm,
    selectedModule,
    selectedBatch,
    selectedOutcome,
    startDate,
    endDate
  ]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedModule('ALL');
    setSelectedBatch('ALL');
    setSelectedOutcome('ALL');
    setStartDate('');
    setEndDate('');
  };

  const isFiltered =
    searchTerm !== '' ||
    selectedModule !== 'ALL' ||
    selectedBatch !== 'ALL' ||
    selectedOutcome !== 'ALL' ||
    startDate !== '' ||
    endDate !== '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Session History</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Archived log of past and assigned academic sessions, conducted outcomes, and institutional attendance records.
          </p>
        </div>

        {isFiltered && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors shadow-2xs self-start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search batch, room, reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* Batch */}
          <div>
            <CustomDropdown
              value={selectedBatch}
              onChange={setSelectedBatch}
              options={[
                { value: 'ALL', label: 'All Batches' },
                ...uniqueBatches.map((batch) => ({
                  value: batch,
                  label: batch === 'MWF'
                    ? 'Batch MWF (Mon/Wed/Fri)'
                    : batch === 'TTS'
                      ? 'Batch TTS (Tue/Thu/Sat)'
                      : `${batch} (All Days)`
                }))
              ]}
              ariaLabel="Filter by batch"
              size="compact"
            />
          </div>

          {/* Outcome Filter */}
          <div>
            <CustomDropdown
              value={selectedOutcome}
              onChange={setSelectedOutcome}
              options={[
                { value: 'ALL', label: 'All Outcomes' },
                { value: 'Completed', label: 'Completed Sessions', status: 'approved' },
                { value: 'Not Conducted', label: 'Not Conducted', status: 'rejected' },
                { value: 'Pending', label: 'Pending Outcome', status: 'pending' }
              ]}
              ariaLabel="Filter by session outcome"
              size="compact"
            />
          </div>

          {/* Date range inputs */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-1/2 py-2 px-2 text-[11px] rounded-lg border border-slate-200 bg-white font-mono-numbers"
              title="From date"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-1/2 py-2 px-2 text-[11px] rounded-lg border border-slate-200 bg-white font-mono-numbers"
              title="To date"
            />
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredSessions.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Filter}
              title="No Session History Found"
              description="No historical records match your filter parameters. Try clearing date filters or selecting All Outcomes."
              actionText="Reset Filters"
              onAction={resetFilters}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-3">Batch</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Timings</th>
                  <th className="py-3 px-3">Session</th>
                  <th className="py-3 px-3">Session Outcome</th>
                  <th className="py-3 px-3">Syllabus Status</th>
                  <th className="py-3 px-4">Details / Justification</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSessions.map((session) => {
                  const outcome =
                    session.syllabusUpdateStatus === 'Class Not Conducted'
                      ? 'Not Conducted'
                      : session.syllabusUpdateStatus === 'Updated'
                      ? 'Completed'
                      : 'Pending';

                  return (
                    <tr
                      key={session.id}
                      onClick={() => setSelectedSession(session)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      {/* Module */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{session.moduleName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{session.roomOrLink}</div>
                      </td>

                      {/* Batch */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-700 font-medium">
                        {session.batch}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono-numbers text-slate-700">
                        {formatReadableDate(session.scheduledDate)}
                      </td>

                      {/* Timings */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono-numbers text-slate-600">
                        {session.startTime} – {session.endTime}
                      </td>

                      {/* Session */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono-numbers">
                        <span className="font-semibold text-slate-800">
                          #{session.sessionNumber}
                        </span>
                        <span className="text-slate-400">/{session.totalSessions}</span>
                      </td>

                      {/* Outcome */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <StatusBadge status={outcome} size="sm" />
                      </td>

                      {/* Syllabus status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <StatusBadge status={session.syllabusUpdateStatus} size="sm" />
                      </td>

                      {/* Details / Reason */}
                      <td className="py-3 px-4 max-w-xs">
                        {session.missedReason ? (
                          <span className="text-rose-700 italic truncate block">
                            "{session.missedReason}"
                          </span>
                        ) : session.completedTopicIds && session.completedTopicIds.length > 0 ? (
                          <span className="text-emerald-700 font-mono-numbers font-medium">
                            {session.completedTopicIds.length} Topic(s) completed
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSession(session);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 justify-end ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Log</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Session Details Modal */}
      <SessionDetailsModal
        isOpen={Boolean(selectedSession)}
        onClose={() => setSelectedSession(null)}
        session={selectedSession}
        activityEvents={activityHistory}
        onOpenRoster={(s) => setRosterSession(s)}
      />

      {/* Student List Modal */}
      <StudentListModal
        isOpen={Boolean(rosterSession)}
        onClose={() => setRosterSession(null)}
        students={rosterSession?.students || []}
        moduleName={rosterSession?.moduleName || ''}
        batch={rosterSession?.batch || ''}
      />
    </div>
  );
};
