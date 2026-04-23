import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI;

function getGenAI() {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy');
  }
  return genAI;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = getGenAI().getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const batchSize = 20;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    // Gemini does not have a batch embedding endpoint in the node SDK currently that works identically,
    // so we'll map over the batch and call embedContent concurrently for the batch.
    const promises = batch.map(text => 
      getGenAI().getGenerativeModel({ model: 'text-embedding-004' }).embedContent(text)
    );
    const results = await Promise.all(promises);
    allEmbeddings.push(...results.map((r) => r.embedding.values));
  }

  return allEmbeddings;
}

export async function generateCompletion(
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.7
): Promise<string> {
  const model = getGenAI().getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature,
      maxOutputTokens: 4096,
    }
  });

  const result = await model.generateContent(userPrompt);
  return result.response.text();
}

export { getGenAI };
