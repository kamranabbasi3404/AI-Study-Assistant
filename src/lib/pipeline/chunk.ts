export interface ChunkResult {
  chunks: string[];
  headings: string[];
}

// Rough token count (1 token ≈ 4 chars for English)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function detectHeading(line: string): string | null {
  // Detect markdown-style headings
  const mdMatch = line.match(/^#{1,3}\s+(.+)/);
  if (mdMatch) return mdMatch[1].trim();

  // Detect ALL CAPS headings (likely section titles)
  if (line.length > 3 && line.length < 100 && line === line.toUpperCase() && /[A-Z]/.test(line)) {
    return line.trim();
  }

  // Detect numbered headings like "1. Introduction" or "1.1 Overview"
  const numberedMatch = line.match(/^\d+(\.\d+)*\.?\s+[A-Z].{2,}/);
  if (numberedMatch && line.length < 100) return line.trim();

  return null;
}

export function chunkText(
  text: string,
  maxTokens: number = 400,
  overlapFraction: number = 0.1
): ChunkResult {
  const lines = text.split('\n');
  const chunks: string[] = [];
  const headings: string[] = [];

  let currentChunk = '';
  let currentHeading = '';
  let currentTokens = 0;


  for (const line of lines) {
    const lineTokens = estimateTokens(line);
    const heading = detectHeading(line);

    if (heading) {
      // Save current chunk if it has content
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        headings.push(currentHeading);
      }
      currentHeading = heading;
      currentChunk = line + '\n';
      currentTokens = lineTokens;
      continue;
    }

    // Check if adding this line would exceed max tokens
    if (currentTokens + lineTokens > maxTokens && currentChunk.trim()) {
      chunks.push(currentChunk.trim());
      headings.push(currentHeading);

      // Create overlap: take the last portion of the current chunk
      const words = currentChunk.split(/\s+/);
      const overlapWords = Math.floor(words.length * overlapFraction);
      const overlap = words.slice(-overlapWords).join(' ');

      currentChunk = overlap + '\n' + line + '\n';
      currentTokens = estimateTokens(currentChunk);
    } else {
      currentChunk += line + '\n';
      currentTokens += lineTokens;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
    headings.push(currentHeading);
  }

  return { chunks, headings };
}
