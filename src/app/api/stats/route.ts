import connectDB from '@/lib/db';
import { getStudyStats } from '@/lib/learning/adaptive';
import { getWeakTopics } from '@/lib/learning/tracker';
import DocumentModel from '@/lib/models/Document';

export async function GET() {
  try {
    await connectDB();

    const [stats, weakTopics, docCount] = await Promise.all([
      getStudyStats(),
      getWeakTopics(),
      DocumentModel.countDocuments(),
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
