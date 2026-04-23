export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            content: { parts: [{ text }] },
            outputDimensionality: 768
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        const errorMsg = data.error?.message || 'Embedding failed';
        if (response.status === 429) {
          throw new Error('RATE_LIMIT: ' + errorMsg);
        }
        throw new Error(errorMsg);
      }
      
      return data.embedding.values;
    } catch (e: any) {
      if (e.message.includes('RATE_LIMIT') && attempt < maxRetries - 1) {
        attempt++;
        // If it tells us to wait X seconds, we can try to extract it, or just use backoff
        // "Please retry in 22.895268834s."
        const match = e.message.match(/retry in ([\d\.]+)s/);
        let waitTime = attempt * 5000; // default 5s, 10s
        if (match && match[1]) {
          waitTime = Math.ceil(parseFloat(match[1])) * 1000 + 1000; // add 1s buffer
        }
        
        console.warn(`Gemini API rate limit. Retrying in ${waitTime}ms... (Attempt ${attempt}/${maxRetries - 1})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      console.error('REST Embedding failed:', e);
      return new Array(768).fill(0);
    }
  }
  return new Array(768).fill(0);
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.GEMINI_API_KEY;
  const maxRetries = 3;
  const allEmbeddings: number[][] = [];
  const BATCH_SIZE = 100;

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batchTexts = texts.slice(i, i + BATCH_SIZE);
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const requests = batchTexts.map(text => ({
          model: 'models/gemini-embedding-2',
          content: { parts: [{ text }] },
          outputDimensionality: 768
        }));

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:batchEmbedContents?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests }),
          }
        );

        const data = await response.json();
        
        if (!response.ok) {
          const errorMsg = data.error?.message || 'Batch Embedding failed';
          if (response.status === 429) {
            throw new Error('RATE_LIMIT: ' + errorMsg);
          }
          throw new Error(errorMsg);
        }
        
        const batchEmbeddings = data.embeddings.map((e: any) => e.values);
        allEmbeddings.push(...batchEmbeddings);
        break; // Success, break the retry loop
      } catch (e: any) {
        if (e.message.includes('RATE_LIMIT') && attempt < maxRetries - 1) {
          attempt++;
          const match = e.message.match(/retry in ([\d\.]+)s/);
          let waitTime = attempt * 5000;
          if (match && match[1]) {
            waitTime = Math.ceil(parseFloat(match[1])) * 1000 + 1000;
          }
          console.warn(`Gemini API rate limit on batch. Retrying in ${waitTime}ms... (Attempt ${attempt}/${maxRetries - 1})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        console.error('REST Batch Embedding failed:', e);
        // Fill failures with zeros
        for (let j = 0; j < batchTexts.length; j++) {
          allEmbeddings.push(new Array(768).fill(0));
        }
        break;
      }
    }
  }

  return allEmbeddings;
}
export async function generateCompletion(
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.7
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: { temperature, maxOutputTokens: 4096 },
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        const errorMsg = data.error?.message || 'Completion failed';
        if (errorMsg.includes('high demand') || response.status === 503 || response.status === 429) {
          throw new Error('HIGH_DEMAND: ' + errorMsg);
        }
        throw new Error(errorMsg);
      }
      
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty response from Gemini');
      return text;
    } catch (e: any) {
      if (e.message.includes('HIGH_DEMAND') && attempt < maxRetries - 1) {
        attempt++;
        
        // Check if API tells us exactly how long to wait
        const match = e.message.match(/retry in ([\d\.]+)s/);
        let waitTime = attempt * 2000; // default 2s, 4s
        if (match && match[1]) {
          waitTime = Math.ceil(parseFloat(match[1])) * 1000 + 1000; // Add 1s buffer
        }

        // Fast fail if wait time is too long (over 10s)
        if (waitTime > 10000) {
          throw new Error(`RATE_LIMIT_FAST_FAIL: Gemini quota exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds before trying again.`);
        }

        console.warn(`Gemini API high demand. Retrying in ${waitTime}ms... (Attempt ${attempt}/${maxRetries - 1})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      console.error('REST Completion failed:', e);
      throw new Error(e.message.replace('HIGH_DEMAND: ', ''));
    }
  }
  throw new Error('Failed after multiple retries due to high demand');
}
