import Chunk from '@/lib/models/Chunk';
import connectDB from '@/lib/db';

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface SearchResult {
  chunkId: string;
  documentId: string;
  topicId: string | null;
  content: string;
  heading: string;
  score: number;
}

class MinHeap {
  private heap: SearchResult[];

  constructor() {
    this.heap = [];
  }

  get size() {
    return this.heap.length;
  }

  push(item: SearchResult) {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): SearchResult | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();

    const top = this.heap[0];
    this.heap[0] = this.heap.pop() as SearchResult;
    this.sinkDown(0);
    return top;
  }

  peek(): SearchResult | undefined {
    return this.heap[0];
  }

  toArray(): SearchResult[] {
    return [...this.heap];
  }

  private bubbleUp(index: number) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].score <= this.heap[index].score) break;
      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  private sinkDown(index: number) {
    const length = this.heap.length;
    while (true) {
      let smallest = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (leftChild < length && this.heap[leftChild].score < this.heap[smallest].score) {
        smallest = leftChild;
      }
      if (rightChild < length && this.heap[rightChild].score < this.heap[smallest].score) {
        smallest = rightChild;
      }

      if (smallest === index) break;
      this.swap(index, smallest);
      index = smallest;
    }
  }

  private swap(i: number, j: number) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }
}

export async function searchSimilarChunks(
  queryEmbedding: number[],
  topK: number = 5,
  documentId?: string
): Promise<SearchResult[]> {
  await connectDB();

  // Build query filter
  const filter: Record<string, unknown> = { embedding: { $exists: true, $ne: [] } };
  if (documentId) {
    filter.documentId = documentId;
  }

  // Fetch chunks with embeddings
  const chunks = await Chunk.find(filter).lean();

  const minHeap = new MinHeap();

  // Calculate similarity for each chunk and keep topK in heap
  for (const chunk of chunks) {
    const score = cosineSimilarity(queryEmbedding, chunk.embedding as number[]);
    const result: SearchResult = {
      chunkId: String(chunk._id),
      documentId: String(chunk.documentId),
      topicId: chunk.topicId ? String(chunk.topicId) : null,
      content: chunk.content,
      heading: chunk.heading || '',
      score,
    };

    if (minHeap.size < topK) {
      minHeap.push(result);
    } else if (minHeap.peek()!.score < score) {
      minHeap.pop();
      minHeap.push(result);
    }
  }

  // Sort descending and return
  return minHeap.toArray().sort((a, b) => b.score - a.score);
}

export async function searchByTopic(
  queryEmbedding: number[],
  topicId: string,
  topK: number = 5
): Promise<SearchResult[]> {
  await connectDB();

  const chunks = await Chunk.find({
    topicId,
    embedding: { $exists: true, $ne: [] },
  }).lean();

  const minHeap = new MinHeap();

  for (const chunk of chunks) {
    const score = cosineSimilarity(queryEmbedding, chunk.embedding as number[]);
    const result: SearchResult = {
      chunkId: String(chunk._id),
      documentId: String(chunk.documentId),
      topicId: chunk.topicId ? String(chunk.topicId) : null,
      content: chunk.content,
      heading: chunk.heading || '',
      score,
    };

    if (minHeap.size < topK) {
      minHeap.push(result);
    } else if (minHeap.peek()!.score < score) {
      minHeap.pop();
      minHeap.push(result);
    }
  }

  return minHeap.toArray().sort((a, b) => b.score - a.score);
}
