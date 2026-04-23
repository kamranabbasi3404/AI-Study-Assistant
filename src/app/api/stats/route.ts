import connectDB from '@/lib/db';
import { getStudyStats } from '@/lib/learning/adaptive';
import { getWeakTopics } from '@/lib/learning/tracker';
import DocumentModel from '@/lib/models/Document';

import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const [stats, weakTopics, docCount] = await Promise.all([
      getStudyStats(userId),
      getWeakTopics(userId),
      DocumentModel.countDocuments({ userId }),
    ]);

    return Response.json({
      ...stats,
      weakTopics,
      documentCount: docCount,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return Response.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
