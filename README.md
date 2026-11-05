# Academia Trainer Portal (React + Vite)

A professional, responsive academic portal exclusively for faculty members to manage assigned class schedules, approve or request changes to schedules, record syllabus completion, log session outcomes (including classes not conducted), view session archives, and manage pending reminders.

Built strictly as an interactive frontend with clean mock data architecture, ready for future administrative software integration.

---

## 🚀 Key Rules & Architecture

1. **Focused Curriculum**
   - Exclusively configured for **Advanced Python & Database foundation** (all 40 admin-defined topics).
2. **Batch Naming & Start Date Rules (One Batch = One Row)**
   - In **My Class Schedule**, the date column displays the **Start Date of the batch**.
   - No duplicate rows for the same batch across multiple dates: **one batch, one row, one start date**.
   - Batch identification follows institutional schedule rules:
     - **MWF**: Classes conducted on Monday, Wednesday, and Friday (`09:00 AM – 11:00 AM`).
     - **TTS**: Classes conducted on Tuesday, Thursday, and Saturday (`11:30 AM – 01:30 PM`).
     - **All Days of the Week**: No label mentioned, displays just the timings (`03:30 PM – 05:30 PM`).
3. **Strict Non-Overlapping Batch Timings**
   - The trainer cannot have different batches scheduled at the same time.
   - Different batches run at distinct non-overlapping timings:
     - `09:00 AM – 11:00 AM` (MWF)
     - `11:30 AM – 01:30 PM` (TTS)
     - `03:30 PM – 05:30 PM` (All days)
4. **Faculty Free Hours & Admin-Assigned Tasks**
   - Dedicated free hours exist between scheduled teaching batches (e.g., `11:00–11:30 AM`, `01:30–03:30 PM`, `05:30–06:30 PM`).
   - During these free hours, administrators assign evaluation, student mentoring, and lab tasks.
   - The portal features interactive tracking where trainers can start tasks, log notes, and mark assignments complete.
5. **Collapsible Sidebar**
   - On desktop, the sidebar can be collapsed into a compact icon rail (or expanded to full width) via the toggle button at the bottom of the sidebar or in the top navigation bar.
6. **Topic-Wise Notes**
   - Trainers prepare one notes document per assigned module/topic; each batch unlocks it independently after every student scores above 75% and topic completion is saved.
   - Notes files and their version history are retained in browser IndexedDB for this frontend demonstration, not uploaded to a remote server.
   - The maximum upload size is configurable with `VITE_TOPIC_NOTES_MAX_FILE_SIZE_MB` (10 MB by default).

---

## 🧭 Navigation & Pages

- **Dashboard**:
  - Live summary cards: Today's Classes, Free Hours & Admin Tasks, Pending Approvals, and Syllabus Pending.
  - Today's non-overlapping batch schedules and interactive admin task manager.
  - Pending overdue reminders list.
- **My Class Schedule**:
  - One row per batch showing: **Subject / Module**, **Students (clickable)**, **Date (Batch Start Date)**, **Batch (MWF / TTS / Timings)**, **Batch Timings**, **Session**, **Status**, and **Actions**.
  - Daily Timeline & Free Hours view demonstrating that batches never overlap.
  - View details, approve schedules, and request changes with mandatory justification.
- **Syllabus Tracker**:
  - 40-topic curriculum checklist.
  - Automatically completes a topic for a batch after all students finish the MCQ assessment and each scores above 75%.
  - Retests target students who have not yet earned a qualifying score; existing passing results are retained.
  - Completion timestamps, batch-specific progress, Syllabus Activity History, and completion notifications update automatically.
  - "Class Not Conducted" flow with single/multi-session handling.
  - MCQ assessment tracking and batch-specific notes availability.
  - Syllabus Activity History (newest first).
- **Examinations**:
  - Shows mock Admin-published, batch/module-specific component schedules and approved eligible students.
  - Includes a seeded Everyday sample: 6 eligible students, Theory on 10 Nov 2026, Practical on 12 Nov 2026, and Project on 15 Nov 2026; marks entry opens at the Theory start time.
  - Opens marks entry from the earliest scheduled component date/time; partial drafts and final submissions are stored in browser localStorage.
  - Requires marks for every eligible student and every scheduled component before final submission; submitted marks are read-only.
  - Schedule and marks notifications are mock handoffs only; no external Admin service or persistent backend is connected.
- **Notes Management**:
  - Assigned-module topic list with upload and document-replacement actions.
  - Central topic-wise notes with automatic, batch-specific release after successful assessment and saved topic completion.
- **Session History**:
  - Comprehensive archive of completed, missed, and scheduled sessions.
  - Filters by Batch, Outcome, and Date Range.
- **Notifications**:
  - Real-time simulated overdue syllabus alerts and schedule notices.
- **Profile**:
  - Faculty credentials for **Priyanka** (Trainer ID: SA101, Department: AI).
  - Assigned batch summaries and one-click mock data reset.

---

## 🛠️ Where to Add or Edit Mock Data

All mock data is isolated from the UI components in `/src/data/`:

| Data File | Description & Contents |
| :--- | :--- |
| `src/data/trainerData.ts` | Trainer profile information (`Priyanka`, ID: `SA101`, Department: `AI`, email: `priyanka@gmail.com`, assigned non-overlapping batches: MWF, TTS, 03:30–05:30 PM). |
| `src/data/modulesData.ts` | Complete 40-topic curriculum for *Advanced Python & Database foundation*. |
| `src/data/scheduleData.ts` | Non-overlapping batch schedules with start dates, student rosters, admin-assigned tasks during free hours, and activity events. |
