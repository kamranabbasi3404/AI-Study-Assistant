import { NextRequest } from 'next/server';
import { chatWithNotes } from '@/lib/ai/summarizer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, documentId } = body;

    if (!question) {
      return Response.json({ error: 'Question is required' }, { status: 400 });
    }

    const result = await chatWithNotes(question, documentId);

    return Response.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    return Response.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
