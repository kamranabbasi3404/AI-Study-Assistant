import { generateCompletion, generateEmbedding } from '@/lib/gemini';
import { searchByTopic, searchSimilarChunks } from '@/lib/vector-store';
import connectDB from '@/lib/db';
import Question from '@/lib/models/Question';
import Topic from '@/lib/models/Topic';
import ReviewSchedule from '@/lib/models/ReviewSchedule';

interface QuizOptions {
  topicId: string;
  count?: number;
  types?: ('mcq' | 'short_answer' | 'concept')[];
  difficulty?: 'easy' | 'medium' | 'hard';
}

export async function generateQuiz(options: QuizOptions) {
  await connectDB();
  const { topicId, count = 5, types = ['mcq', 'short_answer', 'concept'], difficulty = 'medium' } = options;

  // Get topic info
  const topic = await Topic.findById(topicId).populate('documentId');
  if (!topic) throw new Error('Topic not found');

  // RAG: retrieve relevant chunks for this topic
  const queryEmbedding = await generateEmbedding(`Generate quiz questions about ${topic.name}`);
  const relevantChunks = await searchByTopic(queryEmbedding, topicId, 8);

  if (relevantChunks.length === 0) {
    // Fallback: search across all chunks for this document
    const allChunks = await searchSimilarChunks(queryEmbedding, 8, String(topic.documentId));
    if (allChunks.length === 0) throw new Error('No content found for this topic');
    relevantChunks.push(...allChunks);
  }

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
        questionId: question._id,
        topicId: topic._id,
        nextReview: new Date(),
      });

      return question;
    })
  );

  return savedQuestions;
}
