import { generateCompletion } from '@/lib/gemini';

export interface DetectedTopic {
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  chunkIndices: number[];
}

export async function detectTopics(
  chunks: string[],
  headings: string[]
): Promise<DetectedTopic[]> {
  // Build context from chunks and headings
  const chunkSummaries = chunks.map((chunk, i) => {
    const heading = headings[i] || 'No heading';
    const preview = chunk.substring(0, 200);
    return `Chunk ${i}: [${heading}] ${preview}...`;
  }).join('\n');

  const systemPrompt = `You are a study content analyzer. Given a list of text chunks from study notes, identify the main topics covered. For each topic, determine its difficulty level and which chunks belong to it.

Return your response as a JSON array with this structure:
[
  {
    "name": "Topic Name",
    "difficulty": "easy" | "medium" | "hard",
    "chunkIndices": [0, 1, 2]
  }
]

Rules:
- Each chunk should belong to at least one topic
- Topic names should be concise but descriptive
- Difficulty should be based on the complexity of the content
- Return ONLY the JSON array, no other text`;

  const userPrompt = `Analyze these ${chunks.length} chunks and identify topics:\n\n${chunkSummaries}`;

  try {
    const response = await generateCompletion(systemPrompt, userPrompt, 0.3);

    // Parse JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // Fallback: create topics from headings
      return createTopicsFromHeadings(chunks, headings);
    }

    const topics: DetectedTopic[] = JSON.parse(jsonMatch[0]);

    // Validate and clean
    return topics.map((t) => ({
      name: t.name || 'Unnamed Topic',
      difficulty: ['easy', 'medium', 'hard'].includes(t.difficulty) ? t.difficulty : 'medium',
      chunkIndices: (t.chunkIndices || []).filter((i) => i >= 0 && i < chunks.length),
    }));
  } catch {
    return createTopicsFromHeadings(chunks, headings);
  }
}

function createTopicsFromHeadings(chunks: string[], headings: string[]): DetectedTopic[] {
  const topicMap = new Map<string, number[]>();

  for (let i = 0; i < chunks.length; i++) {
    const heading = headings[i] || 'General';
    if (!topicMap.has(heading)) {
      topicMap.set(heading, []);
    }
    topicMap.get(heading)!.push(i);
  }

  return Array.from(topicMap.entries()).map(([name, chunkIndices]) => ({
    name,
    difficulty: 'medium' as const,
    chunkIndices,
  }));
}
