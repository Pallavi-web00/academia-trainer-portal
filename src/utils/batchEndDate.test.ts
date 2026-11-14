import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateBatchEndDate, getBatchEndDate } from './batchEndDate';
import { getInitialSchedules } from '../data/scheduleData';

describe('batch end date calculation', () => {
  const schedules = getInitialSchedules();

  it('calculates the final topic session for MWF, TTS, and Everyday schedules', () => {
    const expectations = [
      { id: 'batch-mwf', topicCount: 40, weekday: [1, 3, 5], expectedEndDate: '2026-12-02' },
      { id: 'batch-tts', topicCount: 40, weekday: [2, 4, 6], expectedEndDate: '2026-12-15' },
      { id: 'batch-daily', topicCount: 40, weekday: [1, 2, 3, 4, 5, 6], expectedEndDate: '2026-10-16' }
    ];

    expectations.forEach(({ id, topicCount, weekday, expectedEndDate }) => {
      const schedule = schedules.find((item) => item.id === id);
      assert.ok(schedule);

      const endDate = calculateBatchEndDate(schedule, topicCount);
      assert.ok(endDate);
      assert.equal(endDate, expectedEndDate);
      const end = new Date(`${endDate}T00:00:00`);
      assert.equal(weekday.includes(end.getDay()), true);
      let countedSessions = 0;
      const date = new Date(`${schedule.startDate}T00:00:00`);
      while (date <= end) {
        if (schedule.scheduledDays.includes(date.getDay()) && date.getDay() !== 0) countedSessions += 1;
        date.setDate(date.getDate() + 1);
      }
      assert.equal(countedSessions, topicCount);
    });
  });

  it('includes a scheduled start date and starts on the next class day otherwise', () => {
    const mwf = schedules.find((item) => item.id === 'batch-mwf');
    assert.ok(mwf);
    assert.equal(calculateBatchEndDate({ ...mwf, startDate: '2026-09-02' }, 1), '2026-09-02');
    assert.equal(calculateBatchEndDate({ ...mwf, startDate: '2026-09-06' }, 1), '2026-09-07');
  });

  it('recalculates when start date or topic count changes and handles leap years', () => {
    const tts = schedules.find((item) => item.id === 'batch-tts');
    assert.ok(tts);
    const originalEnd = calculateBatchEndDate({ ...tts, startDate: '2024-02-27' }, 3);
    assert.equal(originalEnd, '2024-03-02');
    assert.notEqual(calculateBatchEndDate({ ...tts, startDate: '2024-02-27' }, 4), originalEnd);
  });

  it('never counts Sundays and preserves a frozen completed-batch date', () => {
    const everyday = schedules.find((item) => item.id === 'batch-daily');
    assert.ok(everyday);
    const endDate = calculateBatchEndDate(
      { ...everyday, scheduledDays: [0, 1, 2, 3, 4, 5, 6] },
      6
    );
    assert.ok(endDate);
    assert.notEqual(new Date(`${endDate}T00:00:00`).getDay(), 0);

    const completed = { ...everyday, historicalEndDate: '2026-10-15' };
    assert.equal(getBatchEndDate(completed, 100), '2026-10-15');
  });

  it('returns no date for invalid or empty schedules', () => {
    const schedule = schedules[0];
    assert.equal(calculateBatchEndDate({ ...schedule, startDate: '2026-02-30' }, 2), undefined);
    assert.equal(calculateBatchEndDate({ ...schedule, scheduledDays: [0] }, 2), undefined);
    assert.equal(calculateBatchEndDate(schedule, 0), undefined);
  });
});
