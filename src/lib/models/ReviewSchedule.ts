import mongoose, { Schema, Document } from 'mongoose';

export interface IReviewSchedule extends Document {
  userId: string;
  questionId: mongoose.Types.ObjectId;
  topicId: mongoose.Types.ObjectId;
  easeFactor: number;
  interval: number;
  repetition: number;
  nextReview: Date;
  lastReviewed: Date | null;
}

const ReviewScheduleSchema = new Schema<IReviewSchedule>(
  {
    userId: { type: String, required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true, unique: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    easeFactor: { type: Number, default: 2.5 },
    interval: { type: Number, default: 0 },
    repetition: { type: Number, default: 0 },
    nextReview: { type: Date, default: Date.now },
    lastReviewed: { type: Date, default: null },
  },
  { timestamps: true }
);

ReviewScheduleSchema.index({ nextReview: 1 });

export default mongoose.models.ReviewSchedule || mongoose.model<IReviewSchedule>('ReviewSchedule', ReviewScheduleSchema);
