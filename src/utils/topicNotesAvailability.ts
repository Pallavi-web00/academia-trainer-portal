import { TopicNotesAvailabilityStatus } from '../types';

export function getTopicNotesAvailabilityStatus(
  topicCompleted: boolean,
  notesUploaded: boolean
): TopicNotesAvailabilityStatus {
  if (!topicCompleted) return 'Notes Locked';
  return notesUploaded ? 'Notes Uploaded' : 'Notes Pending';
}
