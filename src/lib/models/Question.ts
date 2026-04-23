import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  documentId: mongoose.Types.ObjectId;
  topicId: mongoose.Types.ObjectId;
  type: 'mcq' | 'short_answer' | 'concept';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  createdAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    type: { type: String, enum: ['mcq', 'short_answer', 'concept'], required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    question: { type: String, required: true },
    options: [{ type: String }],
    correctAnswer: { type: String, required: true },
    explanation: { type: String, default: '' },
  },
  { timestamps: true }
);

QuestionSchema.index({ documentId: 1 });
QuestionSchema.index({ topicId: 1 });
QuestionSchema.index({ type: 1, difficulty: 1 });

export default mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);
