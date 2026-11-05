import React, { DragEvent, useRef, useState } from 'react';
import { FileText, FileUp, Upload, X } from 'lucide-react';
import { ModuleData, SyllabusTopic, TopicNotesMetadata } from '../../types';
import {
  getTopicNotesFileValidationError,
  MAX_TOPIC_NOTES_FILE_SIZE_BYTES
} from '../../utils/topicNotesStorage';
import { Modal } from '../common/Modal';

interface TopicNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: SyllabusTopic | null;
  module: ModuleData;
  existingNotes?: TopicNotesMetadata;
  onUpload: (file: File) => Promise<boolean>;
}

const formatFileSize = (size: number) => {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

export const TopicNotesModal: React.FC<TopicNotesModalProps> = ({
  isOpen,
  onClose,
  topic,
  module,
  existingNotes,
  onUpload
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!topic) return null;

  const validateFile = (file: File) => {
    const validationError = getTopicNotesFileValidationError(file);
    if (validationError) {
      setSelectedFile(null);
      setError(validationError);
      return;
    }
    setSelectedFile(file);
    setError('');
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) validateFile(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile || isSaving) return;

    setIsSaving(true);
    setError('');
    try {
      if (await onUpload(selectedFile)) onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={`${existingNotes ? 'Replace' : 'Upload'} notes for ${topic.title}`}
      sizeClassName="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="min-h-0 flex flex-col">
        <div className="flex items-start justify-between border-b border-slate-200 bg-rose-50/60 p-5 shrink-0">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-800">
              <FileUp className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900">
                {existingNotes ? 'Replace Topic Notes' : 'Upload Topic Notes'}
              </h2>
              <p className="mt-1 text-xs text-slate-600">Prepare learning material independently of class completion and assessment results.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-100 hover:text-slate-700"
            aria-label="Close notes upload"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <dl className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-slate-500">Topic</dt>
              <dd className="mt-1 break-words font-semibold text-slate-900">{topic.title}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-slate-500">Module</dt>
              <dd className="mt-1 break-words font-semibold text-slate-900">{module.name}</dd>
            </div>
          </dl>

          {existingNotes && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3 text-xs">
              <p className="font-semibold text-slate-800">Current document: {existingNotes.fileName}</p>
              <p className="mt-1 text-slate-600">
                Version {existingNotes.version} · Last updated {new Date(existingNotes.lastUpdatedAt).toLocaleString()}
              </p>
            </div>
          )}

          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            className="rounded-xl border-2 border-dashed border-rose-200 bg-rose-50/30 p-5 text-center transition-colors hover:border-rose-300"
          >
            <FileUp className="mx-auto h-7 w-7 text-rose-700" />
            <p className="mt-2 text-sm font-semibold text-slate-800">Drop your notes file here</p>
            <p className="mt-1 text-xs text-slate-500">PDF, DOC, DOCX, PPT, or PPTX · Up to {formatFileSize(MAX_TOPIC_NOTES_FILE_SIZE_BYTES)}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx"
              className="sr-only"
              tabIndex={-1}
              aria-label="Choose notes file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) validateFile(file);
                event.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-50"
            >
              <FileText className="h-3.5 w-3.5" />
              Browse Files
            </button>
          </div>

          {selectedFile && (
            <div className="flex min-w-0 items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
              <FileText className="h-5 w-5 shrink-0 text-emerald-700" />
              <div className="min-w-0 flex-1">
                <p className="break-all text-xs font-semibold text-slate-800">{selectedFile.name}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
          )}

          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">{error}</p>}
          <p className="text-[11px] leading-relaxed text-slate-500">
            Files are retained in this browser on this device for this demonstration. They are not sent to an admin or remote server.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row sm:justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!selectedFile || isSaving}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-800 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {isSaving ? 'Saving…' : existingNotes ? 'Save Changes' : 'Upload Notes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
