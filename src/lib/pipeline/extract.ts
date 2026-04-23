// PDF text extraction using pdf-parse
// @ts-ignore - pdf-parse has broken types
import pdfParse from 'pdf-parse';
// @ts-ignore - pdf-parse types are broken
const parse = pdfParse as any;

export async function extractFromPDF(buffer: Buffer): Promise<string> {
  const data = await parse(buffer);
  return cleanText(data.text);
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
