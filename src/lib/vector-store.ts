import Chunk from '@/lib/models/Chunk';
import connectDB from '@/lib/db';

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface SearchResult {
  chunkId: string;
  documentId: string;
  topicId: string | null;
  content: string;
  heading: string;
  score: number;
}

export async function searchSimilarChunks(
  queryEmbedding: number[],
  topK: number = 5,
  documentId?: string
): Promise<SearchResult[]> {
  await connectDB();

  // Build query filter
  const filter: Record<string, unknown> = { embedding: { $exists: true, $ne: [] } };
  if (documentId) {
    filter.documentId = documentId;
  }

  // Fetch chunks with embeddings
  const chunks = await Chunk.find(filter).lean();

  // Calculate similarity for each chunk
  const scored = chunks.map((chunk) => ({
    chunkId: String(chunk._id),
    documentId: String(chunk.documentId),
    topicId: chunk.topicId ? String(chunk.topicId) : null,
    content: chunk.content,
    heading: chunk.heading || '',
    score: cosineSimilarity(queryEmbedding, chunk.embedding as number[]),
  }));

  // Sort by score descending and return top K
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export async function searchByTopic(
  queryEmbedding: number[],
  topicId: string,
  topK: number = 5
): Promise<SearchResult[]> {
  await connectDB();

  const chunks = await Chunk.find({
    topicId,
    embedding: { $exists: true, $ne: [] },
  }).lean();

  const scored = chunks.map((chunk) => ({
    chunkId: String(chunk._id),
    documentId: String(chunk.documentId),
    topicId: chunk.topicId ? String(chunk.topicId) : null,
    content: chunk.content,
    heading: chunk.heading || '',
    score: cosineSimilarity(queryEmbedding, chunk.embedding as number[]),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
