import { ScheduleItem, Student } from '../types';

const STUDENT_ID_YEAR = 2026;
const STUDENT_ID_PREFIX = `STU-${STUDENT_ID_YEAR}-`;
const ADMISSION_NUMBER_PREFIX = `ADM-${STUDENT_ID_YEAR}-`;

export function isStandardStudentId(value?: string | null): boolean {
  return typeof value === 'string' && /^STU-\d{4}-\d{4}$/i.test(value.trim());
}

export function isStandardAdmissionNumber(value?: string | null): boolean {
  return typeof value === 'string' && /^ADM-\d{4}-\d{4}$/i.test(value.trim());
}

export function normalizeStudentId(value?: string | null, fallbackNumber?: number): string {
  if (typeof value === 'string' && isStandardStudentId(value)) {
    return value.trim();
  }

  const numeric = Number(fallbackNumber ?? value?.match(/\d+/)?.[0] ?? 1000);
  return `${STUDENT_ID_PREFIX}${String(Math.max(1001, Number.isFinite(numeric) ? numeric : 1001)).padStart(4, '0')}`;
}

export function generateStudentId(existingIds: string[] = []): string {
  let highest = 1000;

  for (const id of existingIds) {
    if (!isStandardStudentId(id)) continue;
    const numericValue = Number(id.split('-').at(-1));
    if (Number.isFinite(numericValue)) {
      highest = Math.max(highest, numericValue);
    }
  }

  return `${STUDENT_ID_PREFIX}${String(highest + 1).padStart(4, '0')}`;
}

export function generateAdmissionNumber(existingNumbers: string[] = []): string {
  let highest = 0;

  for (const value of existingNumbers) {
    if (!isStandardAdmissionNumber(value)) continue;
    const numericValue = Number(value.split('-').at(-1));
    if (Number.isFinite(numericValue)) {
      highest = Math.max(highest, numericValue);
    }
  }

  return `${ADMISSION_NUMBER_PREFIX}${String(highest + 1).padStart(4, '0')}`;
}

export function normalizeStudentList(students: Student[] = []): { students: Student[]; idMap: Map<string, string> } {
  const idMap = new Map<string, string>();
  const studentByIdentity = new Map<string, { id: string; admissionNumber: string }>();
  const usedStudentIds = new Set<string>();
  const usedAdmissionNumbers = new Set<string>();
  const normalized: Student[] = [];

  for (const student of students) {
    const rawId = student.id || '';
    const rawRollNumber = student.rollNumber || '';
    const normalizedName = (student.fullName || student.name).trim().toLocaleLowerCase();
    const candidateId = [rawId, rawRollNumber].find(isStandardStudentId);
    const identityKey = `${(candidateId || rawId || rawRollNumber).trim().toUpperCase()}|${normalizedName}`;
    const existingIdentity = studentByIdentity.get(identityKey);
    const finalId = existingIdentity?.id || (() => {
      const preferredId = candidateId?.trim().toUpperCase();
      const id = preferredId && !usedStudentIds.has(preferredId)
        ? preferredId
        : generateStudentId([...usedStudentIds]);
      usedStudentIds.add(id);
      return id;
    })();
    const admissionNumber = existingIdentity?.admissionNumber || (() => {
      const preferredNumber = student.admissionNumber?.trim().toUpperCase();
      const number = preferredNumber &&
        isStandardAdmissionNumber(preferredNumber) &&
        !usedAdmissionNumbers.has(preferredNumber)
        ? preferredNumber
        : generateAdmissionNumber([...usedAdmissionNumbers]);
      usedAdmissionNumbers.add(number);
      return number;
    })();
    studentByIdentity.set(identityKey, { id: finalId, admissionNumber });

    const result: Student = {
      ...student,
      id: finalId,
      rollNumber: finalId,
      name: student.name,
      email: student.email,
      attendancePercent: Number.isFinite(student.attendancePercent) ? student.attendancePercent : 0,
      admissionNumber
    };

    [rawId, rawRollNumber].filter(Boolean).forEach((legacyId) => {
      if (!idMap.has(legacyId)) idMap.set(legacyId, finalId);
    });

    normalized.push(result);
  }

  return { students: normalized, idMap };
}

function addSampleProfileData(student: Student, batchName: string, admissionDate: string): Student {
  const sequence = Math.max(0, Number(student.id.match(/\d+$/)?.[0] ?? 1001) - 1001);
  const [firstName, ...nameParts] = student.name.trim().split(/\s+/).filter(Boolean);
  const lastName = nameParts.at(-1) || firstName || 'Student';
  const mobileSuffix = String(10_000_000 + ((sequence * 7919) % 89_999_999)).padStart(8, '0');
  const qualificationSamples = ['B.Tech Computer Science', 'BCA', 'B.Sc Computer Science', 'BBA'];

  return {
    ...student,
    dateOfBirth: student.dateOfBirth || `${2000 + (sequence % 6)}-${String((sequence % 12) + 1).padStart(2, '0')}-${String(((sequence * 3) % 27) + 1).padStart(2, '0')}`,
    gender: student.gender || (sequence % 2 === 0 ? 'Male' : 'Female'),
    contactNumber: student.contactNumber || `+91 98${mobileSuffix}`,
    address: student.address || `${10 + ((sequence * 13) % 90)}, ${['Anna Nagar', 'T Nagar', 'Velachery', 'Adyar', 'Mylapore'][sequence % 5]}, Chennai, Tamil Nadu`,
    guardianName: student.guardianName || `Mr. ${lastName} ${firstName || ''}`.trim(),
    guardianContactNumber: student.guardianContactNumber || `+91 97${String(10_000_000 + ((sequence * 6151) % 89_999_999)).padStart(8, '0')}`,
    qualification: student.qualification || qualificationSamples[sequence % qualificationSamples.length],
    batchName: student.batchName || batchName,
    admissionDate: student.admissionDate || admissionDate
  };
}

export function normalizeScheduleStudentIds(schedules: ScheduleItem[] = []): { schedules: ScheduleItem[]; idMap: Map<string, string> } {
  const idMap = new Map<string, string>();
  const studentByIdentity = new Map<string, { id: string; admissionNumber: string }>();
  const usedStudentIds = new Set<string>();
  const usedAdmissionNumbers = new Set<string>();

  const normalizedSchedules = schedules.map((schedule) => {
    const students = schedule.students.map((student) => {
      const rawId = student.id || '';
      const rawRollNumber = student.rollNumber || '';
      const normalizedName = (student.fullName || student.name).trim().toLocaleLowerCase();
      const candidateId = [rawId, rawRollNumber].find(isStandardStudentId);
      const identityKey = `${(candidateId || rawId || rawRollNumber).trim().toUpperCase()}|${normalizedName}`;
      const existingIdentity = studentByIdentity.get(identityKey);

      const studentId = existingIdentity?.id || (() => {
        const preferredId = candidateId?.trim().toUpperCase();
        const id = preferredId && !usedStudentIds.has(preferredId)
          ? preferredId
          : generateStudentId([...usedStudentIds]);
        usedStudentIds.add(id);
        return id;
      })();
      const admissionNumber = existingIdentity?.admissionNumber || (() => {
        const preferredNumber = student.admissionNumber?.trim().toUpperCase();
        const number = preferredNumber &&
          isStandardAdmissionNumber(preferredNumber) &&
          !usedAdmissionNumbers.has(preferredNumber)
          ? preferredNumber
          : generateAdmissionNumber([...usedAdmissionNumbers]);
        usedAdmissionNumbers.add(number);
        return number;
      })();

      studentByIdentity.set(identityKey, { id: studentId, admissionNumber });
      [rawId, rawRollNumber].filter(Boolean).forEach((legacyId) => {
        if (!idMap.has(legacyId)) idMap.set(legacyId, studentId);
      });

      return addSampleProfileData({
        ...student,
        id: studentId,
        rollNumber: studentId,
        email: student.email,
        attendancePercent: Number.isFinite(student.attendancePercent) ? student.attendancePercent : 0,
        admissionNumber
      }, schedule.batch, schedule.startDate);
    });
    return { ...schedule, students };
  });

  return { schedules: normalizedSchedules, idMap };
}

export function migrateStudentIdReferences<T extends { studentId?: string | null }>(records: T[] = [], idMap: Map<string, string>): T[] {
  return records.map((record) => {
    if (!record.studentId) return record;
    return { ...record, studentId: idMap.get(record.studentId) ?? record.studentId };
  });
}

export function getStudentDisplayName(studentName: string): string {
  const words = studentName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Student';
  return words.slice(0, 2).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

export function getStudentInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'ST';
  const initials = words.slice(0, 2).map((word) => word.charAt(0).toUpperCase());
  return initials.join('') || 'ST';
}
