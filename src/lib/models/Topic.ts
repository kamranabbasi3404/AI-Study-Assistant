import mongoose, { Schema, Document } from 'mongoose';

export interface ITopic extends Document {
  userId: string;
  documentId: mongoose.Types.ObjectId;
  name: string;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  chunkIds: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const TopicSchema = new Schema<ITopic>(
  {
    userId: { type: String, required: true, index: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    name: { type: String, required: true },
    difficultyLevel: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    chunkIds: [{ type: Schema.Types.ObjectId, ref: 'Chunk' }],
  },
  { timestamps: true }
);

TopicSchema.index({ documentId: 1 });

export default mongoose.models.Topic || mongoose.model<ITopic>('Topic', TopicSchema);
