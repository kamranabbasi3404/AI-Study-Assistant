import { NextRequest } from 'next/server';
import { recordAnswer } from '@/lib/learning/tracker';
import { generateExplanation } from '@/lib/ai/explainer';

import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { questionId, answer, timeTakenMs = 0 } = body;

    if (!questionId || answer === undefined) {
      return Response.json(
        { error: 'questionId and answer are required' },
        { status: 400 }
      );
    }

    const result = await recordAnswer(questionId, userId, false, timeTakenMs, answer);

    // Check if answer is correct (compare case-insensitive for text answers)
    const isCorrect = answer.trim().toLowerCase() === result.correctAnswer.trim().toLowerCase()
      || answer.trim() === result.correctAnswer.trim();

    // Re-record with correct value
    if (isCorrect !== result.isCorrect) {
      await recordAnswer(questionId, userId, isCorrect, timeTakenMs, answer);
    }

    // Generate detailed explanation if wrong
    let detailedExplanation = result.explanation;
    if (!isCorrect) {
      try {
        detailedExplanation = await generateExplanation(questionId, answer, userId);
      } catch {
        // Use stored explanation as fallback
      }
    }

    return Response.json({
      isCorrect,
      correctAnswer: result.correctAnswer,
      explanation: detailedExplanation,
    });
  } catch (error) {
    console.error('Answer submission error:', error);
    return Response.json(
      { error: 'Failed to process answer' },
      { status: 500 }
    );
  }
}
