import { ModuleData, TopicNotesMetadata } from '../types';
import { createTopicNotesId } from '../utils/topicNotesStorage';

const encodeAscii = (value: string) => new TextEncoder().encode(value);

function createSamplePdf(topicTitle: string): Blob {
  const safeTitle = topicTitle.replace(/[^\x20-\x7e]/g, '?').replace(/[\\()]/g, '\\$&');
  const stream = `BT /F1 12 Tf 50 750 Td (Sample trainer notes: ${safeTitle}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${encodeAscii(stream).length} >>\nstream\n${stream}\nendstream`
  ];
  let document = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(encodeAscii(document).length);
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = encodeAscii(document).length;
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    document += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([document], { type: 'application/pdf' });
}

export function getInitialTopicNotes(
  module: ModuleData,
  trainerId: string
): Array<{ metadata: TopicNotesMetadata; file: Blob }> {
  const now = new Date().toISOString();
  const sampleTopicIds = ['top-2-01', 'top-2-02', 'top-2-06'];
  return sampleTopicIds.flatMap((topicId) => {
    const topic = module.topics.find((item) => item.id === topicId);
    if (!topic) return [];
    const id = createTopicNotesId(module.id, topic.id);
    const storageReference = `${id}:v1`;
    const file = createSamplePdf(topic.title);
    return [{
      metadata: {
        id,
        trainerId,
        moduleId: module.id,
        topicId: topic.id,
        fileName: `${String(topic.number).padStart(2, '0')}-${topic.title.slice(0, 32).replace(/[^a-zA-Z0-9]+/g, '-')}.pdf`,
        fileSize: file.size,
        fileType: file.type,
        storageReference,
        version: 1,
        uploadedAt: now,
        lastUpdatedAt: now
      },
      file
    }];
  });
}
