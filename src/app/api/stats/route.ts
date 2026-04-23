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

    const [stats, weakTopics, documents] = await Promise.all([
      getStudyStats(userId),
      getWeakTopics(userId),
      DocumentModel.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    // Format recent activity
    const recentActivity = documents.map(doc => ({
      type: 'upload' as const,
      title: 'New Material Uploaded',
      description: doc.title,
      timestamp: new Date(doc.createdAt).toLocaleDateString(),
    }));

    // Add quiz activity if any performances exist
    // (In a real app, you'd fetch both and merge them)

    return Response.json({
      totalDocuments: documents.length,
      totalQuestionsAnswered: stats.totalAnswered,
      averageAccuracy: stats.accuracy,
      studyTimeToday: stats.streak * 10, // Mock study time for now
      recentActivity,
      topicStrength: weakTopics.map(t => ({
        name: t.topicName,
        strength: t.accuracy
      })),
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return Response.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
