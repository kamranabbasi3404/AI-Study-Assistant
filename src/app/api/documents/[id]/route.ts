import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import DocumentModel from '@/lib/models/Document';
import Topic from '@/lib/models/Topic';
import Chunk from '@/lib/models/Chunk';
import Question from '@/lib/models/Question';
import Performance from '@/lib/models/Performance';
import ReviewSchedule from '@/lib/models/ReviewSchedule';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const doc = await DocumentModel.findById(id).lean();
    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    const topics = await Topic.find({ documentId: id }).lean();
    const questionCount = await Question.countDocuments({ documentId: id });

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
    await connectDB();
    const { id } = await params;

    // Delete all related data
    const questions = await Question.find({ documentId: id }).select('_id');
    const questionIds = questions.map((q) => q._id);

    await Performance.deleteMany({ questionId: { $in: questionIds } });
    await ReviewSchedule.deleteMany({ questionId: { $in: questionIds } });
    await Question.deleteMany({ documentId: id });
    await Chunk.deleteMany({ documentId: id });
    await Topic.deleteMany({ documentId: id });
    await DocumentModel.findByIdAndDelete(id);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete document error:', error);
    return Response.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
