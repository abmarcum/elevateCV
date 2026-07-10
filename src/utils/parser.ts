import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export async function parseResumeFile(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    return data.text || '';
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
