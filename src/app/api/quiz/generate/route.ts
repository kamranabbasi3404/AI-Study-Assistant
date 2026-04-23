import { NextRequest } from 'next/server';
import { generateQuiz } from '@/lib/ai/quiz-generator';
import { getNextDifficulty } from '@/lib/learning/adaptive';

import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { topicId, count = 5, types = ['mcq', 'short_answer', 'concept'], difficulty } = body;

    if (!topicId) {
      return Response.json({ error: 'topicId is required' }, { status: 400 });
    }

    // If no difficulty specified, use adaptive difficulty
    let finalDifficulty = difficulty;
    if (!finalDifficulty) {
      const adaptive = await getNextDifficulty(topicId, userId);
      finalDifficulty = adaptive.difficulty;
    }

    const questions = await generateQuiz({
      topicId,
      userId,
      count,
      types,
      difficulty: finalDifficulty,
    });

    return Response.json({
      questions: questions.map((q) => ({
        _id: String(q._id),
        type: q.type,
        difficulty: q.difficulty,
        question: q.question,
        options: q.options,
        // Don't send correct answer to client
      })),
      difficulty: finalDifficulty,
      count: questions.length,
    });
  } catch (error) {
    console.error('Quiz generation error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to generate quiz' },
      { status: 500 }
    );
  }
}
