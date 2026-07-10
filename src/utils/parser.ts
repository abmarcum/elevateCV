import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import path from 'path';

// Configure absolute worker path to resolve server-side Next.js loader errors
const workerPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
PDFParse.setWorker(workerPath);

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
