import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getNextClassDate, getRescheduledTopicDates, getTopicScheduledDates } from './topicScheduling';
import { calculateBatchEndDate } from './batchEndDate';
import { getInitialSchedules } from '../data/scheduleData';
import { SyllabusTopic } from '../types';

const topics: SyllabusTopic[] = Array.from({ length: 5 }, (_, index) => ({
  id: `topic-${index + 1}`,
  number: index + 1,
  title: `Topic ${index + 1}`,
  isCompleted: false
}));

describe('topic session scheduling', () => {
  const schedules = getInitialSchedules();

  it('assigns every topic to the expected weekly class days', () => {
    const expectations = [
      { id: 'batch-mwf', days: [1, 3, 5] },
      { id: 'batch-tts', days: [2, 4, 6] },
      { id: 'batch-daily', days: [1, 2, 3, 4, 5, 6] }
    ];

    for (const { id, days } of expectations) {
      const schedule = schedules.find((item) => item.id === id);
      assert.ok(schedule);
      const dates = getTopicScheduledDates(schedule, topics);
      assert.equal(Object.keys(dates).length, topics.length);
      for (const date of Object.values(dates)) {
        assert.ok(days.includes(new Date(`${date}T00:00:00`).getDay()));
        assert.notEqual(new Date(`${date}T00:00:00`).getDay(), 0);
      }
    }
  });

  it('starts on the start date when it is a class day and skips Sundays', () => {
    const mwf = schedules.find((item) => item.id === 'batch-mwf');
    assert.ok(mwf);
    const startOnClassDay = { ...mwf, startDate: '2026-09-07' };
    const startOnSunday = { ...mwf, startDate: '2026-09-06' };
    assert.equal(getTopicScheduledDates(startOnClassDay, topics)['topic-1'], '2026-09-07');
    assert.equal(getTopicScheduledDates(startOnSunday, topics)['topic-1'], '2026-09-07');
  });

  it('reschedules the requested and following incomplete topics while retaining completed dates', () => {
    const mwf = schedules.find((item) => item.id === 'batch-mwf');
    assert.ok(mwf);
    const schedule = { ...mwf, startDate: '2026-09-07' };
    const completedTopicIds = ['topic-1', 'topic-3'];
    const revised = getRescheduledTopicDates({
      schedule,
      topics,
      completedTopicIds,
      topicId: 'topic-2',
      rescheduledDate: '2026-09-14'
    });

    assert.ok(revised);
    assert.equal(revised['topic-1'], '2026-09-07');
    assert.equal(revised['topic-2'], '2026-09-14');
    assert.equal(revised['topic-3'], '2026-09-11');
    assert.equal(revised['topic-4'], '2026-09-16');
    assert.equal(revised['topic-5'], '2026-09-18');
  });

  it('finds the next scheduled class after the postpone-until date', () => {
    const tts = schedules.find((item) => item.id === 'batch-tts');
    assert.ok(tts);
    assert.equal(getNextClassDate(tts, '2026-09-12', false), '2026-09-15');
  });

  it('recalculates the batch end date after a topic is postponed', () => {
    const mwf = schedules.find((item) => item.id === 'batch-mwf');
    assert.ok(mwf);
    const topicsWithAdjustment = {
      ...mwf,
      startDate: '2026-09-07',
      topicScheduleAdjustments: { 'topic-2': '2026-09-14' }
    };
    const topicIds = topics.map((topic) => topic.id);
    assert.equal(calculateBatchEndDate(topicsWithAdjustment, topics.length, topicIds), '2026-09-21');
  });
});
