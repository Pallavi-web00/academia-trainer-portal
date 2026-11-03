import React from 'react';
import { X, Calendar, Clock, MapPin, Users, BookOpen, AlertCircle, ArrowUpRight } from 'lucide-react';
import { ScheduleItem, SyllabusActivityEvent } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import {
  formatReadableDate,
  getCurrentDateISO,
  getSessionSyllabusStatus,
  getScheduleBatchId
} from '../../utils/dateTimeUtils';

interface ScheduleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ScheduleItem | null;
  onApprove: (id: string) => void;
  onRequestChange: (schedule: ScheduleItem) => void;
  onViewRoster: (schedule: ScheduleItem) => void;
  activityHistory: SyllabusActivityEvent[];
  currentTime: Date;
}

export const ScheduleDetailsModal: React.FC<ScheduleDetailsModalProps> = ({
  isOpen,
  onClose,
  schedule,
  onApprove,
  onRequestChange,
  onViewRoster,
  activityHistory,
  currentTime
}) => {
  if (!isOpen || !schedule) return null;

  const todayStr = getCurrentDateISO();
  const batchStartDate = schedule.startDate || schedule.scheduledDate;
  const hasStarted = batchStartDate <= todayStr;
  const isApproved = schedule.approvalStatus === 'Approved';
  const isConducted = isApproved && hasStarted && (schedule.sessionNumber || 0) > 0;
  const completedSessions = isConducted ? (schedule.sessionNumber || 0) : 0;
  const missedEvent = activityHistory.find(
    (event) =>
      event.batchId === getScheduleBatchId(schedule) &&
      event.eventType === 'Class Not Conducted' &&
      event.savedStatus === 'Saved'
  );
  const missedReason = missedEvent?.reason || schedule.missedReason;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                {isConducted
                  ? `Session ${completedSessions} of ${schedule.totalSessions} Completed`
                  : `0 of ${schedule.totalSessions} Sessions (No classes conducted)`}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">{schedule.moduleName}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Batch: {schedule.batch}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Details Grid */}
        <div className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-medium">Batch Start Date</span>
              </div>
              <p className="font-semibold text-slate-900 font-mono-numbers">
                {formatReadableDate(schedule.startDate || schedule.scheduledDate)}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-medium">Batch Timings</span>
              </div>
              <p className="font-semibold text-slate-900 font-mono-numbers">
                {schedule.startTime} – {schedule.endTime}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-medium">Room / Platform</span>
              </div>
              <p className="font-semibold text-slate-900">{schedule.roomOrLink}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-medium">Enrolled Students</span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onViewRoster(schedule);
                }}
                className="font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-2 flex items-center gap-1"
              >
                <span>{schedule.students.length} Students</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-slate-500">Schedule Approval:</span>
            <StatusBadge status={schedule.approvalStatus} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500">Session Status:</span>
            <StatusBadge status={getSessionSyllabusStatus(schedule, activityHistory, currentTime)} />
          </div>

          {/* Change Request Reason note */}
          {schedule.approvalStatus === 'Change Requested' && schedule.changeRequestReason && (
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900">
              <div className="flex items-center gap-1.5 font-semibold text-amber-800 mb-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Submitted Change Request</span>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                "{schedule.changeRequestReason}"
              </p>
            </div>
          )}

          {/* Missed class reason note */}
          {missedReason && (
            <div className="p-3 rounded-xl bg-rose-50/80 border border-rose-200 text-rose-900">
              <div className="flex items-center gap-1.5 font-semibold text-rose-800 mb-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Reason for Missed Session</span>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed">
                "{missedReason}"
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {schedule.approvalStatus === 'Pending' && (
              <>
                <button
                  onClick={() => {
                    onClose();
                    onRequestChange(schedule);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  Request Change
                </button>
                <button
                  onClick={() => {
                    onApprove(schedule.id);
                    onClose();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  Approve Schedule
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
