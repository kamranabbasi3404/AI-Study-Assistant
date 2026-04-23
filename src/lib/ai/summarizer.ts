import { generateCompletion, generateEmbedding } from '@/lib/gemini';
import { searchSimilarChunks } from '@/lib/vector-store';
import connectDB from '@/lib/db';
import Chunk from '@/lib/models/Chunk';
import Topic from '@/lib/models/Topic';

export async function generateDocumentSummary(documentId: string, userId: string): Promise<string> {
  await connectDB();

  const chunks = await Chunk.find({ userId, documentId }).sort({ chunkIndex: 1 }).lean();
  const content = chunks.map((c) => c.content).join('\n\n');

  const systemPrompt = `You are a study assistant. Create a comprehensive but concise summary of the following study material. Organize by topics, highlight key concepts, and include important definitions.

Format:
- Use clear headings
- Bullet points for key concepts
- Bold important terms
- Keep it concise but complete`;

  return generateCompletion(systemPrompt, `Summarize this study material:\n\n${content.substring(0, 8000)}`, 0.5);
}

export async function generateTopicSummary(topicId: string, userId: string): Promise<string> {
  await connectDB();

  const topic = await Topic.findOne({ _id: topicId, userId });
  if (!topic) throw new Error('Topic not found');

  const chunks = await Chunk.find({ userId, topicId }).sort({ chunkIndex: 1 }).lean();
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
  userId: string,
  documentId?: string
): Promise<{ answer: string; sources: string[] }> {
  await connectDB();

  // RAG: find relevant chunks
  const queryEmbedding = await generateEmbedding(question);
  const relevantChunks = await searchSimilarChunks(queryEmbedding, userId, 5, documentId);

  const context = relevantChunks.map((c, i) => `[Source ${i + 1}] ${c.content}`).join('\n\n');
  const sources = relevantChunks.map((c) => c.heading || c.content.substring(0, 80));

  // Fetch topics metadata to provide context
  const { default: Topic } = await import('@/lib/models/Topic');
  const topicQuery = documentId ? { userId, documentId } : { userId };
  const topics = await Topic.find(topicQuery).lean();
  const topicsContext = topics.length > 0 
    ? `Metadata - Available Topics in Notes: ${topics.map(t => t.name).join(', ')}\n\n`
    : '';

  const systemPrompt = `You are a strict, restricted AI study tutor. You MUST ONLY answer questions based on the provided Study Material (which includes metadata and extracted text chunks).

CRITICAL RULES:
1. If the user asks a general knowledge question, a personal question, or ANY question whose answer is NOT found in or cannot be deduced from the provided Study Material, you MUST refuse to answer.
2. If refusing, use this exact phrase: "I can only answer questions related to your study material. This question is out of bounds."
3. DO NOT use your general knowledge to fill in gaps.
4. You ARE ALLOWED to summarize, explain, or categorize the provided material if asked (e.g. explaining which topics are hard/easy based on your analysis of the names).
5. Reference specific parts of the material in your answer. Be educational and clear.`;

  const userPrompt = `Study Material:
${topicsContext}${context}

Student's Question: ${question}`;

  const answer = await generateCompletion(systemPrompt, userPrompt, 0.5);
  return { answer, sources };
}
