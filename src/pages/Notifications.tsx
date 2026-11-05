import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Clock,
  CheckCircle2,
  ArrowRight,
  Filter,
  ShieldAlert
} from 'lucide-react';
import { useTrainer } from '../context/TrainerContext';
import { EmptyState } from '../components/common/EmptyState';
import { CustomDropdown } from '../components/common/CustomDropdown';

export const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, resolveNotification } = useTrainer();

  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Filtered list
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      // Tab filter
      if (activeTab === 'PENDING' && notif.isResolved) return false;
      if (activeTab === 'RESOLVED' && !notif.isResolved) return false;

      // Category filter
      if (categoryFilter !== 'ALL' && notif.category !== categoryFilter) return false;

      return true;
    });
  }, [notifications, activeTab, categoryFilter]);

  const pendingCount = notifications.filter((n) => !n.isResolved).length;
  const resolvedCount = notifications.filter((n) => n.isResolved).length;

  return (
    <div className="space-y-2">
      {/* Tabs & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-xl max-w-[180px] bg-white border border-slate-200 shadow-2xs">
        {/* Category selector */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <CustomDropdown
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { value: 'ALL', label: 'All Categories' },
              { value: 'syllabus_overdue', label: 'Syllabus Overdue Reminders' },
              { value: 'schedule_approval', label: 'Schedule Approval Notices' },
              { value: 'examination', label: 'Examination Updates' },
              { value: 'system', label: 'System and Finance Handoffs' }
            ]}
            ariaLabel="Filter notification category"
            size="compact"
          />
        </div>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No Notifications Found"
          description={
            activeTab === 'PENDING'
              ? "You have zero pending reminders! All class session outcomes are up to date."
              : "No notifications match your current filter settings."
          }
          actionText={activeTab !== 'ALL' ? 'View All Alerts' : undefined}
          onAction={() => {
            setActiveTab('ALL');
            setCategoryFilter('ALL');
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((item) => {
            const isOverdue = item.category === 'syllabus_overdue';
            const isApproval = item.category === 'schedule_approval';
            const isExamination = item.category === 'examination';
            const isFinanceSubmission = item.targetRole === 'Finance Department';
            const isAdminHandoff = item.targetRole === 'Admin';

            return (
              <div
                key={item.id}
                className={`notification-card ${item.isResolved ? 'is-read' : 'is-unread'} p-4 sm:p-5 rounded-2xl border transition-all ${
                  item.isResolved
                    ? 'bg-slate-50/60 border-slate-200 opacity-75'
                    : isOverdue
                    ? 'bg-white border-rose-200 shadow-2xs hover:border-rose-300'
                    : isExamination
                    ? 'bg-white border-indigo-200 shadow-2xs hover:border-indigo-300'
                    : isFinanceSubmission
                    ? 'bg-white border-rose-200 shadow-2xs hover:border-rose-300'
                    : 'bg-white border-amber-200 shadow-2xs hover:border-amber-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Icon & Content */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        item.isResolved
                          ? 'bg-slate-100 text-slate-500'
                          : isOverdue
                          ? 'bg-rose-50 text-rose-600'
                          : isExamination
                          ? 'bg-indigo-50 text-indigo-600'
                          : isFinanceSubmission
                          ? 'bg-rose-50 text-rose-800'
                          : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {item.isResolved ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : isOverdue ? (
                        <ShieldAlert className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[11px] font-semibold uppercase tracking-wider ${
                            item.isResolved
                              ? 'text-slate-500'
                              : isOverdue
                              ? 'text-rose-600'
                              : isFinanceSubmission
                              ? 'text-rose-800'
                              : 'text-amber-600'
                          }`}
                        >
                          {isFinanceSubmission ? 'Finance Department · Mock Handoff' : isAdminHandoff ? 'Admin · Mock Handoff' : isOverdue ? 'Overdue Reminder' : isExamination ? 'Examination Update · Mock' : 'Approval Request'}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-400 font-mono-numbers">
                          {item.timestamp}
                        </span>
                      </div>

                      <h4
                        className={`text-sm font-bold ${
                          item.isResolved ? 'text-slate-700 line-through' : 'text-slate-900'
                        }`}
                      >
                        {item.title}
                      </h4>

                      <p className="mt-1 text-xs text-slate-600 max-w-2xl leading-relaxed">
                        {item.message}
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {!item.isResolved ? (
                      <>
                        <button
                          onClick={() => {
                            if (isOverdue) {
                              navigate(
                                `/syllabus?session=${item.sessionId || ''}&date=${
                                  item.dateContext || ''
                                }`
                              );
                            } else if (isApproval) {
                              navigate('/schedule');
                            } else if (isExamination && item.relatedRequestId) {
                              navigate(`/examinations?exam=${encodeURIComponent(item.relatedRequestId)}`);
                            } else if (isFinanceSubmission && item.sessionId) {
                              navigate(`/syllabus?session=${encodeURIComponent(item.sessionId)}`);
                            }
                          }}
                          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors ${
                            isOverdue
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : isExamination
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              : isFinanceSubmission
                              ? 'bg-rose-900 hover:bg-rose-800 text-white'
                              : 'bg-amber-600 hover:bg-amber-700 text-white'
                          }`}
                        >
                          <span>{item.actionLabel || 'Take Action'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => resolveNotification(item.id)}
                          title="Dismiss notification"
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          Dismiss
                        </button>
                      </>
                    ) : (
                      <>
                        {isExamination && item.relatedRequestId && (
                          <button
                            onClick={() => navigate(`/examinations?exam=${encodeURIComponent(item.relatedRequestId || '')}`)}
                            className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                          >
                            View Examination
                          </button>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Resolved</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
