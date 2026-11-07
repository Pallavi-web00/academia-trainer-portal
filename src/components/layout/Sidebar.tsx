import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  BookOpenCheck,
  FileText,
  Bell,
  GraduationCap,
  X,
  ClipboardList,
  ClipboardCheck,
  ClipboardClock
} from 'lucide-react';
import { useTrainer } from '../../context/TrainerContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { trainer, activeRemindersCount, pendingAdminTasksCount } = useTrainer();
  const location = useLocation();
  const navigate = useNavigate();
  const [isRollingUp, setIsRollingUp] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const closingRef = useRef(false);

  const closeAfterRoll = useCallback((afterClose?: () => void) => {
    if (closingRef.current) return;

    closingRef.current = true;
    setIsRollingUp(true);
    closeTimer.current = window.setTimeout(() => {
      closingRef.current = false;
      setIsRollingUp(false);
      onClose();
      afterClose?.();
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 320);
  }, [onClose]);

  const handleNavigation = (
    event: React.MouseEvent<HTMLAnchorElement>,
    path: string
  ) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    closeAfterRoll(() => navigate(path));
  };

  useEffect(() => {
    if (!isOpen && closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
      closingRef.current = false;
      setIsRollingUp(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeAfterRoll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeAfterRoll]);

  useEffect(() => {
    if (isOpen) closeAfterRoll();
  }, [location.pathname]);

  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'My Class Schedule', path: '/schedule', icon: CalendarDays },
    { name: 'Syllabus Tracker', path: '/syllabus', icon: BookOpenCheck },
    { name: 'Notes Management', path: '/notes', icon: FileText },
    { name: 'Attendance', path: '/attendance', icon: ClipboardClock },
    { name: 'Examination', path: '/examinations', icon: ClipboardCheck },
    {
      name: 'Notifications',
      path: '/notifications',
      icon: Bell,
      badge: activeRemindersCount > 0 ? activeRemindersCount : undefined
    }
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`portal-sidebar-backdrop fixed inset-0 z-40 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => closeAfterRoll()}
        aria-hidden="true"
      />

      {/* Floating panel unfolds from the rolled-mat control. */}
      <aside
        id="trainer-navigation-drawer"
        aria-label="Trainer Navigation Drawer"
        aria-hidden={!isOpen || isRollingUp}
        className={`portal-sidebar fixed z-50 text-slate-200 shadow-2xl flex flex-col ${
          isOpen && !isRollingUp ? 'is-open' : 'is-closed'
        }`}
      >
        {/* Drawer Header with Branding & Close Button */}
        <div className="h-16 flex items-center justify-between border-b border-slate-800 shrink-0 px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="portal-brand-mark w-9 h-9 rounded-xl border flex items-center justify-center font-bold shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-bold tracking-tight text-white block truncate">
                Academic Trainer Portal
              </span>
              <span className="text-[11px] text-slate-400 block -mt-0.5 truncate">
                Trainer Workspace
              </span>
            </div>
          </div>

          
        </div>

        {/* Navigation Items (auto-close on click) */}
        <nav className="portal-sidebar-nav flex-1 px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={(event) => handleNavigation(event, item.path)}
                className={({ isActive }) =>
                  `portal-nav-link flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                  <span className="whitespace-nowrap tracking-tight">{item.name}</span>
                </div>

                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500 text-white font-mono-numbers shrink-0 shadow-xs">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Free Hours & Admin Task Widget */}
        {pendingAdminTasksCount > 0 && (
          <div className="mx-3 mb-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
            <div className="flex items-center justify-between text-indigo-400 font-semibold mb-1">
              <span className="flex items-center gap-1">
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Admin Tasks</span>
              </span>
              <span className="px-1 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono-numbers text-[10px]">
                {pendingAdminTasksCount} Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Assigned during free hours on working days; never during lunch.
            </p>
          </div>
        )}

        {/* Trainer Profile Card in Footer (auto-close on click) */}
        <div className="p-3 border-t border-slate-800 shrink-0">
          <NavLink
            to="/profile"
            onClick={(event) => handleNavigation(event, '/profile')}
            title={trainer.name}
            className={({ isActive }) =>
              `portal-nav-link flex items-center gap-1 p-2.5 rounded-xl transition-colors ${
                isActive
                  ? 'bg-indigo-600/30 border border-indigo-500/40'
                  : 'bg-slate-800/60 hover:bg-slate-800'
              }`
            }
          >
            <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              {trainer.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{trainer.name}</p>
              <p className="text-[11px] text-slate-400 truncate">
                {trainer.trainerId} · {trainer.department}
              </p>
            </div>
          </NavLink>
        </div>
      </aside>
    </>
  );
};
