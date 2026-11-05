import { TopicNotesMetadata } from '../types';

export interface StoredTopicNotes {
  id: string;
  notesId: string;
  metadata: TopicNotesMetadata;
  file: Blob;
}

const DATABASE_NAME = 'academia-trainer-topic-notes';
const DATABASE_VERSION = 1;
const STORE_NAME = 'topic-notes';

const configuredLimitMb = Number(import.meta.env.VITE_TOPIC_NOTES_MAX_FILE_SIZE_MB);
export const MAX_TOPIC_NOTES_FILE_SIZE_BYTES =
  Number.isFinite(configuredLimitMb) && configuredLimitMb > 0
    ? configuredLimitMb * 1024 * 1024
    : 10 * 1024 * 1024;

const MIME_TYPES_BY_EXTENSION: Record<string, string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation']
};

export function getTopicNotesFileValidationError(file: File): string | undefined {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const expectedMimeTypes = MIME_TYPES_BY_EXTENSION[extension];
  if (!expectedMimeTypes) return 'Choose a PDF, DOC, DOCX, PPT, or PPTX file.';
  if (file.type && file.type !== 'application/octet-stream' && !expectedMimeTypes.includes(file.type)) {
    return 'The selected file type does not match its file extension.';
  }
  if (file.size === 0) return 'The selected file is empty. Choose a file with content.';
  if (file.size > MAX_TOPIC_NOTES_FILE_SIZE_BYTES) {
    const limitMb = MAX_TOPIC_NOTES_FILE_SIZE_BYTES / (1024 * 1024);
    return `The file exceeds the ${Number.isInteger(limitMb) ? limitMb : limitMb.toFixed(1)} MB size limit.`;
  }
  return undefined;
}

export const createTopicNotesId = (moduleId: string, topicId: string) =>
  JSON.stringify([moduleId, topicId]);

export const createTopicNotesReleaseId = (batchId: string, moduleId: string, topicId: string) =>
  JSON.stringify([batchId, moduleId, topicId]);

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('This browser does not support local file storage.'));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open local notes storage.'));
    request.onblocked = () => reject(new Error('Local notes storage is blocked by another browser tab.'));
  });
}

export async function saveTopicNotes(metadata: TopicNotesMetadata, file: Blob): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put({
        id: metadata.storageReference,
        notesId: metadata.id,
        metadata,
        file
      } satisfies StoredTopicNotes);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Unable to save the notes file.'));
      transaction.onabort = () => reject(transaction.error || new Error('Saving the notes file was cancelled.'));
    });
  } finally {
    database.close();
  }
}

export async function getAllTopicNotes(): Promise<TopicNotesMetadata[]> {
  const database = await openDatabase();

  try {
    return await new Promise<TopicNotesMetadata[]>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => {
        const records = request.result as Partial<StoredTopicNotes>[];
        const latestMetadata = new Map<string, TopicNotesMetadata>();
        records.forEach((record) => {
          if (!record.metadata || !record.notesId) return;
          const current = latestMetadata.get(record.notesId);
          if (!current || record.metadata.version > current.version) {
            latestMetadata.set(record.notesId, record.metadata);
          }
        });
        resolve([...latestMetadata.values()]);
      };
      request.onerror = () => reject(request.error || new Error('Unable to read saved notes.'));
    });
  } finally {
    database.close();
  }
}

export async function getTopicNotesFile(storageReference: string): Promise<Blob | undefined> {
  const database = await openDatabase();

  try {
    return await new Promise<Blob | undefined>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(storageReference);
      request.onsuccess = () => resolve((request.result as StoredTopicNotes | undefined)?.file);
      request.onerror = () => reject(request.error || new Error('Unable to retrieve the saved notes file.'));
    });
  } finally {
    database.close();
  }
}

export async function clearAllTopicNotes(): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Unable to clear saved notes.'));
      transaction.onabort = () => reject(transaction.error || new Error('Clearing saved notes was cancelled.'));
    });
  } finally {
    database.close();
  }
}
