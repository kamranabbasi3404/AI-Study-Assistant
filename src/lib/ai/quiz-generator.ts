import { generateCompletion, generateEmbedding } from '@/lib/gemini';
import { searchByTopic, searchSimilarChunks } from '@/lib/vector-store';
import connectDB from '@/lib/db';
import Question from '@/lib/models/Question';
import Topic from '@/lib/models/Topic';
import Document from '@/lib/models/Document';
import ReviewSchedule from '@/lib/models/ReviewSchedule';

interface QuizOptions {
  topicId: string;
  userId: string;
  count?: number;
  types?: ('mcq' | 'short_answer' | 'concept')[];
  difficulty?: 'easy' | 'medium' | 'hard';
}

export async function generateQuiz(options: QuizOptions) {
  await connectDB();
  const { topicId, userId, count = 5, types = ['mcq', 'short_answer', 'concept'], difficulty = 'medium' } = options;

  // Get topic info
  const topic = await Topic.findOne({ _id: topicId, userId }).populate('documentId');
  if (!topic) throw new Error('Topic not found');

  // RAG: retrieve relevant chunks for this topic
  let relevantChunks: any[] = [];
  try {
    const queryEmbedding = await generateEmbedding(`Identify content related to: ${topic.name}`);
    relevantChunks = await searchByTopic(queryEmbedding, userId, topicId, 10);

    if (relevantChunks.length === 0) {
      console.log('QuizGen: No specific chunks found for topic, searching whole document...');
      const docId = topic.documentId && typeof topic.documentId === 'object' && '_id' in topic.documentId 
        ? String(topic.documentId._id) 
        : String(topic.documentId);
      relevantChunks = await searchSimilarChunks(queryEmbedding, userId, 15, docId);
    }
  } catch (e) {
    console.error('QuizGen: Vector search failed, falling back to all chunks:', e);
  }

  // Final fallback: just get some chunks from the document if search failed
  if (relevantChunks.length === 0) {
    const ChunkModel = (await import('@/lib/models/Chunk')).default;
    relevantChunks = await ChunkModel.find({ documentId: topic.documentId }).limit(10).lean();
  }

  if (relevantChunks.length === 0) throw new Error('No content found in document to generate quiz');

  const context = relevantChunks.map((c) => c.content).join('\n\n---\n\n');

  const typeInstructions = types.map((t) => {
    switch (t) {
      case 'mcq':
        return `MCQ questions with 4 options (A, B, C, D). Make wrong options plausible, not obviously wrong.`;
      case 'short_answer':
        return `Short answer questions that require 1-2 sentence answers. Focus on key concepts.`;
      case 'concept':
        return `Concept-based questions that test deep understanding. Ask "why" and "how" questions, not just "what".`;
    }
  }).join('\n');

  const systemPrompt = `You are an expert educator creating quiz questions. Generate questions that test deep understanding, not just memorization.

RULES:
- Generate exactly ${count} questions
- Difficulty level: ${difficulty}
- Question types to include: ${types.join(', ')}
- For MCQs: provide exactly 4 options, make distractors plausible
- Ask "why" and "how" questions, not just "what is X?"
- Include clear, educational explanations for each answer
- Base questions ONLY on the provided content

${typeInstructions}

Return as a JSON array:
[
  {
    "type": "mcq" | "short_answer" | "concept",
    "difficulty": "easy" | "medium" | "hard",
    "question": "The question text",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correctAnswer": "The correct answer text",
    "explanation": "Why this is the correct answer, with educational context"
  }
]

For short_answer and concept types, set options to an empty array [].
Return ONLY the JSON array.`;

  const userPrompt = `Topic: ${topic.name}

Study Content:
${context}

Generate ${count} ${difficulty} level questions about this topic.`;

  const response = await generateCompletion(systemPrompt, userPrompt, 0.7);

  // Parse response
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Failed to parse quiz response');

  const questions = JSON.parse(jsonMatch[0]);

  // Save to database
  const savedQuestions = await Promise.all(
    questions.map(async (q: Record<string, unknown>) => {
      const question = await Question.create({
        userId,
        documentId: topic.documentId,
        topicId: topic._id,
        type: q.type || 'mcq',
        difficulty: q.difficulty || difficulty,
        question: q.question,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
      });

      // Create review schedule for spaced repetition
      await ReviewSchedule.create({
        userId,
        questionId: question._id,
        topicId: topic._id,
        nextReview: new Date(),
      });

      return question;
    })
  );

  return savedQuestions;
}
