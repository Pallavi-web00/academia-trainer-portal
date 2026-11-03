import React from 'react';
import {
  User,
  Mail,
  Building2,
  Calendar,
  Clock,
  Layers,
  RotateCcw,
  ShieldCheck,
  Phone,
  GraduationCap
} from 'lucide-react';
import { useTrainer } from '../context/TrainerContext';

export const Profile: React.FC = () => {
  const { trainer, modules, schedules, syllabusSessions, resetAllMockData } = useTrainer();

  const totalAssignedSessions = schedules.length;
  const completedSessions = syllabusSessions.filter((session) => session.outcome === 'Conducted').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Trainer Profile</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Faculty identity, institutional role, assigned cohorts, and mock configuration reference.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="portal-profile-avatar w-20 h-20 rounded-2xl text-white flex items-center justify-center font-bold text-2xl shadow-sm mb-3">
              {trainer.name.charAt(0)}
            </div>
            <h3 className="text-lg font-bold text-slate-900">{trainer.name}</h3>
            <p className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md mt-1">
              Faculty ID: {trainer.trainerId}
            </p>
            <p className="text-xs text-slate-500 mt-2">{trainer.designation}</p>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3 text-xs">
            <div className="flex items-center gap-3 text-slate-600">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-medium text-slate-900">{trainer.email}</span>
            </div>

            <div className="flex items-center gap-3 text-slate-600">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Department of {trainer.department}</span>
            </div>

            <div className="flex items-center gap-3 text-slate-600">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{trainer.phone}</span>
            </div>

            <div className="flex items-center gap-3 text-slate-600">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Office Hours: {trainer.officeHours}</span>
            </div>

            <div className="flex items-center gap-3 text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Joined: {trainer.joinedDate}</span>
            </div>
          </div>

          {/* Reset Action */}
          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={resetAllMockData}
              className="w-full py-2.5 px-4 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Local Mock Data</span>
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2 leading-tight">
              Clears browser local state and restores initial curriculum & schedule configurations.
            </p>
          </div>
        </div>

        {/* Teaching Allocations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assigned Batches */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Assigned Teaching Batches
                </h3>
              </div>
              <span className="text-xs font-semibold text-indigo-700 font-mono-numbers">
                {trainer.assignedBatches.length} Cohorts
              </span>
            </div>

            <div className="space-y-2.5">
              {trainer.assignedBatches.map((batchName, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-slate-800">{batchName}</span>
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                    Active Faculty
                  </span>
                </div>
              ))}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
              <div className="p-3 rounded-lg bg-slate-50">
                <span className="text-slate-400 block mb-0.5">Active Modules</span>
                <span className="text-base font-bold text-slate-900 font-mono-numbers">
                  {modules.length}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <span className="text-slate-400 block mb-0.5">Total Assigned Sessions</span>
                <span className="text-base font-bold text-slate-900 font-mono-numbers">
                  {totalAssignedSessions}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 col-span-2 sm:col-span-1">
                <span className="text-slate-400 block mb-0.5">Syllabus Logged</span>
                <span className="text-base font-bold text-emerald-600 font-mono-numbers">
                  {completedSessions}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
