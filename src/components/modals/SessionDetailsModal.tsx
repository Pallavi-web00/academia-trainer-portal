import React from 'react';
import { X, Calendar, Clock, MapPin, CheckCircle2, AlertTriangle, Users } from 'lucide-react';
import { ScheduleItem, SyllabusActivityEvent } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { formatReadableDate, getScheduleBatchId } from '../../utils/dateTimeUtils';

interface SessionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ScheduleItem | null;
  activityEvents: SyllabusActivityEvent[];
  onOpenRoster: (session: ScheduleItem) => void;
}

export const SessionDetailsModal: React.FC<SessionDetailsModalProps> = ({
  isOpen,
  onClose,
  session,
  activityEvents,
  onOpenRoster
}) => {
  if (!isOpen || !session) return null;

  // Find activity records associated with this session
  const sessionActivities = activityEvents.filter(
    (event) =>
      event.batchId === getScheduleBatchId(session) &&
      event.sessionId === session.id
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                Session Record #{session.sessionNumber}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">{session.moduleName}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Batch: {session.batch}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-slate-500 block mb-0.5">Session Date</span>
              <div className="font-semibold text-slate-900 flex items-center gap-1.5 font-mono-numbers">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                {formatReadableDate(session.scheduledDate)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-slate-500 block mb-0.5">Batch Timings</span>
              <div className="font-semibold text-slate-900 flex items-center gap-1.5 font-mono-numbers">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                {session.startTime} – {session.endTime}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-slate-500 block mb-0.5">Room / Venue</span>
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                {session.roomOrLink}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-slate-500 block mb-0.5">Students Enrolled</span>
              <button
                onClick={() => {
                  onClose();
                  onOpenRoster(session);
                }}
                className="font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-2 flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{session.students.length} Students</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Session Outcome:</span>
            <StatusBadge
              status={
                session.syllabusUpdateStatus === 'Class Not Conducted'
                  ? 'Not Conducted'
                  : session.syllabusUpdateStatus === 'Updated'
                  ? 'Completed'
                  : 'Pending'
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Syllabus Update Status:</span>
            <StatusBadge status={session.syllabusUpdateStatus} />
          </div>

          {/* Missed reason if any */}
          {session.missedReason && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
              <div className="flex items-center gap-1.5 font-semibold text-rose-800 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span>Non-Conduction Justification</span>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed">{session.missedReason}</p>
            </div>
          )}

          {/* Activity events logged for this session */}
          <div className="pt-3 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Associated Syllabus Activity Records
            </h4>
            {sessionActivities.length === 0 ? (
              <p className="text-slate-500 text-xs italic">
                {session.syllabusUpdateStatus === 'Pending Update'
                  ? 'No syllabus updates have been recorded yet for this session.'
                  : 'No individual topic entries linked directly to this session ID.'}
              </p>
            ) : (
              <div className="space-y-2">
                {sessionActivities.map((act) => (
                  <div
                    key={act.id}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {act.eventType === 'Topic Completed' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        )}
                        <span className="font-semibold text-slate-900 truncate">
                          {act.eventType === 'Topic Completed'
                            ? `Topic ${act.topicNumber}: ${act.topicName}`
                            : `Class Not Conducted`}
                        </span>
                      </div>
                      {act.reason && (
                        <p className="text-[11px] text-slate-600 mt-1 pl-5">"{act.reason}"</p>
                      )}
                    </div>
                    <span className="text-[11px] font-mono-numbers text-slate-400 shrink-0">
                      {act.displayDate}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
