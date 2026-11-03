import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FilePlus2,
  History,
  Search,
  Users,
  X
} from 'lucide-react';
import { useTrainer } from '../context/TrainerContext';
import { ExaminationRequest, ExaminationType } from '../types';
import { findExaminationScheduleConflict } from '../data/examinationData';
import { getScheduleBatchId, parseTimeToMinutes } from '../utils/dateTimeUtils';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import { CustomDropdown } from '../components/common/CustomDropdown';

type ExaminationTab = 'pending' | 'approved' | 'history';
type RequestDraft = Pick<
  ExaminationRequest,
  'title' | 'batchId' | 'moduleId' | 'type' | 'proposedDate' |
  'proposedStartTime' | 'proposedEndTime' | 'topicIds' | 'mode' |
  'venueDetails' | 'adminInstructions'
>;

const todayISO = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const defaultDraft = (batchId = '', moduleId = ''): RequestDraft => ({
  title: '',
  batchId,
  moduleId,
  type: 'Theory',
  proposedDate: '',
  proposedStartTime: '04:15 PM',
  proposedEndTime: '05:45 PM',
  topicIds: [],
  mode: 'Offline',
  venueDetails: '',
  adminInstructions: ''
});

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
  });
};

const formatTimeRange = (start?: string, end?: string) => `${start || '—'} – ${end || '—'}`;

const stateBadgeClass = (status: ExaminationRequest['requestStatus']) => {
  if (status === 'Approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'Rejected') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

const StateBadge: React.FC<{ status: ExaminationRequest['requestStatus'] }> = ({ status }) => (
  <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${stateBadgeClass(status)}`}>
    {status}
  </span>
);

export const Examinations: React.FC = () => {
  const {
    examinationRequests, schedules, modules, submitExaminationRequest
  } = useTrainer();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<ExaminationTab>('pending');
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<RequestDraft>(() => defaultDraft());
  const [revisionOf, setRevisionOf] = useState<ExaminationRequest | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ExaminationRequest | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [formError, setFormError] = useState('');

  const batchOptions = useMemo(() => {
    const unique = new Map<string, string>();
    schedules.forEach((schedule) => unique.set(getScheduleBatchId(schedule), schedule.batch));
    return [...unique.entries()];
  }, [schedules]);

  const moduleOptions = useMemo(() => {
    const moduleIds = new Set(
      schedules
        .filter((schedule) => getScheduleBatchId(schedule) === draft.batchId)
        .map((schedule) => schedule.moduleId)
    );
    return modules.filter((module) => moduleIds.has(module.id));
  }, [draft.batchId, modules, schedules]);

  const selectedModule = modules.find((module) => module.id === draft.moduleId);

  useEffect(() => {
    const requestId = searchParams.get('request');
    if (!requestId) return;
    const request = examinationRequests.find((item) => item.id === requestId);
    if (request) {
      setSelectedRequest(request);
      setActiveTab('history');
    }
  }, [examinationRequests, searchParams]);

  const counts = useMemo(() => ({
    total: examinationRequests.length,
    pending: examinationRequests.filter((item) => item.requestStatus === 'Pending Admin Review').length,
    approved: examinationRequests.filter((item) => item.requestStatus === 'Approved').length,
    rejected: examinationRequests.filter((item) => item.requestStatus === 'Rejected').length
  }), [examinationRequests]);

  const visibleRequests = useMemo(() => {
    const tabRequests = activeTab === 'pending'
      ? examinationRequests.filter((item) => item.requestStatus === 'Pending Admin Review')
      : activeTab === 'approved'
        ? examinationRequests.filter((item) => item.requestStatus === 'Approved')
        : examinationRequests;
    return tabRequests.filter((item) => {
      const text = `${item.id} ${item.title} ${item.batchName} ${item.moduleName}`.toLowerCase();
      return text.includes(search.toLowerCase()) &&
        (statusFilter === 'ALL' || item.requestStatus === statusFilter);
    }).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }, [activeTab, examinationRequests, search, statusFilter]);

  const openNewForm = () => {
    setRevisionOf(null);
    setDraft(defaultDraft(batchOptions[0]?.[0] || '', ''));
    setFormError('');
    setShowForm(true);
  };

  const openRevision = (request: ExaminationRequest) => {
    setSelectedRequest(null);
    setRevisionOf(request);
    setDraft({
      title: request.title,
      batchId: request.batchId,
      moduleId: request.moduleId,
      type: request.type,
      proposedDate: request.proposedDate,
      proposedStartTime: request.proposedStartTime,
      proposedEndTime: request.proposedEndTime,
      topicIds: [...request.topicIds],
      mode: request.mode,
      venueDetails: request.venueDetails,
      adminInstructions: request.adminInstructions
    });
    setFormError('');
    setShowForm(true);
  };

  const setDraftField = <K extends keyof RequestDraft>(key: K, value: RequestDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const conflict = draft.proposedDate
    ? findExaminationScheduleConflict(
      draft.batchId,
      draft.proposedDate,
      draft.proposedStartTime,
      draft.proposedEndTime,
      schedules,
      examinationRequests
    )
    : undefined;

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.batchId || !draft.moduleId ||
      !draft.proposedDate || !draft.proposedStartTime || !draft.proposedEndTime ||
      !draft.topicIds.length || !draft.venueDetails.trim() ||
      !draft.adminInstructions.trim()) {
      setFormError('Complete all required fields and select at least one syllabus topic.');
      return;
    }
    if (draft.proposedDate < todayISO()) {
      setFormError('The proposed examination date must be today or later.');
      return;
    }
    if (parseTimeToMinutes(draft.proposedEndTime) <= parseTimeToMinutes(draft.proposedStartTime)) {
      setFormError('End time must be later than start time.');
      return;
    }
    if (conflict) {
      setFormError(conflict);
      return;
    }
    const request = submitExaminationRequest({
      ...draft,
      originalRequestId: revisionOf?.originalRequestId || revisionOf?.id,
      revisionNumber: revisionOf ? (revisionOf.revisionNumber || 0) + 1 : undefined
    });
    if (request) {
      setShowForm(false);
      setActiveTab('pending');
      setSelectedRequest(null);
      setSearchParams({});
    }
  };

  const historyView = activeTab === 'history';
  const summaryCards = [
    { label: 'Total examination requests', count: counts.total, icon: ClipboardCheck, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Pending admin review', count: counts.pending, icon: Clock3, color: 'text-amber-600 bg-amber-50' },
    { label: 'Approved examinations', count: counts.approved, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Rejected examinations', count: counts.rejected, icon: AlertCircle, color: 'text-rose-600 bg-rose-50' }
  ];

  const renderRequest = (request: ExaminationRequest) => (
    <article key={request.id} className="examination-card rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">{request.title}</h3>
            <StateBadge status={request.requestStatus} />
            {request.eventStatus !== 'Upcoming' && (
              <StatusBadge status={request.eventStatus} size="sm" />
            )}
          </div>
          <p className="text-xs text-slate-500">{request.batchName} · {request.moduleName} · {request.type}</p>
        </div>
        <button
          type="button"
          onClick={() => setSelectedRequest(request)}
          className="self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          View Details
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
        <div><span className="text-slate-400">Request ID</span><p className="mt-0.5 font-mono font-semibold text-slate-700">{request.id}</p></div>
        <div><span className="text-slate-400">Proposed examination</span><p className="mt-0.5 font-semibold text-slate-700">{formatDate(request.proposedDate)} · {formatTimeRange(request.proposedStartTime, request.proposedEndTime)}</p></div>
        <div><span className="text-slate-400">Submitted</span><p className="mt-0.5 font-semibold text-slate-700">{formatDateTime(request.submittedAt)}</p></div>
      </div>

      {request.requestStatus === 'Pending Admin Review' && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Awaiting admin decision. Eligibility list will be available after admin review.
        </p>
      )}
      {request.requestStatus === 'Rejected' && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <p className="text-xs font-bold text-rose-800">Rejection reason</p>
          <p className="mt-1 text-xs leading-relaxed text-rose-700">{request.rejectionReason}</p>
          <button type="button" onClick={() => openRevision(request)} className="mt-3 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 border border-rose-200 hover:bg-rose-100">
            Revise and Resubmit
          </button>
        </div>
      )}
      {request.requestStatus === 'Approved' && (
        <div className="mt-4 rounded-lg bg-emerald-50/70 px-3 py-2.5 text-xs text-emerald-900">
          Confirmed: {formatDate(request.approvedDate || request.proposedDate)} · {formatTimeRange(request.approvedStartTime || request.proposedStartTime, request.approvedEndTime || request.proposedEndTime)}
          <span className="ml-2 font-semibold">{request.eligibleStudents?.length || 0} eligible students</span>
        </div>
      )}
    </article>
  );

  const renderHistoryRows = () => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-xs">
        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Request ID</th>
            <th className="px-4 py-3 font-semibold">Examination</th>
            <th className="px-4 py-3 font-semibold">Batch / Module</th>
            <th className="px-4 py-3 font-semibold">Proposed date</th>
            <th className="px-4 py-3 font-semibold">Confirmed date</th>
            <th className="px-4 py-3 font-semibold">Submitted</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Last update</th>
            <th className="px-4 py-3 font-semibold">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {visibleRequests.map((request) => (
            <tr key={request.id} className="text-slate-700 hover:bg-slate-50/70">
              <td className="px-4 py-3 font-mono">{request.id}{request.originalRequestId && <span className="block text-[10px] text-indigo-600">Revision of {request.originalRequestId}</span>}</td>
              <td className="px-4 py-3 font-semibold">{request.title}</td>
              <td className="px-4 py-3">{request.batchName}<span className="block text-slate-400">{request.moduleName}</span></td>
              <td className="px-4 py-3">{formatDate(request.proposedDate)}</td>
              <td className="px-4 py-3">{request.requestStatus === 'Approved' ? formatDate(request.approvedDate || request.proposedDate) : '—'}</td>
              <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(request.submittedAt)}</td>
              <td className="px-4 py-3"><StateBadge status={request.requestStatus} /></td>
              <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(request.scheduleChange?.decisionDate || request.decisionDate || request.submittedAt)}</td>
              <td className="px-4 py-3"><button type="button" onClick={() => setSelectedRequest(request)} className="font-semibold text-indigo-600 hover:text-indigo-800">View</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Examination Management</h2>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Submit examination proposals and review simulated admin decisions.</p>
        </div>
        <button type="button" onClick={openNewForm} className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-2xs hover:bg-indigo-700">
          <FilePlus2 className="h-4 w-4" /> Schedule Examination
        </button>
      </div>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-xs leading-relaxed text-indigo-900">
        <strong>Sample workflow:</strong> Admin decisions and eligibility lists shown here are mock data only. Submitting a request does not send it to the separate admin system.
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, count, icon: Icon, color }) => (
          <div key={label} className="flex min-h-[92px] items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
            <div><p className="text-2xl font-bold leading-none text-slate-900">{count}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 max-w-[520px] bg-white p-1.5 shadow-2xs">
        {([
          ['pending', 'Pending Requests', counts.pending],
          ['approved', 'Approved Examinations', counts.approved],
          ['history', 'Examination History', counts.total]
        ] as const).map(([key, label, count]) => (
          <button key={key} type="button" onClick={() => setActiveTab(key)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${activeTab === key ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            {label} <span className={activeTab === key ? 'text-indigo-100' : 'text-slate-400'}>({count})</span>
          </button>
        ))}
      </div>
      {historyView && (
        <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 max-w-[320px] bg-white p-1.5 shadow-2xs">
          <CustomDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'ALL', label: 'All statuses' },
              { value: 'Pending Admin Review', label: 'Pending Admin Review', status: 'pending' },
              { value: 'Approved', label: 'Approved', status: 'approved' },
              { value: 'Rejected', label: 'Rejected', status: 'rejected' }
            ]}
            ariaLabel="Filter by examination status"
            size="compact"
          />
        </div>
      )}
      

      {visibleRequests.length === 0 ? (
        <EmptyState icon={historyView ? History : CalendarDays} title="No examinations found" description="There are no requests matching this view or filter." />
      ) : historyView ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">{renderHistoryRows()}</div>
      ) : (
        <div className="space-y-3">{visibleRequests.map(renderRequest)}</div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-3 py-8 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}>
          <form onSubmit={submitForm} className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl" aria-labelledby="examination-form-title">
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div><h3 id="examination-form-title" className="text-base font-bold text-slate-900">{revisionOf ? 'Revise Examination Request' : 'Schedule Examination'}</h3><p className="mt-1 text-xs text-slate-500">{revisionOf ? `New revision linked to ${revisionOf.id}; the rejected request will remain in history.` : 'Submit a proposed examination schedule for admin review.'}</p></div>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Close form" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-700">Examination title <b className="text-rose-600">*</b></span><input required value={draft.title} onChange={(event) => setDraftField('title', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10" /></label>
              <label><span className="mb-1 block text-xs font-semibold text-slate-700">Batch <b className="text-rose-600">*</b></span><CustomDropdown required value={draft.batchId} onChange={(value) => { setDraftField('batchId', value); setDraftField('moduleId', ''); }} placeholder="Select batch" ariaLabel="Batch" options={batchOptions.map(([id, name]) => ({ value: id, label: name }))} /></label>
              <label><span className="mb-1 block text-xs font-semibold text-slate-700">Module <b className="text-rose-600">*</b></span><CustomDropdown required value={draft.moduleId} onChange={(value) => setDraftField('moduleId', value)} placeholder="Select module" ariaLabel="Module" options={moduleOptions.map((module) => ({ value: module.id, label: module.name }))} /></label>
              <label><span className="mb-1 block text-xs font-semibold text-slate-700">Examination type <b className="text-rose-600">*</b></span><CustomDropdown required value={draft.type} onChange={(value) => setDraftField('type', value as ExaminationType)} ariaLabel="Examination type" options={[{ value: 'Theory', label: 'Theory' }, { value: 'Practical', label: 'Practical' }, { value: 'Assessment', label: 'Assessment' }]} /></label>
              <label><span className="mb-1 block text-xs font-semibold text-slate-700">Proposed date <b className="text-rose-600">*</b></span><input required type="date" min={todayISO()} value={draft.proposedDate} onChange={(event) => setDraftField('proposedDate', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
              <label><span className="mb-1 block text-xs font-semibold text-slate-700">Start time <b className="text-rose-600">*</b></span><input required type="time" value={draft.proposedStartTime ? `${String((parseTimeToMinutes(draft.proposedStartTime) / 60) % 24).padStart(2, '0')}:${String(parseTimeToMinutes(draft.proposedStartTime) % 60).padStart(2, '0')}` : ''} onChange={(event) => { const [hour, minute] = event.target.value.split(':').map(Number); const suffix = hour >= 12 ? 'PM' : 'AM'; const h12 = hour % 12 || 12; setDraftField('proposedStartTime', `${String(h12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`); }} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
              <label><span className="mb-1 block text-xs font-semibold text-slate-700">End time <b className="text-rose-600">*</b></span><input required type="time" value={draft.proposedEndTime ? `${String((parseTimeToMinutes(draft.proposedEndTime) / 60) % 24).padStart(2, '0')}:${String(parseTimeToMinutes(draft.proposedEndTime) % 60).padStart(2, '0')}` : ''} onChange={(event) => { const [hour, minute] = event.target.value.split(':').map(Number); const suffix = hour >= 12 ? 'PM' : 'AM'; const h12 = hour % 12 || 12; setDraftField('proposedEndTime', `${String(h12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`); }} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
              <label><span className="mb-1 block text-xs font-semibold text-slate-700">Mode <b className="text-rose-600">*</b></span><CustomDropdown required value={draft.mode} onChange={(value) => setDraftField('mode', value as RequestDraft['mode'])} ariaLabel="Mode" options={[{ value: 'Offline', label: 'Offline' }, { value: 'Online', label: 'Online' }]} /></label>
              <label><span className="mb-1 block text-xs font-semibold text-slate-700">{draft.mode === 'Offline' ? 'Venue' : 'Online examination details'} <b className="text-rose-600">*</b></span><input required value={draft.venueDetails} onChange={(event) => setDraftField('venueDetails', event.target.value)} placeholder={draft.mode === 'Offline' ? 'Room or venue' : 'Platform and access arrangements'} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
              <fieldset className="sm:col-span-2"><legend className="mb-2 text-xs font-semibold text-slate-700">Syllabus / topics covered <b className="text-rose-600">*</b></legend>{selectedModule ? <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{selectedModule.topics.map((topic) => <label key={topic.id} className="flex items-start gap-2 rounded-lg border border-slate-200 p-2.5 text-xs text-slate-700"><input type="checkbox" checked={draft.topicIds.includes(topic.id)} onChange={(event) => setDraftField('topicIds', event.target.checked ? [...draft.topicIds, topic.id] : draft.topicIds.filter((id) => id !== topic.id))} className="mt-0.5 accent-indigo-600" />{topic.title}</label>)}</div> : <p className="text-xs text-slate-400">Choose a batch and module to select topics.</p>}</fieldset>
              <label className="sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-700">Instructions or remarks for admin <b className="text-rose-600">*</b></span><textarea required rows={3} value={draft.adminInstructions} onChange={(event) => setDraftField('adminInstructions', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
              {conflict && <p role="alert" className="sm:col-span-2 flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle className="h-4 w-4 shrink-0" />{conflict}</p>}
              {formError && <p role="alert" className="sm:col-span-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{formError}</p>}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Submit for Admin Review</button>
            </div>
          </form>
        </div>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-900/50 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setSelectedRequest(null); setSearchParams({}); } }}>
          <section className="my-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="request-detail-title">
            <div className="sticky top-0 flex items-start justify-between border-b border-slate-100 bg-white p-5">
              <div><div className="flex flex-wrap items-center gap-2"><h3 id="request-detail-title" className="text-base font-bold text-slate-900">{selectedRequest.title}</h3><StateBadge status={selectedRequest.requestStatus} /><StatusBadge status={selectedRequest.eventStatus} size="sm" /></div><p className="mt-1 text-xs text-slate-500">{selectedRequest.id}{selectedRequest.originalRequestId ? ` · Revision of ${selectedRequest.originalRequestId}` : ''}</p></div>
              <button type="button" onClick={() => { setSelectedRequest(null); setSearchParams({}); }} aria-label="Close details" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-5 p-5">
              <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 text-xs sm:grid-cols-2">
                <div><p className="text-slate-400">Batch / module</p><p className="mt-1 font-semibold text-slate-800">{selectedRequest.batchName} · {selectedRequest.moduleName}</p></div>
                <div><p className="text-slate-400">Type / mode</p><p className="mt-1 font-semibold text-slate-800">{selectedRequest.type} · {selectedRequest.mode}</p></div>
                <div><p className="text-slate-400">Proposed date and time</p><p className="mt-1 font-semibold text-slate-800">{formatDate(selectedRequest.proposedDate)} · {formatTimeRange(selectedRequest.proposedStartTime, selectedRequest.proposedEndTime)}</p></div>
                <div><p className="text-slate-400">Venue / online details</p><p className="mt-1 font-semibold text-slate-800">{selectedRequest.venueDetails}</p></div>
                <div><p className="text-slate-400">Request submitted</p><p className="mt-1 font-semibold text-slate-800">{formatDateTime(selectedRequest.submittedAt)}</p></div>
                <div><p className="text-slate-400">Topics covered</p><p className="mt-1 font-semibold text-slate-800">{selectedRequest.topicNames.join(', ') || '—'}</p></div>
              </div>

              {selectedRequest.requestStatus === 'Pending Admin Review' && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Awaiting admin decision. Eligibility list will be available after admin review.</p>}
              {selectedRequest.requestStatus === 'Rejected' && <div className="rounded-lg border border-rose-200 bg-rose-50 p-4"><h4 className="text-xs font-bold text-rose-900">Rejection reason</h4><p className="mt-1 text-xs leading-relaxed text-rose-800">{selectedRequest.rejectionReason}</p>{selectedRequest.adminRemarks && <p className="mt-2 text-xs text-rose-700">Admin remarks: {selectedRequest.adminRemarks}</p>}<p className="mt-2 text-[11px] text-rose-600">Decision date: {formatDateTime(selectedRequest.decisionDate)}</p><button type="button" onClick={() => openRevision(selectedRequest)} className="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">Revise and Resubmit</button></div>}

              {selectedRequest.requestStatus === 'Approved' && (
                <>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                    <h4 className="text-xs font-bold text-emerald-900">Admin-confirmed examination</h4>
                    <p className="mt-1 text-xs text-emerald-800">{formatDate(selectedRequest.approvedDate || selectedRequest.proposedDate)} · {formatTimeRange(selectedRequest.approvedStartTime || selectedRequest.proposedStartTime, selectedRequest.approvedEndTime || selectedRequest.proposedEndTime)}</p>
                    {selectedRequest.approvedDate && (selectedRequest.approvedDate !== selectedRequest.proposedDate || selectedRequest.approvedStartTime !== selectedRequest.proposedStartTime) && <p className="mt-2 text-[11px] font-semibold text-emerald-800">Confirmed schedule differs from the original proposal shown above.</p>}
                    <p className="mt-2 text-[11px] text-emerald-800">Approval date: {formatDateTime(selectedRequest.decisionDate)}</p>
                    {selectedRequest.adminRemarks && <p className="mt-1 text-[11px] text-emerald-800">Admin remarks: {selectedRequest.adminRemarks}</p>}
                    {selectedRequest.eligibilityRemarks && <p className="mt-1 text-[11px] text-emerald-800">Eligibility remarks: {selectedRequest.eligibilityRemarks}</p>}
                  </div>
                  {selectedRequest.scheduleChange && <div className={`rounded-lg border p-3 text-xs ${selectedRequest.scheduleChange.status === 'Confirmed' ? 'border-sky-200 bg-sky-50 text-sky-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}><p className="font-bold">{selectedRequest.scheduleChange.status === 'Confirmed' ? 'Schedule change confirmed' : 'Schedule change awaiting admin review'}</p><p className="mt-1">Proposed change: {formatDate(selectedRequest.scheduleChange.proposedDate)} · {formatTimeRange(selectedRequest.scheduleChange.proposedStartTime, selectedRequest.scheduleChange.proposedEndTime)}</p>{selectedRequest.scheduleChange.adminRemarks && <p className="mt-1">{selectedRequest.scheduleChange.adminRemarks}</p>}</div>}
                  <div>
                    <div className="mb-2 flex items-center justify-between"><h4 className="text-sm font-bold text-slate-900">Admin-selected eligible students</h4><span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"><Users className="h-3.5 w-3.5" />{selectedRequest.eligibleStudents?.length || 0}</span></div>
                    {!selectedRequest.eligibleStudents?.length ? <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center"><Users className="mx-auto h-6 w-6 text-slate-400" /><p className="mt-2 text-sm font-semibold text-slate-700">No students are currently eligible for this examination.</p><p className="mt-1 text-xs text-slate-500">The admin returned an eligible count of zero.</p></div> : <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[520px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-3 py-2.5">Student ID</th><th className="px-3 py-2.5">Student name</th><th className="px-3 py-2.5">Batch</th><th className="px-3 py-2.5">Admin eligibility remarks</th></tr></thead><tbody className="divide-y divide-slate-100">{selectedRequest.eligibleStudents.map((student) => <tr key={student.studentId}><td className="px-3 py-2.5 font-mono">{student.studentId}</td><td className="px-3 py-2.5 font-semibold">{student.studentName}</td><td className="px-3 py-2.5">{student.batchName}</td><td className="px-3 py-2.5 text-slate-500">{student.eligibilityRemarks || '—'}</td></tr>)}</tbody></table></div>}
                  </div>
                  {selectedRequest.eventStatus === 'Completed' && <p className="rounded-lg bg-slate-100 p-3 text-xs text-slate-700">Completed {formatDateTime(selectedRequest.completedAt)}. This completion state is explicitly seeded mock history.</p>}
                  {selectedRequest.eventStatus === 'Cancelled' && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><strong>Cancelled:</strong> {selectedRequest.cancellationReason}</p>}
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
