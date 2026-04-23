// PDF text extraction using mehmet-kozan/pdf-parse (v2+)
import { PDFParse } from 'pdf-parse';

export async function extractFromPDF(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return cleanText(result.text);
  } finally {
    await parser.destroy();
  }
}

export function extractFromText(text: string): string {
  return cleanText(text);
}

function cleanText(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/[ \t]+/g, ' ')
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    // Remove excessive blank lines (keep max 2)
    .replace(/\n{3,}/g, '\n\n')
    // Remove page numbers (common patterns)
    .replace(/^\s*\d+\s*$/gm, '')
    // Remove common headers/footers
    .replace(/^(page|pg\.?)\s*\d+/gim, '')
    .trim();
}
