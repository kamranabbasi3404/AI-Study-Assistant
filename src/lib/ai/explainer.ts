import { generateCompletion, generateEmbedding } from '@/lib/gemini';
import { searchSimilarChunks } from '@/lib/vector-store';
import connectDB from '@/lib/db';
import Question from '@/lib/models/Question';

export async function generateExplanation(
  questionId: string,
  userAnswer: string,
  userId: string
): Promise<string> {
  await connectDB();

  const question = await Question.findOne({ _id: questionId, userId });
  if (!question) throw new Error('Question not found');

  // RAG: find relevant content to ground the explanation
  const queryEmbedding = await generateEmbedding(question.question);
  const relevantChunks = await searchSimilarChunks(
    queryEmbedding,
    userId,
    3,
    String(question.documentId)
  );

  const context = relevantChunks.map((c) => c.content).join('\n\n');

  const systemPrompt = `You are a patient, encouraging tutor. Explain why the student's answer is wrong and what the correct answer is. Use the provided study content as reference.

Be concise but thorough. Use analogies when helpful. Don't be condescending.`;

  const userPrompt = `Question: ${question.question}
Student's Answer: ${userAnswer}
Correct Answer: ${question.correctAnswer}

Reference Content:
${context}

Explain why the correct answer is right and where the student went wrong.`;

  return generateCompletion(systemPrompt, userPrompt, 0.5);
}
