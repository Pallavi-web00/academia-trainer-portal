import { AttendanceRecord, AttendanceStatus, ScheduleItem } from '../types';
import { getScheduleBatchId, parseTimeToMinutes } from '../utils/dateTimeUtils';

const institutionalHolidays = new Set(['01-26', '08-15', '10-02', '12-25']);
const lateCountsAsPresent = import.meta.env.VITE_ATTENDANCE_LATE_COUNTS_AS_PRESENT === 'true';

export const attendancePolicyDescription = lateCountsAsPresent
  ? 'Late arrivals count as attended for the percentage; Late remains a separate count.'
  : 'Late arrivals are tracked separately and excluded from present/absent attendance percentage.';

export function getAttendancePercentage(records: AttendanceRecord[]): number {
  const applicableRecords = records.filter((record) =>
    record.status === 'Present' ||
    record.status === 'Absent' ||
    (lateCountsAsPresent && record.status === 'Late')
  );
  if (applicableRecords.length === 0) return 0;
  const presentCount = applicableRecords.filter((record) =>
    record.status === 'Present' || (lateCountsAsPresent && record.status === 'Late')
  ).length;
  return Math.round((presentCount / applicableRecords.length) * 100);
}

function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTime(minutes: number): string {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function stableHash(value: string): number {
  return [...value].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 7);
}

export function createMockAttendanceRecords(
  schedules: ScheduleItem[],
  now: Date = new Date()
): AttendanceRecord[] {
  const today = localDateString(now);
  const synchronizedAt = now.toISOString();
  const records: AttendanceRecord[] = [];

  schedules.forEach((schedule) => {
    const batchId = getScheduleBatchId(schedule);
    const date = new Date(`${schedule.startDate}T00:00:00`);

    while (localDateString(date) <= today) {
      const attendanceDate = localDateString(date);
      if (schedule.scheduledDays.includes(date.getDay()) || date.getDay() === 0) {
        const monthDay = attendanceDate.slice(5);
        const isHoliday = date.getDay() === 0 || institutionalHolidays.has(monthDay);
        schedule.students.forEach((student) => {
          const seed = stableHash(`${batchId}|${student.id}|${attendanceDate}`);
          const attendanceStatus: AttendanceStatus = isHoliday
            ? 'Holiday'
            : seed % 20 < 3
              ? 'Late'
              : seed % 20 < 5
                ? 'Absent'
                : 'Present';
          const baseMinutes = parseTimeToMinutes(schedule.startTime);
          const checkInOffset = attendanceStatus === 'Late' ? 8 + (seed % 18) : seed % 8;
          const checkOutOffset = 2 + (seed % 16);
          const hasBiometricTimes = attendanceStatus === 'Present' || attendanceStatus === 'Late';

          records.push({
            id: `biometric-${batchId}-${student.id}-${attendanceDate}`,
            studentId: student.id,
            batchId,
            attendanceDate,
            status: attendanceStatus,
            ...(hasBiometricTimes
              ? {
                  checkInTime: formatTime(baseMinutes + checkInOffset),
                  checkOutTime: formatTime(parseTimeToMinutes(schedule.endTime) + checkOutOffset)
                }
              : {}),
            source: 'Biometric',
            lastSynchronizedAt: synchronizedAt
          });
        });
      }
      date.setDate(date.getDate() + 1);
    }
  });

  return records;
}
