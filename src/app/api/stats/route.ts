import connectDB from '@/lib/db';
import { getStudyStats } from '@/lib/learning/adaptive';
import { getWeakTopics } from '@/lib/learning/tracker';
import DocumentModel from '@/lib/models/Document';
import DailyStudyLog from '@/lib/models/DailyStudyLog';

import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [stats, weakTopics, documents, allStudyLogs, totalDocsCount] = await Promise.all([
      getStudyStats(userId),
      getWeakTopics(userId),
      DocumentModel.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
      DailyStudyLog.find({ userId }).lean(),
      DocumentModel.countDocuments({ userId }),
    ]);

    // Calculate study time
    const totalStudyTime = allStudyLogs.reduce((sum, log) => sum + (log.studyTimeMinutes || 0), 0);
    const todayLog = allStudyLogs.find(log => new Date(log.date).getTime() === today.getTime());
    const studyTimeToday = todayLog ? todayLog.studyTimeMinutes : 0;

    // Badges logic
    const badges = [
      { id: 'time_10', name: 'Novice Scholar', icon: '🥉', desc: '10+ mins study time', unlocked: totalStudyTime >= 10 },
      { id: 'time_60', name: 'Dedicated Learner', icon: '🥈', desc: '60+ mins study time', unlocked: totalStudyTime >= 60 },
      { id: 'time_500', name: 'Pro Scholar', icon: '🥇', desc: '500+ mins study time', unlocked: totalStudyTime >= 500 },
      { id: 'doc_1', name: 'First Upload', icon: '📄', desc: 'Upload a document', unlocked: totalDocsCount >= 1 },
      { id: 'doc_5', name: 'Knowledge Seeker', icon: '📚', desc: 'Upload 5+ documents', unlocked: totalDocsCount >= 5 },
      { id: 'acc_80', name: 'Sharpshooter', icon: '🎯', desc: '80%+ Accuracy (min 5 Qs)', unlocked: stats.totalAnswered >= 5 && stats.accuracy >= 80 },
    ];

    // Format recent activity
    const recentActivity = documents.map(doc => ({
      type: 'upload' as const,
      title: 'New Material Uploaded',
      description: doc.title,
      timestamp: new Date(doc.createdAt).toLocaleDateString(),
    }));

    return Response.json({
      totalDocuments: totalDocsCount,
      totalQuestionsAnswered: stats.totalAnswered,
      averageAccuracy: stats.accuracy,
      studyTimeToday,
      totalStudyTime,
      recentActivity,
      badges,
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
