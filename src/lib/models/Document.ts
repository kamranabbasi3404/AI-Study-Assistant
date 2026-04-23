import mongoose, { Schema, Document as MongoDocument } from 'mongoose';

export interface IDocument extends MongoDocument {
  userId: string;
  title: string;
  originalFilename: string;
  content: string;
  topicCount: number;
  chunkCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    originalFilename: { type: String, default: '' },
    content: { type: String, required: true },
    topicCount: { type: Number, default: 0 },
    chunkCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Document || mongoose.model<IDocument>('Document', DocumentSchema);
