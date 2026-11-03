import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Calendar, Clock, AlertCircle } from 'lucide-react';
import { ScheduleItem } from '../../types';
import { formatReadableDate } from '../../utils/dateTimeUtils';
import { CustomDropdown } from '../common/CustomDropdown';
import { Modal } from '../common/Modal';

interface ClassNotConductedModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId: string;
  moduleName: string;
  selectedDate: string;
  moduleSchedulesOnDate: ScheduleItem[];
  onSubmit: (payload: {
    moduleId: string;
    scheduledDate: string;
    sessionIds: string[];
    reason: string;
  }) => { success: boolean; message?: string };
}

export const ClassNotConductedModal: React.FC<ClassNotConductedModalProps> = ({
  isOpen,
  onClose,
  moduleId,
  moduleName,
  selectedDate,
  moduleSchedulesOnDate,
  onSubmit
}) => {
  const [selectedSessionOption, setSelectedSessionOption] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // If only 1 session exists, auto-select it. If multiple, default to the first one or 'all'
  useEffect(() => {
    if (moduleSchedulesOnDate.length === 1) {
      setSelectedSessionOption(moduleSchedulesOnDate[0].id);
    } else if (moduleSchedulesOnDate.length > 1) {
      setSelectedSessionOption(moduleSchedulesOnDate[0].id);
    } else {
      setSelectedSessionOption('');
    }
    setReason('');
    setValidationError(null);
  }, [moduleSchedulesOnDate, isOpen]);

  if (!isOpen) return null;

  const hasMultipleSessions = moduleSchedulesOnDate.length > 1;
  const singleSession = moduleSchedulesOnDate.length === 1 ? moduleSchedulesOnDate[0] : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!reason.trim()) {
      setValidationError('A specific reason is mandatory for marking a class as not conducted.');
      return;
    }

    if (reason.trim().length < 5) {
      setValidationError('Please provide a meaningful reason (at least 5 characters).');
      return;
    }

    let targetSessionIds: string[] = [];

    if (!hasMultipleSessions && singleSession) {
      targetSessionIds = [singleSession.id];
    } else if (selectedSessionOption === 'ALL_ON_DATE') {
      targetSessionIds = moduleSchedulesOnDate.map((s) => s.id);
    } else if (selectedSessionOption) {
      targetSessionIds = [selectedSessionOption];
    } else {
      setValidationError('Please select the affected session.');
      return;
    }

    // Call submit
    const result = onSubmit({
      moduleId,
      scheduledDate: selectedDate,
      sessionIds: targetSessionIds,
      reason: reason.trim()
    });

    if (result.success) {
      onClose();
    } else if (result.message) {
      setValidationError(result.message);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Record class not conducted" sizeClassName="max-w-lg">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-rose-50/50 shrink-0">
          <div>
            <div className="flex items-center gap-1.5 text-rose-700">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Attendance & Log</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">Record Class Not Conducted</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Document missed academic hours with institutional justification.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="min-h-0 flex-1 flex flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-4">
            {/* Module & Date Info */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="font-semibold text-slate-900 text-sm">{moduleName}</div>
              <div className="flex items-center gap-4 text-slate-600 font-mono-numbers">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  {formatReadableDate(selectedDate)}
                </span>
                <span>Scheduled Sessions: {moduleSchedulesOnDate.length}</span>
              </div>
            </div>

            {/* Session Selector Logic */}
            {hasMultipleSessions ? (
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Select Affected Scheduled Session <span className="text-rose-500">*</span>
                </label>
                <CustomDropdown
                  value={selectedSessionOption}
                  onChange={setSelectedSessionOption}
                  ariaLabel="Select affected scheduled session"
                  options={[
                    ...moduleSchedulesOnDate.map((session) => ({
                      value: session.id,
                      label: `Session ${session.sessionNumber} — ${session.startTime}–${session.endTime} (Status: ${session.syllabusUpdateStatus})`
                    })),
                    {
                      value: 'ALL_ON_DATE',
                      label: `All Sessions (${moduleSchedulesOnDate.length} sessions on ${formatReadableDate(selectedDate)})`
                    }
                  ]}
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Note: "All Sessions" applies strictly to the sessions scheduled for this module on {formatReadableDate(selectedDate)}.
                </p>
              </div>
            ) : singleSession ? (
              <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block">Identified Single Scheduled Session:</span>
                  <span className="font-semibold text-indigo-900 font-mono-numbers">
                    Session {singleSession.sessionNumber} · {singleSession.startTime}–{singleSession.endTime}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-indigo-700 font-medium">
                  <Clock className="w-4 h-4" />
                  <span>{singleSession.roomOrLink}</span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                No formal sessions were found scheduled on this date. You can still record an ad-hoc missed class note.
              </div>
            )}

            {/* Mandatory Reason */}
            <div>
              <label htmlFor="missed-reason" className="block text-xs font-semibold text-slate-800 mb-1.5">
                Mandatory Reason for Non-Conduction <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="missed-reason"
                rows={4}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="Example: Institutional faculty emergency, university holiday, or student attendance at symposium..."
                className={`w-full p-3 text-xs rounded-xl border ${
                  validationError ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-300'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600`}
              />

              {validationError && (
                <p className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{validationError}</span>
                </p>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
              Recording a class as not conducted documents the session outcome in Activity History, resolves the pending reminder for the affected session, and does not alter the percentage of planned syllabus completed.
            </div>
          </div>

          {/* Footer Actions */}
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
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors shadow-xs"
            >
              Submit Missed-Class Record
            </button>
          </div>
        </form>
    </Modal>
  );
};
