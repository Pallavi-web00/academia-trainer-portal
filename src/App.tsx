import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { TrainerProvider, useTrainer } from './context/TrainerContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ToastContainer } from './components/common/Toast';
import { Dashboard } from './pages/Dashboard';
import { MyClassSchedule } from './pages/MyClassSchedule';
import { SyllabusTracker } from './pages/SyllabusTracker';
import { SessionHistory } from './pages/SessionHistory';
import { Notifications } from './pages/Notifications';
import { Profile } from './pages/Profile';
import { Examinations } from './pages/Examinations';

const AppLayout: React.FC = () => {
  // The rolled-mat navigation starts closed on every page load.
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { toasts, removeToast } = useTrainer();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Floating rolled-mat navigation */}
      <Sidebar
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* Main Content Area - Expands to 100% Full Available Width */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <Header
          onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
          isDrawerOpen={isDrawerOpen}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <div key={location.pathname} className="page-enter">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/schedule" element={<MyClassSchedule />} />
              <Route path="/syllabus" element={<SyllabusTracker />} />
              <Route path="/history" element={<SessionHistory />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/examinations" element={<Examinations />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Interactive Toast Alerts */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default function App() {
  return (
    <TrainerProvider>
      <HashRouter>
        <AppLayout />
      </HashRouter>
    </TrainerProvider>
  );
}
