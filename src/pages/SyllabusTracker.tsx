import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  History,
  CheckSquare,
  Layers,
  Sparkles,
  Search,
  Check,
  Lock,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Users,
  CalendarDays,
  CalendarCheck2,
  CalendarX2,
  ListChecks,
  ShieldCheck,
  ExternalLink,
  RotateCcw,
  Eye,
  Send,
  Download,
  FileText,
  Building2
} from 'lucide-react';
import { useTrainer } from '../context/TrainerContext';
import { calculateModuleProgress } from '../utils/syllabusProgress';
import {
  formatReadableDate,
  getCurrentDateISO,
  getBatchDaysDescription,
  getTodaysSyllabusStatus,
  getScheduleBatchId,
  isBatchScheduledOnDate
} from '../utils/dateTimeUtils';
import { ClassNotConductedModal } from '../components/modals/ClassNotConductedModal';
import { StudentListModal } from '../components/modals/StudentListModal';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { ScheduleItem } from '../types';
import { getScheduledSessionId } from '../data/scheduleData';
import { Modal } from '../components/common/Modal';
import {
  areAllStudentsAssessmentQualified,
  getQualifyingAssessmentResults,
  isModuleReadyForFinanceVerification
} from '../utils/syllabusAssessment';

export const SyllabusTracker: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    module,
    schedules,
    syllabusSessions,
    currentTime,
    activityHistory,
    syllabusAssessments,
    submitModuleForFinanceVerification,
    sendSyllabusAssessment,
    simulateSyllabusAssessmentResponses,
    conductTopicAgain,
    recordClassNotConducted,
    getTopicNotesAvailability,
    downloadTopicNotes
  } = useTrainer();

  const sessionParam = searchParams.get('session');
  const dateParam = searchParams.get('date');

  // CRITICAL GATING RULE:
  // "only after the trainer approves the schedule the batch is visible in the syllabus tracker menu"
  // "if the trainer hasn't approved the schedule the batch will not be visible in the syllabus tracker menu."
  const approvedBatches = useMemo(() => {
    return schedules.filter((s) => s.approvalStatus === 'Approved');
  }, [schedules]);

  const unapprovedBatches = useMemo(() => {
    return schedules.filter((s) => s.approvalStatus !== 'Approved');
  }, [schedules]);

  // Selected Batch for the expanded card view
  // If sessionParam is in the URL and that batch is approved, open it directly.
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(() => {
    if (sessionParam && approvedBatches.some((b) => b.id === sessionParam)) {
      return sessionParam;
    }
    return null;
  });

  // Collapsible sections state within the expanded batch view
  // "keep the planned syllabus checklist and syllabus activity history collapsible, when clicked should expand"
  const [isChecklistExpanded, setIsChecklistExpanded] = useState<boolean>(true);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(true);

  // Form & Interaction state for the active batch
  const [expandedScoreTopicId, setExpandedScoreTopicId] = useState<string | null>(null);
  const [expandedAssessmentId, setExpandedAssessmentId] = useState<string | null>(null);
  const [isMissedModalOpen, setIsMissedModalOpen] = useState(false);
  const [isFinanceSubmissionModalOpen, setIsFinanceSubmissionModalOpen] = useState(false);
  const [rosterBatch, setRosterBatch] = useState<ScheduleItem | null>(null);
  const [activeDateContext, setActiveDateContext] = useState<string>(dateParam || getCurrentDateISO());
  const [topicSearch, setTopicSearch] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  // Sync date or session context from URL parameters if provided and approved
  useEffect(() => {
    if (dateParam) setActiveDateContext(dateParam);
    if (sessionParam) {
      if (approvedBatches.some((b) => b.id === sessionParam)) {
        setSelectedBatchId(sessionParam);
      }
    }
  }, [dateParam, sessionParam, approvedBatches]);

  // Active batch object
  const currentBatch = useMemo(() => {
    if (!selectedBatchId) return null;
    return approvedBatches.find((b) => b.id === selectedBatchId) || null;
  }, [approvedBatches, selectedBatchId]);

  // If a requested batch from URL is pending approval, detect it
  const unapprovedBatchRequested = useMemo(() => {
    if (sessionParam) {
      return schedules.find((s) => s.id === sessionParam && s.approvalStatus !== 'Approved');
    }
    return null;
  }, [sessionParam, schedules]);

  // Check if current session context is marked as 'Class Not Conducted'
  const isCurrentContextMissed = useMemo(() => {
    if (!currentBatch) return false;
    const today = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}-${String(currentTime.getDate()).padStart(2, '0')}`;
    return activityHistory.some(
      (event) =>
        event.batchId === getScheduleBatchId(currentBatch) &&
        event.moduleId === currentBatch.moduleId &&
        event.sessionId === `session-${currentBatch.id}-${today}` &&
        (event.scheduledDate || event.displayDate) === today &&
        event.eventType === 'Class Not Conducted' &&
        event.savedStatus === 'Saved'
    );
  }, [currentBatch, activityHistory, currentTime]);

  // Helper to determine batch-specific completed topic IDs
  const getBatchCompletedTopicIds = (batchItem: ScheduleItem): string[] => {
    if (batchItem.completedTopicIds && batchItem.completedTopicIds.length > 0) {
      return batchItem.completedTopicIds;
    }
    // Fallback: module topics completed for this batch or in general
    return module.topics
      .filter((t) => t.isCompleted && t.completedSessionId === batchItem.id)
      .map((t) => t.id);
  };

  // Completed topic count for active batch
  const activeBatchCompletedTopicIds = useMemo(() => {
    if (!currentBatch) return [];
    return getBatchCompletedTopicIds(currentBatch);
  }, [currentBatch, module.topics]);

  const completionEventByTopic = useMemo(() => {
    const events = activityHistory
      .filter((event) =>
        currentBatch &&
        event.batchId === getScheduleBatchId(currentBatch) &&
        event.moduleId === module.id &&
        event.eventType === 'Topic Completed' &&
        event.savedStatus === 'Saved' &&
        event.topicId
      )
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
    return new Map(
      events.flatMap((event) => event.topicId ? [[event.topicId, event] as const] : [])
    );
  }, [activityHistory, currentBatch, module.id]);

  const moduleFinanceSubmission = useMemo(() => {
    if (!currentBatch) return undefined;
    return activityHistory.find((event) =>
      event.batchId === getScheduleBatchId(currentBatch) &&
      event.moduleId === module.id &&
      event.eventType === 'Module Submitted for Finance Verification' &&
      event.savedStatus === 'Saved'
    );
  }, [activityHistory, currentBatch, module.id]);

  const moduleReadyForFinanceVerification = useMemo(
    () => Boolean(currentBatch && isModuleReadyForFinanceVerification({
      topicIds: module.topics.map((topic) => topic.id),
      batchId: getScheduleBatchId(currentBatch),
      moduleId: module.id,
      students: currentBatch.students,
      completedTopicIds: activeBatchCompletedTopicIds,
      activityHistory,
      assessments: syllabusAssessments
    })),
    [currentBatch, module.id, module.topics, activeBatchCompletedTopicIds, activityHistory, syllabusAssessments]
  );

  // Handle Back to Batches
  const handleBackToBatches = () => {
    setSelectedBatchId(null);
    setExpandedScoreTopicId(null);
    setExpandedAssessmentId(null);
    setTopicSearch('');
    // Remove query params to keep URL clean
    navigate('/syllabus', { replace: true });
  };

  const handleFinanceSubmissionConfirm = () => {
    if (!currentBatch) return;
    const submitted = submitModuleForFinanceVerification(
      getScheduleBatchId(currentBatch),
      module.id
    );
    if (submitted) setIsFinanceSubmissionModalOpen(false);
  };

  // Filtered topics for search / tab
  const filteredTopics = useMemo(() => {
    return module.topics.filter((t) => {
      const isCompletedForActiveBatch = activeBatchCompletedTopicIds.includes(t.id);
      const matchesSearch =
        t.title.toLowerCase().includes(topicSearch.toLowerCase()) ||
        String(t.number).includes(topicSearch);

      if (!matchesSearch) return false;
      if (filterMode === 'PENDING' && isCompletedForActiveBatch) return false;
      if (filterMode === 'COMPLETED' && !isCompletedForActiveBatch) return false;

      return true;
    });
  }, [module.topics, topicSearch, filterMode, activeBatchCompletedTopicIds]);

  const getTopicAssessments = (topicId: string) => {
    if (!currentBatch) return [];
    return syllabusAssessments
      .filter((assessment) =>
        assessment.batchId === getScheduleBatchId(currentBatch) &&
        assessment.moduleId === module.id &&
        assessment.topicId === topicId
      )
      .sort((a, b) => b.attempt - a.attempt || b.sentAt.localeCompare(a.sentAt));
  };

  const getAssessmentEligibility = (topicId: string) => {
    if (!currentBatch) return false;
    const attempts = getTopicAssessments(topicId);
    const latest = attempts[0];
    return areAllStudentsAssessmentQualified(latest, currentBatch.students, attempts);
  };

  // Each batch history includes its events across every assigned module.
  const filteredHistory = useMemo(() => {
    if (!currentBatch) return [];
    return activityHistory
      .filter((event) => event.batchId === getScheduleBatchId(currentBatch))
      .sort(
        (a, b) =>
          Date.parse(b.displayDate) - Date.parse(a.displayDate) ||
          Date.parse(b.timestamp) - Date.parse(a.timestamp)
      );
  }, [activityHistory, currentBatch]);

  const historySummary = useMemo(() => {
    if (!currentBatch) {
      return {
        classesConducted: 0,
        classesNotConducted: 0,
        topicsCompleted: 0,
        updatesPending: 0
      };
    }

    const batchSessions = syllabusSessions.filter(
      (session) => session.batchId === getScheduleBatchId(currentBatch)
    );
    const savedEvents = filteredHistory.filter((event) => event.savedStatus === 'Saved');

    const conductedSessions = new Set(
      savedEvents
        .filter((event) => event.eventType === 'Topic Completed' && event.sessionId)
        .map((event) => `${event.moduleId}:${event.sessionId}`)
    );
    const missedSessions = new Set(
      savedEvents
        .filter((event) => event.eventType === 'Class Not Conducted' && event.sessionId)
        .map((event) => `${event.moduleId}:${event.sessionId}`)
    );
    const completedTopics = new Set(
      savedEvents
        .filter((event) => event.eventType === 'Topic Completed')
        .map((event) =>
          `${event.moduleId}:${event.topicId || event.topicNumber || event.topicName || event.id}`
        )
    );

    const today = getCurrentDateISO();
    const updatesPending = batchSessions.filter(
      (session) => session.scheduledDate < today && !session.outcome
    ).length;

    return {
      classesConducted: conductedSessions.size,
      classesNotConducted: missedSessions.size,
      topicsCompleted: completedTopics.size,
      updatesPending
    };
  }, [currentBatch, filteredHistory, syllabusSessions]);

  // If NO approved batches exist in the system yet:
  if (approvedBatches.length === 0) {
    return (
      <div className="space-y-2">
        <div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Syllabus progress is gated by schedule confirmation.
          </p>
        </div>

        <div className="p-8 rounded-2xl bg-white border border-amber-200 shadow-2xs text-center max-w-2xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Schedule Approval Required
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed max-w-lg mx-auto">
            Under institutional faculty guidelines, only after the trainer approves the schedule in{' '}
            <strong>My Class Schedule</strong> will the batch become visible here in the Syllabus Tracker. Please approve your assigned batch schedule first.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/schedule')}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-2xs flex items-center gap-2 mx-auto cursor-pointer"
            >
              <span>Go to My Class Schedule to Approve</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: BATCH CARDS OVERVIEW (When no batch card is expanded)
  // =========================================================================
  if (!currentBatch) {
    return (
      <div className="space-y-6">
        {/* Warning Notice if an unapproved batch was requested directly */}
        {unapprovedBatchRequested && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Batch Requires Approval First:</span>
                <p className="mt-0.5 text-amber-800 leading-relaxed">
                  Batch <strong>{unapprovedBatchRequested.batch} ({unapprovedBatchRequested.startTime}–{unapprovedBatchRequested.endTime})</strong> has not been approved yet. Under institutional policy, batches are only visible and editable in the Syllabus Tracker after the trainer approves them in My Class Schedule.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/schedule')}
              className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Review & Approve
            </button>
          </div>
        )}

        {/* Header Banner */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-1">
                <Layers className="w-4 h-4" />
                <span>{module.code} · Faculty Syllabus Management</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {module.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Click on any approved batch card below to expand its planned syllabus checklist and syllabus activity history.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{approvedBatches.length} Approved Active Batches</span>
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <span>Faculty: <strong>Prof. Priyanka</strong></span>
            <span>·</span>
            <span>Curriculum: <strong>40 Planned Sessions</strong></span>
            <span>·</span>
            <span>Working Hours: <strong>09:00 AM – 06:00 PM</strong></span>
            <span>·</span>
            <span>Lunch Hour: <strong>01:00 PM – 02:00 PM</strong></span>
          </div>
        </div>

        {/* Batch Cards Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Assigned Batches for this Module
            </h3>
            <span className="text-xs text-slate-500">
              Select a batch card to open & record syllabus progress
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Approved Batch Cards */}
            {approvedBatches.map((batchItem) => {
              const completedTopicIds = getBatchCompletedTopicIds(batchItem);
              const completedCount = completedTopicIds.length;
              const totalTopics = module.topics.length || 40;
              const percent = Math.round((completedCount / totalTopics) * 100);

              const batchTitle =
                batchItem.batch === 'MWF'
                  ? 'MWF'
                  : batchItem.batch === 'TTS'
                  ? 'TTS'
                  : batchItem.batch;

              const batchSubTitle = getBatchDaysDescription(batchItem.batch, batchItem.scheduledDays);
              const todayStatus = getTodaysSyllabusStatus(batchItem, schedules, activityHistory, currentTime);

              return (
                <div
                  key={batchItem.id}
                  onClick={() => setSelectedBatchId(batchItem.id)}
                  className="group relative bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-400 hover:shadow-md transition-all duration-200 p-5 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Batch badge & status badge */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {batchTitle}
                          </span>
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Approved
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium block mt-0.5">
                          {batchSubTitle}
                        </span>
                      </div>

                      <StatusBadge status={todayStatus} size="sm" />
                    </div>

                    {/* Schedule & Timing Info */}
                    <div className="space-y-2 text-xs text-slate-600 font-mono-numbers my-4 p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Timings:</span>
                        </span>
                        <span className="font-bold text-slate-900">
                          {batchItem.startTime} – {batchItem.endTime}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Start Date:</span>
                        </span>
                        <span className="font-semibold text-slate-800">
                          {formatReadableDate(batchItem.startDate || batchItem.scheduledDate)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Roster:</span>
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRosterBatch(batchItem);
                          }}
                          className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                        >
                          {batchItem.students.length} Students
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Session:</span>
                        </span>
                        <span className="font-semibold text-slate-800">
                          {batchItem.approvalStatus === 'Approved' && (batchItem.startDate || batchItem.scheduledDate) <= getCurrentDateISO() && (batchItem.sessionNumber || 0) > 0
                            ? `#${batchItem.sessionNumber} / ${batchItem.totalSessions}`
                            : `0 / ${batchItem.totalSessions} (No classes conducted)`}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium text-slate-600">Syllabus Progress</span>
                        <span className="font-bold text-indigo-700 font-mono-numbers">
                          {completedCount} / {totalTopics} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-600 group-hover:bg-indigo-500 transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-indigo-600 font-semibold group-hover:text-indigo-700 flex items-center gap-1">
                      <span>Expand Checklist & History</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono-numbers">
                      {batchItem.roomOrLink}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Unapproved Batches (Pending Approval) */}
            {unapprovedBatches.map((unapprovedItem) => (
              <div
                key={unapprovedItem.id}
                className="relative bg-slate-50/70 rounded-2xl border border-dashed border-amber-300 p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-slate-700">
                          {unapprovedItem.batch}
                        </span>
                        <span className="text-xs font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded flex items-center gap-1 border border-amber-200">
                          <Lock className="w-3 h-3 text-amber-600" />
                          <span>Requires Approval</span>
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 block mt-0.5">
                        {unapprovedItem.startTime} – {unapprovedItem.endTime}
                      </span>
                    </div>

                    <StatusBadge status={unapprovedItem.approvalStatus} size="sm" />
                  </div>

                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Under institutional rules, a batch becomes visible and editable in the Syllabus Tracker{' '}
                    <strong>only after the trainer approves the schedule</strong> in My Class Schedule.
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-amber-200/60">
                  <button
                    onClick={() => navigate('/schedule')}
                    className="w-full py-2 px-3 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span>Approve in My Class Schedule</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Student Roster Modal */}
        <StudentListModal
          isOpen={Boolean(rosterBatch)}
          onClose={() => setRosterBatch(null)}
          students={rosterBatch?.students || []}
          moduleName={rosterBatch?.moduleName || ''}
          batch={rosterBatch?.batch || ''}
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: EXPANDED BATCH VIEW WITH COLLAPSIBLE CHECKLIST & HISTORY
  // =========================================================================
  const completedForThisBatch = activeBatchCompletedTopicIds.length;
  const totalTopics = module.topics.length || 40;
  const batchPercentage = Math.round((completedForThisBatch / totalTopics) * 100);

  const batchDisplayName = `${currentBatch.batch} (${currentBatch.startTime} – ${currentBatch.endTime})`;
  return (
    <div className="space-y-6">
      {/* Top Navigation & Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={handleBackToBatches}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs flex items-center gap-2 cursor-pointer group self-start"
          title="Return to the batch cards list"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Batches</span>
        </button>

        {/* Breadcrumb / Status info */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono-numbers">
          <span className="text-slate-400">Syllabus Tracker</span>
          <span>/</span>
          <span className="font-semibold text-slate-800">{currentBatch.batch}</span>
          <span>/</span>
          <span className="text-indigo-600 font-bold">{batchPercentage}% Completed</span>
        </div>
      </div>

      {/* Active Batch Summary Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
              Module: {module.code} · Advanced Curriculum
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">
              Start Date: {formatReadableDate(currentBatch.startDate || currentBatch.scheduledDate)}
            </span>
          </div>

          {/* Date & Class Not Conducted button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono-numbers text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Session Date: {formatReadableDate(activeDateContext)}</span>
            </div>

            <button
              onClick={() => setIsMissedModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Class Not Conducted</span>
            </button>
          </div>
        </div>

        {/* Title, Timings & Progress Meter */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {batchDisplayName}
              </h2>
              <StatusBadge
                status={getTodaysSyllabusStatus(currentBatch, schedules, activityHistory, currentTime)}
                size="sm"
              />
            </div>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              {module.name} · Assigned Room: <strong className="text-slate-700">{currentBatch.roomOrLink}</strong> · Total Sessions:{' '}
              <strong className="text-slate-700">
                {currentBatch.approvalStatus === 'Approved' && (currentBatch.startDate || currentBatch.scheduledDate) <= getCurrentDateISO() && (currentBatch.sessionNumber || 0) > 0
                  ? `Session #${currentBatch.sessionNumber} of ${currentBatch.totalSessions}`
                  : `0 / ${currentBatch.totalSessions} (No classes conducted)`}
              </strong>.
            </p>
          </div>

          {/* Progress metric card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 min-w-[260px]">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>Batch Syllabus Progress</span>
              <span className="text-base text-indigo-600 font-bold font-mono-numbers">
                {batchPercentage}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden mb-1.5">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${batchPercentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono-numbers">
              <span>{completedForThisBatch} Topics Completed</span>
              <span>{totalTopics - completedForThisBatch} Remaining of {totalTopics}</span>
            </div>
            {moduleFinanceSubmission ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-900">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-rose-800" />
                <div>
                  <p className="font-bold">Submitted for Finance Verification</p>
                  <p className="mt-0.5 text-[11px] text-rose-800">
                    {formatReadableDate(moduleFinanceSubmission.displayDate)} · {new Date(moduleFinanceSubmission.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ) : moduleReadyForFinanceVerification ? (
              <button
                type="button"
                onClick={() => setIsFinanceSubmissionModalOpen(true)}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-800 bg-rose-900 px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 sm:w-auto"
              >
                <Building2 className="h-4 w-4" />
                Module Completed
              </button>
            ) : null}
          </div>
        </div>

        {/* Notice if Class Was Not Conducted */}
        {isCurrentContextMissed && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <span className="font-semibold">Notice for current batch session:</span>
              <p className="mt-0.5 text-rose-700 leading-relaxed">
                The session for <strong>{currentBatch.batch}</strong> was recorded as "Class Not Conducted". Topic checkboxes are disabled for this session context.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 1: PLANNED SYLLABUS CHECKLIST (COLLAPSIBLE)
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all">
        {/* Collapsible Header */}
        <div
          onClick={() => setIsChecklistExpanded((prev) => !prev)}
          className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-100/70 transition-colors"
          role="button"
          tabIndex={0}
          aria-expanded={isChecklistExpanded}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Planned Syllabus Checklist
                </h3>
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-mono-numbers">
                  {completedForThisBatch} / {totalTopics} Completed
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed topic-by-topic curriculum for <strong>{currentBatch.batch}</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 hidden sm:inline">
              {isChecklistExpanded ? 'Click to collapse' : 'Click to expand'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600">
              {isChecklistExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </div>
        </div>

        {/* Collapsible Content */}
        <div
          className={`accordion-collapse ${isChecklistExpanded ? 'is-open' : 'is-closed'}`}
          aria-hidden={!isChecklistExpanded}
          inert={!isChecklistExpanded}
        >
          <div className="accordion-collapse-inner">
            <div className="p-4 border-b border-slate-100 bg-white">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search 40 topics..."
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

            </div>

            {/* Filter Tabs */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFilterMode('ALL')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    filterMode === 'ALL' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Topics ({module.topics.length})
                </button>
                <button
                  onClick={() => setFilterMode('PENDING')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    filterMode === 'PENDING' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pending ({totalTopics - completedForThisBatch})
                </button>
                <button
                  onClick={() => setFilterMode('COMPLETED')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    filterMode === 'COMPLETED' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Completed ({completedForThisBatch})
                </button>
              </div>
              <span className="text-slate-400 text-[11px] font-mono-numbers">
                Showing {filteredTopics.length} of {module.topics.length}
              </span>
            </div>

            {/* Topics Checklist Items */}
            <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
              {filteredTopics.map((topic) => {
                const isSavedCompleted = activeBatchCompletedTopicIds.includes(topic.id);
                const completionEvent = completionEventByTopic.get(topic.id);
                const topicCompletedDate = completionEvent?.displayDate || topic.completedDate;
                const notesAvailability = getTopicNotesAvailability(
                  getScheduleBatchId(currentBatch),
                  module.id,
                  topic.id
                );
                const currentNotes = notesAvailability.status === 'Notes Uploaded'
                  ? notesAvailability.notes
                  : undefined;
                const attempts = getTopicAssessments(topic.id);
                const latestAssessment = attempts[0];
                const isAssessmentEligible = getAssessmentEligibility(topic.id);
                const requiresRetake = latestAssessment?.status === 'Completed' && !isAssessmentEligible;
                const canSendAssessment = !latestAssessment || (
                  latestAssessment.status === 'Completed' &&
                  !isAssessmentEligible &&
                  Boolean(latestAssessment.classAgainStartedAt)
                );
                const topicStatus = isSavedCompleted
                  ? 'Completed'
                  : latestAssessment?.classAgainStartedAt
                    ? 'Class Being Taken Again'
                    : isAssessmentEligible
                      ? 'Eligible for Completion'
                      : requiresRetake
                        ? 'Requires Retake'
                        : latestAssessment?.status === 'Completed'
                          ? 'Assessment Completed'
                          : latestAssessment?.status === 'In Progress'
                            ? 'Assessment In Progress'
                            : latestAssessment?.status === 'Sent'
                              ? 'MCQ Sent'
                              : 'Assessment Pending';
                const topicStatusClass = topicStatus === 'Completed' || topicStatus === 'Eligible for Completion'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : topicStatus === 'Requires Retake'
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : topicStatus === 'Class Being Taken Again'
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : topicStatus === 'Assessment In Progress' || topicStatus === 'MCQ Sent'
                        ? 'border-sky-200 bg-sky-50 text-sky-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600';
                const isScorePanelOpen = expandedScoreTopicId === topic.id;
                const selectedAssessment = attempts.find((assessment) => assessment.id === expandedAssessmentId) || attempts[0];
                const submittedResults = selectedAssessment?.students.filter((student) => student.score !== null) || [];
                const pendingResults = (selectedAssessment?.students.length || 0) - submittedResults.length;
                const averagePercentage = submittedResults.length
                  ? Math.round(submittedResults.reduce((sum, student) => sum + ((student.score || 0) / 10) * 100, 0) / submittedResults.length)
                  : null;
                const aboveThresholdCount = submittedResults.filter((student) => ((student.score || 0) / 10) * 100 > 75).length;
                const atOrBelowThresholdCount = submittedResults.length - aboveThresholdCount;
                const resultsThroughSelectedAttempt = getQualifyingAssessmentResults(
                  attempts.filter((assessment) =>
                    assessment.attempt <= (selectedAssessment?.attempt || 0)
                  )
                );
                const selectedAttemptEligible = Boolean(
                  selectedAssessment &&
                  selectedAssessment.status === 'Completed' &&
                  currentBatch.students.every((student) => resultsThroughSelectedAttempt.has(student.id))
                );
                const panelStatus = selectedAssessment?.classAgainStartedAt
                  ? 'Class Being Taken Again'
                  : selectedAssessment?.status === 'Sent'
                    ? 'MCQ Sent'
                    : selectedAssessment?.status === 'In Progress'
                      ? 'Assessment In Progress'
                      : selectedAssessment?.status === 'Completed'
                        ? selectedAttemptEligible ? 'Eligible for Completion' : 'Requires Retake'
                        : 'Pending';
                const panelStatusClass = panelStatus === 'Eligible for Completion'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : panelStatus === 'Requires Retake'
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : panelStatus === 'Class Being Taken Again'
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : 'border-sky-200 bg-sky-50 text-sky-700';

                return (
                  <div key={topic.id}>
                    <div
                      className={`syllabus-topic-row p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isSavedCompleted
                          ? 'bg-slate-50/50 opacity-85'
                          : 'hover:bg-indigo-50/40'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="mt-0.5 shrink-0">
                          {isSavedCompleted ? (
                            <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                              <CheckSquare className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-md border-2 border-slate-300 bg-white" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <span className="text-xs font-mono-numbers text-slate-400 font-medium mr-2">
                            {String(topic.number).padStart(2, '0')}.
                          </span>
                          <span className={`text-xs font-medium ${isSavedCompleted ? 'text-slate-700' : 'text-slate-900 font-semibold'}`}>
                            {topic.title}
                          </span>
                          {isSavedCompleted && topicCompletedDate && (
                            <span className="ml-2 text-[11px] font-semibold text-emerald-700">
                              Completed {formatReadableDate(topicCompletedDate)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${topicStatusClass}`}>
                          {topicStatus}
                        </span>
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          {notesAvailability.status === 'Notes Uploaded' && currentNotes ? (
                            <>
                              <span className="inline-flex max-w-full items-center gap-1 text-[10px] text-slate-600" title={currentNotes.fileName}>
                                <FileText className="h-3 w-3 shrink-0 text-emerald-700" />
                                <span className="max-w-36 truncate">{currentNotes.fileName}</span>
                                <span className="whitespace-nowrap text-slate-400">
                                  · {new Date(currentNotes.lastUpdatedAt).toLocaleString()}
                                </span>
                              </span>
                              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                                Notes Uploaded
                              </span>
                              <button
                                type="button"
                                onClick={() => { void downloadTopicNotes(currentNotes, getScheduleBatchId(currentBatch)); }}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50"
                              >
                                <Download className="h-3 w-3" />
                                Download Notes
                              </button>
                            </>
                          ) : notesAvailability.status === 'Notes Pending' ? (
                            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800">
                              Notes Pending
                            </span>
                          ) : (
                            <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                              Notes Locked
                            </span>
                          )}
                        </div>
                        {!isSavedCompleted && (
                          <>
                            <button
                              type="button"
                              disabled={!canSendAssessment || isCurrentContextMissed}
                              onClick={() => sendSyllabusAssessment(getScheduleBatchId(currentBatch), module.id, topic.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                              title={canSendAssessment ? 'Send a fresh 10-question MCQ assessment' : 'Complete this assessment or conduct the class again before resending'}
                            >
                              <Send className="h-3 w-3" />
                              {latestAssessment?.status === 'Sent'
                                ? 'MCQ Sent'
                                : latestAssessment?.status === 'In Progress'
                                  ? 'Assessment In Progress'
                                  : isAssessmentEligible
                                    ? 'Eligible'
                                    : latestAssessment?.classAgainStartedAt
                                      ? 'Send Retake MCQ'
                                      : 'Send MCQ'}
                            </button>
                            {attempts.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedScoreTopicId(isScorePanelOpen ? null : topic.id);
                                  setExpandedAssessmentId(isScorePanelOpen ? null : attempts[0].id);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                <Eye className="h-3 w-3" />
                                {isScorePanelOpen ? 'Hide Scores' : 'View Scores'}
                              </button>
                            )}
                            {requiresRetake && (
                              <button
                                type="button"
                                disabled={Boolean(latestAssessment?.classAgainStartedAt) || isCurrentContextMissed}
                                onClick={() => conductTopicAgain(getScheduleBatchId(currentBatch), module.id, topic.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                <RotateCcw className="h-3 w-3" />
                                {latestAssessment?.classAgainStartedAt ? 'Topic Being Taken Again' : 'Conduct Class Again'}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {isScorePanelOpen && selectedAssessment && (
                      <div className="border-t border-indigo-100 bg-indigo-50/30 p-4 sm:px-5" onClick={(event) => event.stopPropagation()}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{topic.title} · Assessment Results</h4>
                            <p className="mt-1 text-xs text-slate-500">
                              Attempt {selectedAssessment.attempt} · Sent {formatReadableDate(selectedAssessment.sentAt.slice(0, 10))}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {attempts.slice().reverse().map((attempt) => (
                              <button
                                key={attempt.id}
                                type="button"
                                onClick={() => setExpandedAssessmentId(attempt.id)}
                                className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold ${
                                  selectedAssessment.id === attempt.id
                                    ? 'border-indigo-300 bg-indigo-100 text-indigo-800'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                Attempt {attempt.attempt}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
                          {[
                            ['Questions', selectedAssessment.questions.length],
                            ['Students in attempt', selectedAssessment.students.length],
                            ['Submitted', submittedResults.length],
                            ['Not submitted', pendingResults],
                            ['Batch score', averagePercentage === null ? '—' : `${averagePercentage}%`],
                            ['Above 75%', aboveThresholdCount],
                            ['75% or below', atOrBelowThresholdCount]
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-lg border border-slate-200 bg-white p-2.5">
                              <p className="text-[10px] font-medium text-slate-500">{label}</p>
                              <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap gap-1.5">
                            <span className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold ${
                              selectedAssessment.status === 'Completed'
                                ? 'border-sky-200 bg-sky-50 text-sky-700'
                                : panelStatusClass
                            }`}>
                              {selectedAssessment.status === 'Completed' ? 'Assessment Completed' : panelStatus}
                            </span>
                            {selectedAssessment.status === 'Completed' && (
                              <span className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold ${panelStatusClass}`}>
                                {panelStatus}
                              </span>
                            )}
                          </div>
                          {selectedAssessment.status !== 'Completed' && (
                            <button
                              type="button"
                              onClick={() => simulateSyllabusAssessmentResponses(selectedAssessment.id)}
                              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700"
                            >
                              {submittedResults.length === 0 ? 'Simulate LMS Responses' : 'Complete Remaining Submissions'}
                            </button>
                          )}
                        </div>

                        <details className="mt-3 rounded-lg border border-slate-200 bg-white">
                          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-700">
                            View the 10 MCQ questions
                          </summary>
                          <ol className="list-decimal space-y-2 border-t border-slate-100 px-8 py-3 text-xs text-slate-700">
                            {selectedAssessment.questions.map((question, index) => (
                              <li key={`${selectedAssessment.id}-question-${index}`}>
                                <p className="font-semibold">{question.question}</p>
                                <p className="mt-1 text-slate-500">{question.options.join(' · ')}</p>
                              </li>
                            ))}
                          </ol>
                        </details>

                        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                          <table className="w-full min-w-[560px] text-left text-xs">
                            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                              <tr>
                                <th className="px-3 py-2.5">Student</th>
                                <th className="px-3 py-2.5">Score</th>
                                <th className="px-3 py-2.5">Percentage</th>
                                <th className="px-3 py-2.5">Result</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {selectedAssessment.students.map((student) => {
                                const percentage = student.score === null ? null : (student.score / 10) * 100;
                                const passed = percentage !== null && percentage > 75;
                                return (
                                  <tr key={student.studentId}>
                                    <td className="px-3 py-2.5 font-medium text-slate-800">{student.studentName}</td>
                                    <td className="px-3 py-2.5 text-slate-700">{student.score === null ? '—' : `${student.score}/10`}</td>
                                    <td className={`px-3 py-2.5 font-semibold ${percentage === null ? 'text-slate-400' : passed ? 'text-emerald-700' : 'text-rose-700'}`}>
                                      {percentage === null ? '—' : `${percentage}%`}
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
                                        percentage === null
                                          ? 'bg-slate-100 text-slate-500'
                                          : passed
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'bg-rose-50 text-rose-700'
                                      }`}>
                                        {percentage === null ? 'Pending' : passed ? 'Passed' : 'Below Threshold'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        {selectedAssessment.status === 'Completed' && !selectedAttemptEligible && (
                          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                            Every student in the batch must submit and score above 75%. A failed result requires the existing class retake and MCQ retest.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          </div>
      </div>

      {/* =========================================================================
          SECTION 2: SYLLABUS ACTIVITY HISTORY (COLLAPSIBLE)
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all">
        {/* Collapsible Header */}
        <div
          onClick={() => setIsHistoryExpanded((prev) => !prev)}
          className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-100/70 transition-colors"
          role="button"
          tabIndex={0}
          aria-expanded={isHistoryExpanded}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Syllabus Activity History
                </h3>
                <span className="text-xs font-semibold text-slate-700 bg-slate-200/70 px-2 py-0.5 rounded font-mono-numbers">
                  {filteredHistory.length} Recorded Event{filteredHistory.length === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Archived submission log of syllabus updates and attendance events.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 hidden sm:inline">
              {isHistoryExpanded ? 'Click to collapse' : 'Click to expand'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600">
              {isHistoryExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </div>
        </div>

        {/* Collapsible Content */}
        <div
          className={`accordion-collapse ${isHistoryExpanded ? 'is-open' : 'is-closed'}`}
          aria-hidden={!isHistoryExpanded}
          inert={!isHistoryExpanded}
        >
          <div className="accordion-collapse-inner">
            <div className="syllabus-history-summary grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-3 p-4 sm:p-5">
              {[
                {
                  label: 'Classes Conducted',
                  count: historySummary.classesConducted,
                  Icon: CalendarCheck2,
                  iconClass: 'bg-emerald-50 text-emerald-700',
                  countClass: 'text-emerald-700'
                },
                {
                  label: 'Classes Not Conducted',
                  count: historySummary.classesNotConducted,
                  Icon: CalendarX2,
                  iconClass: 'bg-rose-50 text-rose-700',
                  countClass: 'text-rose-700'
                },
                {
                  label: 'Topics Completed',
                  count: historySummary.topicsCompleted,
                  Icon: ListChecks,
                  iconClass: 'bg-emerald-50 text-emerald-700',
                  countClass: 'text-emerald-700'
                },
                {
                  label: 'Updates Pending',
                  count: historySummary.updatesPending,
                  Icon: Clock,
                  iconClass: 'bg-amber-50 text-amber-700',
                  countClass: 'text-amber-700'
                }
              ].map(({ label, count, Icon, iconClass, countClass }) => (
                <div
                  key={label}
                  className="min-h-24 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-center gap-3"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl leading-none font-bold font-mono-numbers text-slate-900">
                      <span className={countClass}>{count}</span>
                    </p>
                    <p className="mt-1.5 text-xs font-medium text-slate-600 leading-tight">
                      {label}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Current Batch Label */}
            <div className="p-3 bg-white border-b border-slate-100 flex items-center justify-between text-xs">
              <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                {currentBatch.batch} Batch
              </span>
              <span className="text-slate-400 text-[11px] font-mono-numbers">
                Showing {filteredHistory.length} entries
              </span>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No syllabus events logged for this batch yet. Assessment results are recorded per student and qualifying topics are completed automatically.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 uppercase tracking-wider font-semibold">
                      <th className="py-2.5 px-4">Event Date</th>
                      <th className="py-2.5 px-3">Event Type</th>
                      <th className="py-2.5 px-4">Details / Topic / Batch</th>
                      <th className="py-2.5 px-3">Reason / Activity Details</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHistory.map((event) => (
                      <tr key={event.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-4 font-mono-numbers text-slate-600 font-medium whitespace-nowrap">
                          {formatReadableDate(event.displayDate)}
                          {event.eventType === 'Topic Completed' ||
                          event.eventType === 'Topic Notes Uploaded' ||
                          event.eventType === 'Topic Notes Updated' ||
                          event.eventType === 'Topic Notes Released' ? (
                            <span className="mt-0.5 block text-[11px] text-slate-400">
                              {new Date(event.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold ${
                            event.eventType === 'Topic Completed'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : event.eventType === 'Topic Notes Uploaded' || event.eventType === 'Topic Notes Updated'
                                ? 'border-rose-200 bg-rose-50 text-rose-800'
                                : event.eventType === 'Topic Notes Released'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : event.eventType === 'Topic Requires Retake' || event.eventType === 'Class Not Conducted'
                                ? 'border-rose-200 bg-rose-50 text-rose-700'
                                : event.eventType === 'Topic Being Taken Again'
                                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                                  : 'border-indigo-200 bg-indigo-50 text-indigo-700'
                          }`}>
                            {event.eventType === 'Topic Completed'
                              ? <CheckCircle2 className="h-3.5 w-3.5" />
                              : event.eventType === 'Topic Notes Uploaded' ||
                              event.eventType === 'Topic Notes Updated' ||
                              event.eventType === 'Topic Notes Released'
                                ? <FileText className="h-3.5 w-3.5" />
                              : event.eventType === 'Class Not Conducted' || event.eventType === 'Topic Requires Retake'
                                ? <AlertTriangle className="h-3.5 w-3.5" />
                                : event.eventType === 'Topic Being Taken Again'
                                  ? <RotateCcw className="h-3.5 w-3.5" />
                                  : <BookOpen className="h-3.5 w-3.5" />}
                            <span>{event.eventType}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-900 font-medium">
                          <div>
                            <span className="block text-[11px] text-slate-500 font-semibold mb-0.5">
                              {event.moduleName}
                            </span>
                            <span className="block text-[11px] text-slate-400 font-semibold mb-0.5">
                              {event.batchName || currentBatch.batch}
                            </span>
                            {event.topicName ? (
                              <>
                                {event.topicNumber && (
                                  <span className="font-mono-numbers text-slate-500 mr-1.5 font-bold">
                                    Topic {event.topicNumber}:
                                  </span>
                                )}
                                <span>{event.topicName}</span>
                                {event.sessionIdentifier && (
                                  <span className="block text-[11px] text-slate-400 mt-0.5 font-mono-numbers">
                                    {event.sessionIdentifier}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span>{event.sessionIdentifier || 'Scheduled Session'}</span>
                            )}
                            {event.scheduledDate && (
                              <span className="block text-[11px] text-slate-400 mt-0.5 font-mono-numbers">
                                Scheduled: {formatReadableDate(event.scheduledDate)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 italic">
                          {event.details || event.reason ? `"${event.details || event.reason}"` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-numbers">
                          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50/80 px-2 py-0.5 rounded">
                            {event.savedStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </div>
      </div>

      {/* Missed Class Modal */}
      <ClassNotConductedModal
        isOpen={isMissedModalOpen}
        onClose={() => setIsMissedModalOpen(false)}
        moduleId={module.id}
        moduleName={module.name}
        selectedDate={activeDateContext}
        moduleSchedulesOnDate={approvedBatches.filter(
          (schedule) =>
            activeDateContext >= schedule.startDate &&
            isBatchScheduledOnDate(schedule.batch, activeDateContext, schedule.scheduledDays)
        ).map((schedule) => {
          const record = syllabusSessions.find(
            (session) => session.id === getScheduledSessionId(schedule.id, activeDateContext)
          );
          return record
            ? {
                ...schedule,
                sessionNumber: record.sessionNumber,
                syllabusUpdateStatus: record.syllabusUpdateStatus
              }
            : schedule;
        })}
        onSubmit={(payload) => recordClassNotConducted(payload)}
      />

      {/* Student Roster Modal */}
      <StudentListModal
        isOpen={Boolean(rosterBatch)}
        onClose={() => setRosterBatch(null)}
        students={rosterBatch?.students || []}
        moduleName={rosterBatch?.moduleName || ''}
        batch={rosterBatch?.batch || ''}
      />

      <Modal
        isOpen={isFinanceSubmissionModalOpen}
        onClose={() => setIsFinanceSubmissionModalOpen(false)}
        ariaLabel="Confirm Finance module verification submission"
      >
        <div className="flex items-start gap-3 border-b border-rose-200 bg-rose-50/70 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-900">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Submit Module for Verification</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              You have successfully completed all topics in this module for this batch. Do you want to submit this module for Finance Department verification?
            </p>
            <p className="mt-2 text-[11px] font-semibold text-rose-900">
              {module.name} · {currentBatch.batch} · {currentBatch.batchId || getScheduleBatchId(currentBatch)}
            </p>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setIsFinanceSubmissionModalOpen(false)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleFinanceSubmissionConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-900 px-4 py-2 text-xs font-bold text-white hover:bg-rose-800"
          >
            <Check className="h-4 w-4" />
            Confirm Submission
          </button>
        </div>
      </Modal>

    </div>
  );
};
