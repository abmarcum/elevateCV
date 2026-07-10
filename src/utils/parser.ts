import { extractText } from 'unpdf';
import mammoth from 'mammoth';

export async function parseResumeFile(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    const { text } = await extractText(new Uint8Array(buffer));
    return Array.isArray(text) ? text.join('\n') : (text || '');
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword' ||
    mimeType.includes('officedocument.wordprocessingml')
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } else if (mimeType.startsWith('text/') || mimeType === 'application/octet-stream') {
    // Treat as plain text
    return buffer.toString('utf-8');
  } else {
    // Fallback: try to read as plain text
    return buffer.toString('utf-8');
  }
}
