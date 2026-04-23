import connectDB from '@/lib/db';
import { extractFromPDF, extractFromText } from './extract';
import { chunkText } from './chunk';
import { detectTopics } from './topics';
import { generateEmbeddings } from '@/lib/gemini';
import DocumentModel from '@/lib/models/Document';
import Topic from '@/lib/models/Topic';
import Chunk from '@/lib/models/Chunk';

export interface ProcessingResult {
  documentId: string;
  title: string;
  topicCount: number;
  chunkCount: number;
  topics: { name: string; difficulty: string }[];
}

export async function processDocument(
  file: Buffer | string,
  filename: string,
  isText: boolean = false
): Promise<ProcessingResult> {
  await connectDB();

  // Step 1: Extract text
  const text = isText
    ? extractFromText(file as string)
    : await extractFromPDF(file as Buffer);

  if (!text || text.length < 50) {
    throw new Error('Document has insufficient text content');
  }

  // Step 2: Smart chunking
  const { chunks, headings } = chunkText(text);

  if (chunks.length === 0) {
    throw new Error('Could not extract any meaningful chunks from document');
  }

  // Step 3: Generate embeddings for all chunks
  const embeddings = await generateEmbeddings(chunks);

  // Step 4: Detect topics using AI
  const detectedTopics = await detectTopics(chunks, headings);

  // Step 5: Save document
  const title = filename.replace(/\.(pdf|txt)$/i, '').replace(/[-_]/g, ' ');
  const doc = await DocumentModel.create({
    title,
    originalFilename: filename,
    content: text,
    topicCount: detectedTopics.length,
    chunkCount: chunks.length,
  });

  // Step 6: Save topics
  const topicDocs = await Promise.all(
    detectedTopics.map((t) =>
      Topic.create({
        documentId: doc._id,
        name: t.name,
        difficultyLevel: t.difficulty,
        chunkIds: [],
      })
    )
  );

  // Step 7: Save chunks with embeddings and link to topics
  const chunkDocs = await Promise.all(
    chunks.map((content, index) => {
      // Find which topic this chunk belongs to
      const topicIndex = detectedTopics.findIndex((t) =>
        t.chunkIndices.includes(index)
      );
      const topicId = topicIndex >= 0 ? topicDocs[topicIndex]._id : null;

      return Chunk.create({
        documentId: doc._id,
        topicId,
        content,
        heading: headings[index] || '',
        chunkIndex: index,
        tokenCount: Math.ceil(content.length / 4),
        embedding: embeddings[index],
      });
    })
  );

  // Step 8: Update topics with chunk IDs
  for (let i = 0; i < topicDocs.length; i++) {
    const relatedChunkIds = chunkDocs
      .filter((c) => c.topicId && String(c.topicId) === String(topicDocs[i]._id))
      .map((c) => c._id);

    await Topic.findByIdAndUpdate(topicDocs[i]._id, {
      chunkIds: relatedChunkIds,
    });
  }

  return {
    documentId: String(doc._id),
    title: doc.title,
    topicCount: detectedTopics.length,
    chunkCount: chunks.length,
    topics: detectedTopics.map((t) => ({
      name: t.name,
      difficulty: t.difficulty,
    })),
  };
}
