import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { getDueReviews } from '@/lib/learning/adaptive';
import ReviewSchedule from '@/lib/models/ReviewSchedule';
import { calculateSM2 } from '@/lib/learning/sm2';

import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dueReviews = await getDueReviews(userId, 20);

    return Response.json({
      reviews: dueReviews.map((r) => ({
        _id: String(r._id),
        question: r.questionId,
        easeFactor: r.easeFactor,
        interval: r.interval,
        repetition: r.repetition,
        nextReview: r.nextReview,
        lastReviewed: r.lastReviewed,
      })),
      count: dueReviews.length,
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    return Response.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    const { questionId, quality } = body;

    if (!questionId || quality === undefined) {
      return Response.json(
        { error: 'questionId and quality are required' },
        { status: 400 }
      );
    }

    const schedule = await ReviewSchedule.findOne({ userId, questionId });
    if (!schedule) {
      return Response.json({ error: 'Review schedule not found' }, { status: 404 });
    }

    const result = calculateSM2(
      {
        interval: schedule.interval,
        repetition: schedule.repetition,
        easeFactor: schedule.easeFactor,
      },
      quality
    );

    schedule.interval = result.interval;
    schedule.repetition = result.repetition;
    schedule.easeFactor = result.easeFactor;
    schedule.nextReview = result.nextReviewDate;
    schedule.lastReviewed = new Date();
    await schedule.save();

    return Response.json({
      nextReview: result.nextReviewDate,
      interval: result.interval,
    });
  } catch (error) {
    console.error('Update review error:', error);
    return Response.json({ error: 'Failed to update review' }, { status: 500 });
  }
}
