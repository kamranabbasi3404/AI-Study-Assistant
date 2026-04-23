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
    const { question, documentId } = body;

    if (!question) {
      return Response.json({ error: 'Question is required' }, { status: 400 });
    }

    const result = await chatWithNotes(question, userId, documentId);

    return Response.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    return Response.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
