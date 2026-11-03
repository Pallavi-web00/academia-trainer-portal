import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle, ArrowUpRight } from 'lucide-react';
import { ScheduleApprovalStatus, SyllabusUpdateStatus, SessionOutcome } from '../../types';

interface StatusBadgeProps {
  status: ScheduleApprovalStatus | SyllabusUpdateStatus | SessionOutcome | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  switch (status) {
    case 'Approved':
    case 'Completed':
    case 'Updated':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="whitespace-nowrap">{status}</span>
        </span>
      );

    case 'Pending':
    case 'Pending Update':
    case 'Pending Admin Review':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses}`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="whitespace-nowrap">{status}</span>
        </span>
      );

    case 'Change Requested':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 ${sizeClasses}`}
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="whitespace-nowrap">{status}</span>
        </span>
      );

    case 'Class Not Conducted':
    case 'Not Conducted':
    case 'Cancelled':
    case 'Rejected':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses}`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span className="whitespace-nowrap">{status}</span>
        </span>
      );

    case 'Rescheduled':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-sky-50 text-sky-700 border border-sky-200 ${sizeClasses}`}
        >
          <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span className="whitespace-nowrap">{status}</span>
        </span>
      );

    case 'Upcoming':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-sky-50 text-sky-700 border border-sky-200 ${sizeClasses}`}
        >
          <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span className="whitespace-nowrap">{status}</span>
        </span>
      );

    case 'Ongoing':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 ${sizeClasses}`}
        >
          <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="whitespace-nowrap">{status}</span>
        </span>
      );

    case 'No Class Today':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-slate-100 text-slate-600 border border-slate-200 ${sizeClasses}`}
        >
          <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="whitespace-nowrap">{status}</span>
        </span>
      );

    case 'Not Started':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-slate-100 text-slate-600 border border-slate-200 ${sizeClasses}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="whitespace-nowrap">{status || 'Not Started'}</span>
        </span>
      );
  }
};
