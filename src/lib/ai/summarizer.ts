import { generateCompletion, generateEmbedding } from '@/lib/gemini';
import { searchSimilarChunks } from '@/lib/vector-store';
import connectDB from '@/lib/db';
import Chunk from '@/lib/models/Chunk';
import Topic from '@/lib/models/Topic';

export async function generateDocumentSummary(documentId: string): Promise<string> {
  await connectDB();

  const chunks = await Chunk.find({ documentId }).sort({ chunkIndex: 1 }).lean();
  const content = chunks.map((c) => c.content).join('\n\n');

  const systemPrompt = `You are a study assistant. Create a comprehensive but concise summary of the following study material. Organize by topics, highlight key concepts, and include important definitions.

Format:
- Use clear headings
- Bullet points for key concepts
- Bold important terms
- Keep it concise but complete`;

  return generateCompletion(systemPrompt, `Summarize this study material:\n\n${content.substring(0, 8000)}`, 0.5);
}

export async function generateTopicSummary(topicId: string): Promise<string> {
  await connectDB();

  const topic = await Topic.findById(topicId);
  if (!topic) throw new Error('Topic not found');

  const chunks = await Chunk.find({ topicId }).sort({ chunkIndex: 1 }).lean();
  const content = chunks.map((c) => c.content).join('\n\n');

  const systemPrompt = `You are a study assistant. Create a focused summary of the topic "${topic.name}". Include:
- Key concepts and definitions
- Important relationships between ideas
- Common misconceptions
- Quick review points

Be concise but educational.`;

  return generateCompletion(systemPrompt, content.substring(0, 6000), 0.5);
}

export async function chatWithNotes(
  question: string,
  documentId?: string
): Promise<{ answer: string; sources: string[] }> {
  await connectDB();

  // RAG: find relevant chunks
  const queryEmbedding = await generateEmbedding(question);
  const relevantChunks = await searchSimilarChunks(queryEmbedding, 5, documentId);

  const context = relevantChunks.map((c, i) => `[Source ${i + 1}] ${c.content}`).join('\n\n');
  const sources = relevantChunks.map((c) => c.heading || c.content.substring(0, 80));

  const systemPrompt = `You are a knowledgeable study tutor. Answer the student's question using ONLY the provided study material. If the answer is not in the material, say so.

Reference specific parts of the material in your answer. Be educational and clear.`;

  const userPrompt = `Study Material:
${context}

Student's Question: ${question}`;

  const answer = await generateCompletion(systemPrompt, userPrompt, 0.5);
  return { answer, sources };
}
