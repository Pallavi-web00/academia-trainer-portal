import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Upload
} from 'lucide-react';
import { useTrainer } from '../context/TrainerContext';
import { TopicNotesModal } from '../components/modals/TopicNotesModal';
import { ModuleData, SyllabusTopic } from '../types';
import { isScheduleAssignedToTrainer } from '../utils/dateTimeUtils';

const formatFileSize = (size: number) => (
  size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(2)} MB`
);

export const NotesManagement: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const {
    trainer,
    modules,
    schedules,
    topicNotes,
    topicNotesLoaded,
    uploadTopicNotes
  } = useTrainer();
  const [activeTopic, setActiveTopic] = useState<SyllabusTopic | null>(null);

  const assignedSchedules = useMemo(
    () => schedules.filter((schedule) => isScheduleAssignedToTrainer(schedule, trainer)),
    [schedules, trainer.assignedBatches]
  );
  const assignedModules = useMemo(
    () => modules.filter((item) => assignedSchedules.some((schedule) => schedule.moduleId === item.id)),
    [modules, assignedSchedules]
  );
  const selectedModule = assignedModules.find((item) => item.id === moduleId);
  const selectedModuleSchedules = selectedModule
    ? assignedSchedules.filter((schedule) => schedule.moduleId === selectedModule.id)
    : [];
  const notesByTopic = new Map(
    topicNotes
      .filter((notes) => notes.moduleId === selectedModule?.id)
      .map((notes) => [notes.topicId, notes])
  );

  const handleUpload = async (file: File) => {
    if (!selectedModule || !activeTopic) return false;
    return uploadTopicNotes(file, selectedModule.id, activeTopic.id);
  };

  if (moduleId && !selectedModule) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xs">
        <h1 className="text-lg font-bold text-slate-900">Module unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">This module is not assigned to your trainer account.</p>
        <button
          type="button"
          onClick={() => navigate('/notes', { replace: true })}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          View assigned modules
        </button>
      </div>
    );
  }

  if (selectedModule) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate('/notes')}
              className="mt-0.5 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:bg-slate-50"
              aria-label="Back to assigned modules"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Notes Management</p>
              <h1 className="mt-1 text-xl font-bold text-slate-900">{selectedModule.name}</h1>
              <p className="mt-1 text-sm text-slate-600">
                Prepare one document per topic for all assigned batches.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedModuleSchedules.map((schedule) => (
              <span
                key={schedule.id}
                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800"
              >
                {schedule.batch}
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <BookOpen className="h-4 w-4 text-rose-700" />
              {selectedModule.topics.length} Topics
            </div>
            <p className="text-xs text-slate-500">
              Notes can be uploaded before teaching; batch access remains assessment-gated.
            </p>
          </div>

          {!topicNotesLoaded ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading saved notes…</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {selectedModule.topics.map((topic) => {
                const notes = notesByTopic.get(topic.id);
                const status = !notes ? 'Not Uploaded' : notes.version > 1 ? 'Updated' : 'Uploaded';
                const statusClass = status === 'Updated'
                  ? 'border-sky-200 bg-sky-50 text-sky-800'
                  : status === 'Uploaded'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-amber-200 bg-amber-50 text-amber-800';

                return (
                  <article
                    key={topic.id}
                    className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-xs font-bold text-rose-800">
                        {String(topic.number).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-slate-900">{topic.title}</h2>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span className={`rounded-md border px-2 py-0.5 font-semibold ${statusClass}`}>{status}</span>
                          {notes ? (
                            <>
                              <span className="inline-flex max-w-full items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5 shrink-0 text-rose-700" />
                                <span className="max-w-56 truncate font-medium text-slate-700" title={notes.fileName}>
                                  {notes.fileName}
                                </span>
                                <span>({formatFileSize(notes.fileSize)})</span>
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="h-3.5 w-3.5" />
                                Last updated {new Date(notes.lastUpdatedAt).toLocaleString()}
                              </span>
                              {notes.version > 1 && <span>Version {notes.version}</span>}
                            </>
                          ) : (
                            <span>Upload notes before teaching to prepare this topic.</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTopic(topic)}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
                    >
                      {notes ? <FileText className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
                      {notes ? 'Edit Notes' : 'Upload Notes'}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <p className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs leading-relaxed text-amber-900">
          Demo storage: files are retained in this browser on this device using IndexedDB. They are not uploaded to a remote server.
        </p>

        {activeTopic && (
          <TopicNotesModal
            isOpen
            onClose={() => setActiveTopic(null)}
            topic={activeTopic}
            module={selectedModule}
            existingNotes={notesByTopic.get(activeTopic.id)}
            onUpload={handleUpload}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Trainer Workspace</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Notes Management</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage topic-wise notes for modules assigned to {trainer.name}.
        </p>
      </div>

      {assignedModules.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          No modules are currently assigned to your trainer account.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {assignedModules.map((item: ModuleData) => {
            const moduleNotes = topicNotes.filter((notes) => notes.moduleId === item.id);
            const uploadedCount = moduleNotes.length;
            const pendingCount = Math.max(0, item.topics.length - uploadedCount);
            const progress = item.topics.length > 0
              ? Math.round((uploadedCount / item.topics.length) * 100)
              : 0;
            const batches = assignedSchedules.filter((schedule) => schedule.moduleId === item.id);

            return (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-800">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">{item.code}</p>
                      <h2 className="mt-1 text-base font-bold text-slate-900">{item.name}</h2>
                    </div>
                  </div>
                  <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                    {progress}%
                  </span>
                </div>

                <div className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Assigned Batches</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {batches.map((schedule) => (
                      <span key={schedule.id} className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-800">
                        {schedule.batch}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-lg font-bold text-slate-900">{item.topics.length}</p>
                    <p className="text-[11px] text-slate-500">Topics</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50/70 p-3">
                    <p className="inline-flex items-center gap-1 text-lg font-bold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />{uploadedCount}
                    </p>
                    <p className="text-[11px] text-slate-600">Notes Uploaded</p>
                  </div>
                  <div className="rounded-xl bg-amber-50/70 p-3">
                    <p className="inline-flex items-center gap-1 text-lg font-bold text-amber-800">
                      <Clock3 className="h-4 w-4" />{pendingCount}
                    </p>
                    <p className="text-[11px] text-slate-600">Notes Pending</p>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-rose-600 transition-all" style={{ width: `${progress}%` }} />
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/notes/${item.id}`)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  Manage Topics
                  <ChevronRight className="h-4 w-4" />
                </button>
              </article>
            );
          })}
        </div>
      )}

      {!topicNotesLoaded && <p className="text-center text-xs text-slate-500">Loading saved notes…</p>}
      <p className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs leading-relaxed text-amber-900">
        Demo storage: documents are retained in this browser on this device using IndexedDB. They are not uploaded to a remote server.
      </p>
    </div>
  );
};
