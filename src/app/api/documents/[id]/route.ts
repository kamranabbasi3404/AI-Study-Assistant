import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import DocumentModel from '@/lib/models/Document';
import Topic from '@/lib/models/Topic';
import Chunk from '@/lib/models/Chunk';
import Question from '@/lib/models/Question';
import Performance from '@/lib/models/Performance';
import ReviewSchedule from '@/lib/models/ReviewSchedule';

import { auth } from '@clerk/nextjs/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const doc = await DocumentModel.findOne({ _id: id, userId }).lean();
    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    const topics = await Topic.find({ userId, documentId: id }).lean();
    const questionCount = await Question.countDocuments({ userId, documentId: id });

    return Response.json({
      ...doc,
      _id: String(doc._id),
      topics: topics.map((t) => ({
        _id: String(t._id),
        name: t.name,
        difficultyLevel: t.difficultyLevel,
      })),
      questionCount,
    });
  } catch (error) {
    console.error('Get document error:', error);
    return Response.json({ error: 'Failed to fetch document' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    // Verify document belongs to user
    const doc = await DocumentModel.findOne({ _id: id, userId });
    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete all related data
    const questions = await Question.find({ userId, documentId: id }).select('_id');
    const questionIds = questions.map((q) => q._id);

    await Performance.deleteMany({ userId, questionId: { $in: questionIds } });
    await ReviewSchedule.deleteMany({ userId, questionId: { $in: questionIds } });
    await Question.deleteMany({ userId, documentId: id });
    await Chunk.deleteMany({ userId, documentId: id });
    await Topic.deleteMany({ userId, documentId: id });
    await DocumentModel.findOneAndDelete({ _id: id, userId });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete document error:', error);
    return Response.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
