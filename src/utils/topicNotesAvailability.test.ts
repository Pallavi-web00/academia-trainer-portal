import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getTopicNotesAvailabilityStatus } from './topicNotesAvailability';

describe('batch-specific topic notes availability', () => {
  it('shows uploaded notes for a completed topic when its notes file exists', () => {
    assert.equal(getTopicNotesAvailabilityStatus(true, true), 'Notes Uploaded');
  });

  it('keeps an incomplete topic locked even when notes exist', () => {
    assert.equal(getTopicNotesAvailabilityStatus(false, true), 'Notes Locked');
  });

  it('keeps a completed topic pending when no notes file exists', () => {
    assert.equal(getTopicNotesAvailabilityStatus(true, false), 'Notes Pending');
  });
});
