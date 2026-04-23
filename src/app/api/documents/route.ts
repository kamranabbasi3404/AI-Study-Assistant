import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { processDocument } from '@/lib/pipeline/process';
import DocumentModel from '@/lib/models/Document';
import Topic from '@/lib/models/Topic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const filename = file.name;
    const isText = filename.endsWith('.txt');
    const buffer = Buffer.from(await file.arrayBuffer());

    let result;
    if (isText) {
      const text = buffer.toString('utf-8');
      result = await processDocument(text, filename, true);
    } else {
      result = await processDocument(buffer, filename, false);
    }

    return Response.json(result, { status: 201 });
  } catch (error) {
    console.error('Document upload error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to process document' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();

    const documents = await DocumentModel.find()
      .sort({ createdAt: -1 })
      .lean();

    // Get topics for each document
    const docsWithTopics = await Promise.all(
      documents.map(async (doc) => {
        const topics = await Topic.find({ documentId: doc._id }).lean();
        return {
          ...doc,
          _id: String(doc._id),
          topics: topics.map((t) => ({
            _id: String(t._id),
            name: t.name,
            difficultyLevel: t.difficultyLevel,
          })),
        };
      })
    );

    return Response.json(docsWithTopics);
  } catch (error) {
    console.error('Get documents error:', error);
    return Response.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}
