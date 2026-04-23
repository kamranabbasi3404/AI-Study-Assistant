import mongoose, { Schema, Document } from 'mongoose';

export interface IPerformance extends Document {
  questionId: mongoose.Types.ObjectId;
  topicId: mongoose.Types.ObjectId;
  isCorrect: boolean;
  userAnswer: string;
  timeTakenMs: number;
  answeredAt: Date;
}

const PerformanceSchema = new Schema<IPerformance>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    isCorrect: { type: Boolean, required: true },
    userAnswer: { type: String, default: '' },
    timeTakenMs: { type: Number, default: 0 },
    answeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PerformanceSchema.index({ questionId: 1 });
PerformanceSchema.index({ topicId: 1 });
PerformanceSchema.index({ answeredAt: -1 });

export default mongoose.models.Performance || mongoose.model<IPerformance>('Performance', PerformanceSchema);
