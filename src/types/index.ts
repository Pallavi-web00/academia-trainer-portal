export type ScheduleApprovalStatus = 'Pending' | 'Approved' | 'Change Requested';
export type SyllabusUpdateStatus = 'Updated' | 'Pending Update' | 'Class Not Conducted' | 'Not Started';
export type SessionOutcome = 'Completed' | 'Not Conducted' | 'Scheduled' | 'Rescheduled';

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  attendancePercent: number;
  email: string;
}

export interface SyllabusTopic {
  id: string;
  number: number;
  title: string;
  isCompleted: boolean;
  completedDate?: string; // YYYY-MM-DD or formatted system date
  completedSessionId?: string;
}

export interface ModuleData {
  id: string;
  code: string;
  name: string;
  batch: string;
  level: string;
  duration: string;
  totalSessions: number;
  description: string;
  topics: SyllabusTopic[];
}

export interface ScheduleItem {
  id: string;
  batchId?: string;
  moduleId: string;
  moduleName: string;
  batch: string;
  startDate: string;     // Batch Start Date (YYYY-MM-DD)
  scheduledDate: string; // Current / Anchor date (YYYY-MM-DD)
  scheduledDays: number[]; // 0: Sunday through 6: Saturday
  startTime: string;     // e.g. "09:00 AM"
  endTime: string;       // e.g. "11:00 AM"
  sessionNumber: number;
  totalSessions: number;
  roomOrLink: string;
  approvalStatus: ScheduleApprovalStatus;
  changeRequestReason?: string;
  syllabusUpdateStatus: SyllabusUpdateStatus;
  students: Student[];
  missedReason?: string;
  completedTopicIds?: string[];
}

export interface ScheduledSyllabusSession {
  id: string;
  scheduleId: string;
  batchId: string;
  moduleId: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  sessionNumber: number;
  outcome?: 'Conducted' | 'Not Conducted';
  syllabusUpdateStatus: SyllabusUpdateStatus;
}

export interface SyllabusActivityEvent {
  id: string;
  timestamp: string; // ISO date-time string
  displayDate: string;
  batchId: string;
  moduleId: string;
  moduleName: string;
  eventType:
    | 'Topic Completed'
    | 'Class Not Conducted'
    | 'MCQ Assessment Sent'
    | 'MCQ Assessment Completed'
    | 'Topic Requires Retake'
    | 'Topic Being Taken Again';
  scheduledDate?: string;
  topicId?: string;
  topicName?: string;
  topicNumber?: number;
  assessmentId?: string;
  details?: string;
  sessionId?: string;
  sessionIdentifier?: string; // e.g. "Session 12 (09:00 AM - 10:00 AM)"
  reason?: string;
  savedStatus: 'Saved' | 'Pending';
}

export interface SyllabusAssessmentQuestion {
  question: string;
  options: string[];
  correctOption: number;
}

export interface SyllabusAssessmentStudentResult {
  studentId: string;
  studentName: string;
  score: number | null;
  submittedAt?: string;
}

export type SyllabusAssessmentStatus = 'Sent' | 'In Progress' | 'Completed';

export interface SyllabusAssessment {
  id: string;
  batchId: string;
  moduleId: string;
  topicId: string;
  topicName: string;
  attempt: number;
  questions: SyllabusAssessmentQuestion[];
  students: SyllabusAssessmentStudentResult[];
  status: SyllabusAssessmentStatus;
  sentAt: string;
  completedAt?: string;
  classAgainStartedAt?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  category: 'syllabus_overdue' | 'schedule_approval' | 'examination' | 'system';
  isResolved: boolean;
  moduleId?: string;
  sessionId?: string;
  dateContext?: string;
  actionLabel?: string;
  relatedRequestId?: string;
}

export type ExaminationType = 'Theory' | 'Practical' | 'Assessment';
export type ExaminationMode = 'Offline' | 'Online';
export type ExaminationRequestStatus = 'Pending Admin Review' | 'Approved' | 'Rejected';
export type ExaminationEventStatus = 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';

export interface ExaminationEligibleStudent {
  studentId: string;
  studentName: string;
  batchName: string;
  eligibilityRemarks?: string;
}

export interface ExaminationRequest {
  id: string;
  title: string;
  batchId: string;
  batchName: string;
  moduleId: string;
  moduleName: string;
  type: ExaminationType;
  proposedDate: string;
  proposedStartTime: string;
  proposedEndTime: string;
  topicIds: string[];
  topicNames: string[];
  mode: ExaminationMode;
  venueDetails: string;
  adminInstructions: string;
  submittedAt: string;
  requestStatus: ExaminationRequestStatus;
  eventStatus: ExaminationEventStatus;
  originalRequestId?: string;
  revisionNumber?: number;
  decisionDate?: string;
  adminRemarks?: string;
  rejectionReason?: string;
  approvedDate?: string;
  approvedStartTime?: string;
  approvedEndTime?: string;
  eligibleStudents?: ExaminationEligibleStudent[];
  eligibilityRemarks?: string;
  completedAt?: string;
  cancellationReason?: string;
  scheduleChange?: {
    proposedDate: string;
    proposedStartTime: string;
    proposedEndTime: string;
    status: 'Pending Admin Review' | 'Confirmed';
    submittedAt: string;
    decisionDate?: string;
    adminRemarks?: string;
  };
}

export interface TrainerProfile {
  name: string;
  trainerId: string;
  email: string;
  department: string;
  assignedBatches: string[];
  phone: string;
  officeHours: string;
  joinedDate: string;
  designation: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

export type AdminTaskStatus = 'Pending' | 'In Progress' | 'Completed';
export type AdminTaskPriority = 'High' | 'Medium' | 'Normal';
export type AdminTaskCategory = 'Evaluation & Grading' | 'Curriculum Review' | 'Student Mentoring' | 'Lab & Infrastructure' | 'Faculty Sync';

export interface AdminTask {
  id: string;
  title: string;
  description: string;
  assignedDate: string; // YYYY-MM-DD
  startTime: string;     // e.g. "01:30 PM" (during trainer's free hours)
  endTime: string;       // e.g. "03:00 PM"
  status: AdminTaskStatus;
  priority: AdminTaskPriority;
  category: AdminTaskCategory;
  assignedBy: string;    // e.g. "Academic Administration"
  deliverables?: string;
  completionNotes?: string;
}

export interface FreeHourSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  assignedTasks: AdminTask[];
}
