import React from 'react';
import { X } from 'lucide-react';
import { Student } from '../../types';
import { Modal } from '../common/Modal';
import { getStudentInitials } from '../../utils/studentId';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
}

const infoRows = (label: string, value?: string | number | null) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-bold text-slate-900">{value ?? '—'}</p>
  </div>
);

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({ isOpen, onClose, student }) => {
  if (!isOpen || !student) return null;

  const studentName = student.fullName || student.name;
  const studentId = student.rollNumber || student.id;
  const admissionNumber = student.admissionNumber || '—';
  const imageSrc = student.photoUrl || undefined;

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Student profile" sizeClassName="max-w-5xl">
      <div className="flex max-h-[calc(100dvh-2rem)] min-h-0 flex-col overflow-hidden bg-slate-100">
        <div className="flex items-start justify-between border-b border-slate-200 bg-white px-3 py-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">Student Profile</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">{studentName}</h3>
            <p className="mt-0.5 text-sm font-mono text-slate-600">{studentId}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close student profile"
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <div className="grid gap-2 lg:grid-cols-[260px_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="flex h-52 w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-rose-50 via-white to-slate-100">
              {imageSrc ? (
                <img src={imageSrc} alt={studentName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-rose-100 text-4xl font-black text-rose-900">
                  {getStudentInitials(studentName)}
                </div>
              )}
            </div>
            <div className="mt-4 rounded-xl bg-rose-50 p-3 text-center">
              <p className="text-[11px] uppercase tracking-wider text-rose-700">Admission No.</p>
              <p className="mt-1 text-lg font-black text-slate-900">{admissionNumber}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <h4 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-600">Personal Information</h4>
              <div className="grid gap-1 sm:grid-cols-2">
                {infoRows('Full Name', studentName)}
                {infoRows('Student ID', studentId)}
      
                {infoRows('Date of Birth', student.dateOfBirth || '—')}
                {infoRows('Gender', student.gender || '—')}
                {infoRows('Contact Number', student.contactNumber || '—')}
                {infoRows('Email Address', student.email || '—')}
                {infoRows('Address', student.address || '—')}
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-600">Guardian Information</h4>
              <div className="grid gap-1 sm:grid-cols-2">
                {infoRows('Guardian Name', student.guardianName || '—')}
                {infoRows('Guardian Contact Number', student.guardianContactNumber || '—')}
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-600">Academic Information</h4>
              <div className="grid gap-1 sm:grid-cols-2">
                {infoRows('Qualification', student.qualification || '—')}
                {infoRows('Course Name', student.courseName || 'AI')}
                {infoRows('Batch Name', student.batchName || '—')}
                {infoRows('Admission Date', student.admissionDate || '—')}
                {infoRows('Student Status', student.studentStatus || 'Active')}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </Modal>
  );
};
