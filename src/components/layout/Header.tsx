import React from 'react';
import { Bell, RotateCcw, Calendar } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTrainer } from '../../context/TrainerContext';
import { getCurrentDateISO, formatReadableDate } from '../../utils/dateTimeUtils';

interface HeaderProps {
  onToggleDrawer: () => void;
  isDrawerOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleDrawer,
  isDrawerOpen
}) => {
  const { trainer, activeRemindersCount, resetAllMockData } = useTrainer();
  const location = useLocation();

  const getPageTitle = (pathname: string): { title: string; subtitle: string } => {
    switch (pathname) {
      case '/':
        return { title: 'Dashboard Overview', subtitle: "Monitor today's sessions and pending syllabus actions" };
      case '/schedule':
        return { title: 'My Class Schedule', subtitle: 'Review assigned teaching schedules and request changes' };
      case '/syllabus':
        return { title: 'Syllabus Tracker', subtitle: 'Record topic completions and session outcome logs' };
      case '/history':
        return { title: 'Session History', subtitle: 'Archive of conducted and documented academic sessions' };
      case '/notifications':
        return { title: 'Notifications & Reminders', subtitle: 'Syllabus overdue alerts and schedule actions' };
      case '/examinations':
        return { title: 'Examination Management', subtitle: 'Submit requests and review examination decisions' };
      case '/profile':
        return { title: 'Trainer Profile', subtitle: 'Faculty credentials, assigned batches, and mock configuration' };
      default:
        return { title: 'Trainer Portal', subtitle: 'Faculty Management System' };
    }
  };

  const { title, subtitle } = getPageTitle(location.pathname);
  const todayFormatted = formatReadableDate(getCurrentDateISO());

  return (
    <header
      className={`portal-header sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between ${
        isDrawerOpen ? 'navigation-open' : ''
      }`}
      onClick={(event) => {
        if (isDrawerOpen && !(event.target instanceof Element && event.target.closest('.mat-trigger'))) {
          onToggleDrawer();
        }
      }}
    >
      {/* Left: Rolled-mat navigation trigger & page title */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button
          onClick={onToggleDrawer}
          className="mat-trigger -ml-1 shrink-0"
          aria-label={isDrawerOpen ? 'Close navigation drawer' : 'Open navigation drawer'}
          aria-expanded={isDrawerOpen}
          aria-controls="trainer-navigation-drawer"
          title={isDrawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          <svg className="rolled-mat-icon" viewBox="0 0 48 48" aria-hidden="true">
            <defs>
              <linearGradient id="mat-body" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#9b7cda" />
                <stop offset="0.28" stopColor="#7652c0" />
                <stop offset="0.72" stopColor="#603ba8" />
                <stop offset="1" stopColor="#442777" />
              </linearGradient>
              <linearGradient id="mat-edge" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="#ddcef9" />
                <stop offset="0.42" stopColor="#b9a5e8" />
                <stop offset="1" stopColor="#8465c3" />
              </linearGradient>
              <linearGradient id="mat-band" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="#f7c875" />
                <stop offset="0.52" stopColor="#f3aa36" />
                <stop offset="1" stopColor="#d88625" />
              </linearGradient>
              <radialGradient id="mat-spiral" cx="30%" cy="24%" r="80%">
                <stop offset="0" stopColor="#faf7ff" />
                <stop offset="0.72" stopColor="#c8b7ee" />
                <stop offset="1" stopColor="#8d70c8" />
              </radialGradient>
              <filter id="mat-shadow" x="-30%" y="-30%" width="170%" height="180%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="1.4" />
                <feOffset dy="1.5" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.34" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <ellipse cx="25" cy="39" rx="14" ry="3" fill="#352354" opacity=".16" />
            <g filter="url(#mat-shadow)">
              <path d="M13 12h20.5c5.1 0 8.5 4.9 8.5 12s-3.4 12-8.5 12H13z" fill="url(#mat-body)" />
              <path d="M20 13.4v21.2M21.4 13.4v21.2" stroke="#d8c8f4" strokeOpacity=".3" strokeWidth=".8" />
              <path d="M31.8 13.2v21.6" stroke="url(#mat-band)" strokeWidth="2.2" />
              <path d="M34.2 14c2.6 1.8 4 5.2 4 10s-1.4 8.2-4 10" fill="none" stroke="#f8d7e7" strokeOpacity=".54" strokeWidth=".9" />
              <ellipse cx="13.2" cy="24" rx="8.2" ry="12.2" fill="#513384" />
              <ellipse cx="12.7" cy="24" rx="6.8" ry="10.6" fill="url(#mat-edge)" />
              <ellipse cx="12.6" cy="24" rx="4.65" ry="7.9" fill="#6547a1" />
              <path d="M14.4 19.3c-1.4-1.8-4.3-1.5-5.3.4-.8 1.5-.2 3.1 1.2 3.6 1.5.6 2.8-.5 2.6-1.7-.1-.8-.9-1.2-1.5-.8" fill="none" stroke="#f7d8e8" strokeLinecap="round" strokeWidth="1.25" />
              <path d="M11 13.8c-2 .5-3.8 2-4.8 4" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".8" strokeWidth="1.2" />
              <path d="M18 13.4h10" stroke="#fff" strokeLinecap="round" strokeOpacity=".3" strokeWidth="1" />
            </g>
            <path d="M13 36c6 .7 13 .7 20 0" fill="none" stroke="#e94e91" strokeLinecap="round" strokeOpacity=".85" strokeWidth="1.3" />
          </svg>
        </button>

        <div className="h-5 w-px bg-slate-200 hidden sm:block shrink-0" />

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
              {title}
            </h1>
            <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/60 truncate">
              Advanced Python & Database Foundation
            </span>
          </div>
          <p className="hidden md:block text-xs text-slate-500 truncate -mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: Date, Reset, Notification, Profile */}
      <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
        {/* Live Academic Date */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600 font-mono-numbers">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{todayFormatted}</span>
        </div>

        {/* Reset Mock Data Button */}
        <button
          onClick={resetAllMockData}
          title="Reset local mock state to initial data"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors flex items-center gap-1.5 text-xs font-medium"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Reset Mock Data</span>
        </button>

        {/* Notification Bell */}
        <Link
          to="/notifications"
          className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="View notifications"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {activeRemindersCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center font-mono-numbers ring-2 ring-white">
              {activeRemindersCount}
            </span>
          )}
        </Link>

        {/* Trainer Avatar Pill */}
        <Link
          to="/profile"
          className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200 text-slate-700 hover:text-slate-900 group"
          title="View profile"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200 group-hover:bg-indigo-200 transition-colors">
            {trainer.name.charAt(0)}
          </div>
          <span className="hidden sm:inline text-xs font-semibold group-hover:text-indigo-600 transition-colors">
            {trainer.name}
          </span>
        </Link>
      </div>
    </header>
  );
};
