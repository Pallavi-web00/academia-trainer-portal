import React, { useState } from 'react';
import { X, Search, Users, Mail, CheckCircle2 } from 'lucide-react';
import { Student } from '../../types';
import { Modal } from '../common/Modal';

interface StudentListModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  moduleName: string;
  batch: string;
  onViewProfile: (student: Student) => void;
}

export const StudentListModal: React.FC<StudentListModalProps> = ({
  isOpen,
  onClose,
  students,
  moduleName,
  batch,
  onViewProfile
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Class roster" sizeClassName="max-w-4xl">
        <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-indigo-700">
              <Users className="w-5 h-5" />
              <span className="text-xs font-semibold tracking-wider uppercase">Class Roster</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">{moduleName}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Batch: {batch} · {students.length} Enrolled Students
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

        <div className="p-4 border-b border-slate-100 bg-white shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name, roll number, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No students found matching "{search}".
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider bg-slate-50/50">
                    <th className="py-2.5 px-3">Profile</th>
                    <th className="py-2.5 px-3">Student ID</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3 text-right">Attendance</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                          {student.photoUrl ? (
                            <img src={student.photoUrl} alt={student.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-bold text-slate-700">{student.name.split(' ').map((part) => part[0]).slice(0,2).join('').toUpperCase() || 'ST'}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono-numbers text-slate-600 font-medium">
                        {student.rollNumber}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {student.name}
                      </td>
                      
                      <td className="py-2.5 px-3 text-right font-mono-numbers font-medium">
                        <span
                          className={
                            student.attendancePercent >= 90
                              ? 'text-emerald-700'
                              : student.attendancePercent >= 80
                              ? 'text-indigo-700'
                              : 'text-amber-700'
                          }
                        >
                          {student.attendancePercent}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onViewProfile(student)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-800 transition-colors hover:bg-rose-100"
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Roster verified by Admin
          </span>
          
        </div>
    </Modal>
  );
};
