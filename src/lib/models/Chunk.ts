import mongoose, { Schema, Document } from 'mongoose';

export interface IChunk extends Document {
  documentId: mongoose.Types.ObjectId;
  topicId: mongoose.Types.ObjectId | null;
  content: string;
  heading: string;
  chunkIndex: number;
  tokenCount: number;
  embedding: number[];
  createdAt: Date;
}

const ChunkSchema = new Schema<IChunk>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', default: null },
    content: { type: String, required: true },
    heading: { type: String, default: '' },
    chunkIndex: { type: Number, required: true },
    tokenCount: { type: Number, default: 0 },
    embedding: { type: [Number], default: [] },
  },
  { timestamps: true }
);

ChunkSchema.index({ documentId: 1 });
ChunkSchema.index({ topicId: 1 });

export default mongoose.models.Chunk || mongoose.model<IChunk>('Chunk', ChunkSchema);
