import { TrainerProfile } from '../types';

/**
 * Configurable Trainer Profile Mock Data
 * Working days: Monday – Saturday
 * Working hours: 09:00 AM – 06:00 PM
 * Lunch hour: 01:00 PM – 02:00 PM
 * Non-overlapping cohorts:
 * - MWF and TTS morning batches (09:00 AM - 11:00 AM, on separate days)
 * - Everyday Batch (11:00 AM - 01:00 PM)
 * - MWF and TTS afternoon batches (02:00 PM - 04:00 PM, on separate days)
 */
export const trainerProfile: TrainerProfile = {
  name: 'Priyanka',
  trainerId: 'SA101',
  email: 'priyanka@gmail.com',
  department: 'AI',
  designation: 'Senior Technical Lead & AI Faculty',
  phone: '+91 98765 43210',
  officeHours: 'Mon - Sat: 09:00 AM - 06:00 PM (Lunch: 01:00 PM - 02:00 PM)',
  joinedDate: 'August 2022',
  assignedBatches: [
    'MWF (09:00 AM - 11:00 AM)',
    'TTS (09:00 AM - 11:00 AM)',
    'Everyday (11:00 AM - 01:00 PM)',
    'MWF Afternoon (02:00 PM - 04:00 PM)',
    'TTS Afternoon (02:00 PM - 04:00 PM)'
  ]
};
