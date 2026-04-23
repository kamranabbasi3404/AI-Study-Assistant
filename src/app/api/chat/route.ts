import { NextRequest } from 'next/server';
import { chatWithNotes } from '@/lib/ai/summarizer';

import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { question, documentId, sessionId: providedSessionId } = body;

    if (!question) {
      return Response.json({ error: 'Question is required' }, { status: 400 });
    }

    let sessionId = providedSessionId;
    const { default: ChatSession } = await import('@/lib/models/ChatSession');
    const { default: ChatMessage } = await import('@/lib/models/ChatMessage');

    if (!sessionId) {
      const newSession = await ChatSession.create({ userId, title: question.substring(0, 30) + (question.length > 30 ? '...' : '') });
      sessionId = newSession._id;
    }

    // Save User message
    await ChatMessage.create({
      sessionId,
      role: 'user',
      content: question,
      type: 'chat'
    });

    // Helper to save and return assistant message
    const sendAssistantMessage = async (payload: any) => {
      await ChatMessage.create({
        sessionId,
        role: 'assistant',
        content: payload.message || payload.answer || '',
        type: payload.type,
        quizData: payload.questions,
        sources: payload.sources
      });
      return Response.json({ ...payload, sessionId });
    };

    // Determine Intent: Chat, Review, or Quiz
    const isReviewRequest = question.toLowerCase().includes('review');
    const isQuizRequest = question.toLowerCase().includes('quiz') || question.toLowerCase().includes('test me') || question.toLowerCase().includes('questions');

    if (isReviewRequest) {
      const { default: ReviewSchedule } = await import('@/lib/models/ReviewSchedule');
      await import('@/lib/models/Question'); // Ensure model is registered
      
      const pendingReviews = await ReviewSchedule.find({
        userId,
        nextReview: { $lte: new Date() }
      }).populate('questionId').limit(5).lean();

      if (pendingReviews.length === 0) {
        return sendAssistantMessage({ type: 'chat', answer: 'You have no pending reviews at the moment! Great job staying on top of your studies. 🎯', sources: [] });
      }

      const questions = pendingReviews.map((r: any) => ({
        _id: r.questionId._id,
        question: r.questionId.question,
        options: r.questionId.options,
        correctAnswer: r.questionId.correctAnswer,
        explanation: r.questionId.explanation,
        type: r.questionId.type
      }));

      return sendAssistantMessage({ type: 'quiz', questions, message: "Here is your daily review! Let's reinforce your memory. 🧠" });
    }

    if (isQuizRequest) {
      const { generateQuiz } = await import('@/lib/ai/quiz-generator');
      const { default: Topic } = await import('@/lib/models/Topic');
      
      // Find the most recent topic for this user
      const recentTopic = await Topic.findOne({ userId }).sort({ createdAt: -1 });
      
      if (!recentTopic) {
        return sendAssistantMessage({ type: 'chat', answer: 'You need to upload some study notes first before I can generate a quiz!', sources: [] });
      }

      try {
        const generatedQuestions = await generateQuiz({
          topicId: String(recentTopic._id),
          userId,
          count: 5,
        });
        
        // Map to format expected by UI
        const questions = generatedQuestions.map((q: any) => ({
          _id: q._id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          type: q.type
        }));

        return sendAssistantMessage({ type: 'quiz', questions, message: `Here is a quiz based on your recent notes (${recentTopic.name})! Answers will be saved to your review schedule.` });
      } catch (e) {
        console.error('Failed to generate DB quiz:', e);
        return sendAssistantMessage({ type: 'chat', answer: 'I tried to generate a quiz, but encountered an error. Please try again.', sources: [] });
      }
    }

    const result = await chatWithNotes(question, userId, documentId);
    return sendAssistantMessage({ type: 'chat', ...result });
  } catch (error: any) {
    console.error('Chat error:', error);
    
    // Check if it's our rate limit fast fail
    if (error.message && error.message.includes('RATE_LIMIT_FAST_FAIL')) {
      return Response.json({
        type: 'chat',
        answer: error.message.replace('RATE_LIMIT_FAST_FAIL: ', '⚠️ '),
        sources: []
      });
    }

    return Response.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
