import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Send, Calendar, Clock } from 'lucide-react';
import { ScheduleItem } from '../../types';
import { formatReadableDate } from '../../utils/dateTimeUtils';
import { Modal } from '../common/Modal';

interface ChangeRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ScheduleItem | null;
  onSubmit: (scheduleId: string, reason: string) => boolean;
}

export const ChangeRequestModal: React.FC<ChangeRequestModalProps> = ({
  isOpen,
  onClose,
  schedule,
  onSubmit
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (schedule) {
      setReason(schedule.changeRequestReason || '');
      setError(null);
    }
  }, [schedule]);

  if (!isOpen || !schedule) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A reason is mandatory to submit a schedule change request.');
      return;
    }
    if (reason.trim().length < 5) {
      setError('Please provide a more detailed reason (minimum 5 characters).');
      return;
    }

    const ok = onSubmit(schedule.id, reason.trim());
    if (ok) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Request schedule change" sizeClassName="max-w-lg">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50 shrink-0">
          <div>
            <div className="flex items-center gap-1.5 text-indigo-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Schedule Adjustment</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">Request Schedule Change</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit timing, date, or room adjustment notes for administrative review.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Schedule Summary */}
        <form onSubmit={handleSubmit} className="min-h-0 flex-1 flex flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
              <div className="font-semibold text-slate-900 text-sm">{schedule.moduleName}</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Start: {formatReadableDate(schedule.startDate || schedule.scheduledDate)}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {schedule.startTime} – {schedule.endTime}
                </span>
                <span>Batch: {schedule.batch}</span>
                <span>Session {schedule.sessionNumber}/{schedule.totalSessions}</span>
              </div>
            </div>

            {/* Mandatory Reason */}
            <div>
              <label htmlFor="reason" className="block text-xs font-semibold text-slate-800 mb-1.5">
                Mandatory Reason for Change Request <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="reason"
                rows={4}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Example: Need to adjust start time to 11:30 AM due to faculty lab conflict or requested rescheduling..."
                className={`w-full p-3 text-xs rounded-xl border ${
                  error ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-300'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600`}
              />
              {error ? (
                <p className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-500">
                  Note: In this frontend preview, this record will be stored locally for future administrative integration.
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Request</span>
            </button>
          </div>
        </form>
    </Modal>
  );
};
