import Groq from 'groq-sdk';

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');
  return new Groq({ apiKey });
}

/**
 * Generate a text embedding using a local TF-IDF approach.
 * Groq does not provide an embeddings API, so we compute lightweight
 * deterministic embeddings locally. The vectors are consistent across
 * calls so cosine-similarity search still works for RAG.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  return computeLocalEmbedding(text);
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  return texts.map((t) => computeLocalEmbedding(t));
}

/**
 * Deterministic local embedding using character-level n-gram hashing.
 * Produces a 768-dimensional vector for compatibility with existing DB schema.
 */
function computeLocalEmbedding(text: string): number[] {
  const DIMS = 768;
  const vec = new Float64Array(DIMS);

  // Normalise input
  const normalised = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const words = normalised.split(/\s+/).filter(Boolean);

  // Hash each word and its bigrams into the vector
  for (const word of words) {
    // Unigram hash
    const h = simpleHash(word);
    vec[Math.abs(h) % DIMS] += 1;

    // Character trigrams for better granularity
    for (let i = 0; i <= word.length - 3; i++) {
      const trigram = word.substring(i, i + 3);
      const th = simpleHash(trigram);
      vec[Math.abs(th) % DIMS] += 0.5;
    }
  }

  // Word bigrams
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = words[i] + ' ' + words[i + 1];
    const bh = simpleHash(bigram);
    vec[Math.abs(bh) % DIMS] += 0.7;
  }

  // L2 normalise
  let norm = 0;
  for (let i = 0; i < DIMS; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  const result: number[] = new Array(DIMS);
  for (let i = 0; i < DIMS; i++) result[i] = vec[i] / norm;

  return result;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash;
}

/**
 * Generate a chat completion using Groq (llama-3.3-70b-versatile).
 * Drop-in replacement for the old Gemini generateCompletion.
 */
export async function generateCompletion(
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.7
): Promise<string> {
  const groq = getGroqClient();
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const chatCompletion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: 4096,
      });

      const text = chatCompletion.choices?.[0]?.message?.content;
      if (!text) throw new Error('Empty response from Groq');
      return text;
    } catch (e: any) {
      const isRateLimit =
        e.status === 429 ||
        e.message?.includes('rate_limit') ||
        e.message?.includes('429');

      if (isRateLimit && attempt < maxRetries - 1) {
        attempt++;
        const waitTime = attempt * 3000;

        if (waitTime > 15000) {
          throw new Error(
            `RATE_LIMIT_FAST_FAIL: Groq quota exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds before trying again.`
          );
        }

        console.warn(
          `Groq API rate limit. Retrying in ${waitTime}ms... (Attempt ${attempt}/${maxRetries - 1})`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      console.error('Groq Completion failed:', e);
      throw new Error(e.message || 'Groq completion failed');
    }
  }
  throw new Error('Failed after multiple retries due to rate limiting');
}
