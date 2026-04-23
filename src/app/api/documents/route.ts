import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { processDocument } from '@/lib/pipeline/process';
import DocumentModel from '@/lib/models/Document';
import Topic from '@/lib/models/Topic';
import Chunk from '@/lib/models/Chunk';
import Question from '@/lib/models/Question';

import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    console.log(`API: POST /api/documents - User: ${userId || 'Unauthorized'}`);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.log('API Error: No file found in form data');
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log(`API: Processing file: ${file.name}, size: ${file.size}`);
    const filename = file.name;
    const isText = filename.endsWith('.txt');
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log(`API: Buffer created, length: ${buffer.length}`);

    let result;
    try {
      // Multi-document mode (reverted as per user request)
      await connectDB();
      
      if (isText) {
        const text = buffer.toString('utf-8');
        console.log('API: Starting processing for TXT...');
        result = await processDocument(text, filename, userId, true);
      } else {
        console.log('API: Starting processing for PDF...');
        result = await processDocument(buffer, filename, userId, false);
      }
      console.log('API: Processing success!');
    } catch (processError) {
      console.error('API: processDocument failed:', processError);
      throw processError;
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
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const documents = await DocumentModel.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    // Get topics for each document
    const docsWithTopics = await Promise.all(
      documents.map(async (doc) => {
        const topics = await Topic.find({ userId, documentId: doc._id }).lean();
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
