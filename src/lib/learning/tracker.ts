import connectDB from '@/lib/db';
import Performance from '@/lib/models/Performance';
import ReviewSchedule from '@/lib/models/ReviewSchedule';
import Question from '@/lib/models/Question';
import Topic from '@/lib/models/Topic';
import { calculateSM2, performanceToQuality } from './sm2';

export interface TopicStrength {
  topicId: string;
  topicName: string;
  strength: 'strong' | 'medium' | 'weak';
  accuracy: number;
  totalAnswered: number;
  recentTrend: 'improving' | 'declining' | 'stable';
}

export async function recordAnswer(
  questionId: string,
  isCorrect: boolean,
  timeTakenMs: number,
  userAnswer: string
) {
  await connectDB();

  const question = await Question.findById(questionId);
  if (!question) throw new Error('Question not found');

  // Record performance
  await Performance.create({
    questionId,
    topicId: question.topicId,
    isCorrect,
    userAnswer,
    timeTakenMs,
    answeredAt: new Date(),
  });

  // Update spaced repetition schedule
  const schedule = await ReviewSchedule.findOne({ questionId });
  if (schedule) {
    const quality = performanceToQuality(isCorrect, timeTakenMs);
    const result = calculateSM2(
      {
        interval: schedule.interval,
        repetition: schedule.repetition,
        easeFactor: schedule.easeFactor,
      },
      quality
    );

    schedule.interval = result.interval;
    schedule.repetition = result.repetition;
    schedule.easeFactor = result.easeFactor;
    schedule.nextReview = result.nextReviewDate;
    schedule.lastReviewed = new Date();
    await schedule.save();
  }

  return {
    isCorrect,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
  };
}

export async function getWeakTopics(): Promise<TopicStrength[]> {
  await connectDB();

  const [topics, allPerformances] = await Promise.all([
    Topic.find().lean(),
    Performance.find().sort({ answeredAt: -1 }).lean(),
  ]);

  // Use a Map (Hash Map) to group performances by topicId for O(1) retrieval
  const performancesByTopic = new Map<string, any[]>();
  for (const p of allPerformances) {
    const topicId = String(p.topicId);
    if (!performancesByTopic.has(topicId)) {
      performancesByTopic.set(topicId, []);
    }
    performancesByTopic.get(topicId)!.push(p);
  }

  const strengths: TopicStrength[] = [];

  for (const topic of topics) {
    const performances = performancesByTopic.get(String(topic._id)) || [];

    if (performances.length === 0) {
      strengths.push({
        topicId: String(topic._id),
        topicName: topic.name,
        strength: 'medium',
        accuracy: 0,
        totalAnswered: 0,
        recentTrend: 'stable',
      });
      continue;
    }

    const totalCorrect = performances.filter((p) => p.isCorrect).length;
    const accuracy = totalCorrect / performances.length;

    // Check recent trend (last 5 vs previous 5)
    const recent5 = performances.slice(0, 5);
    const prev5 = performances.slice(5, 10);
    const recentAccuracy = recent5.filter((p) => p.isCorrect).length / recent5.length;
    const prevAccuracy = prev5.length > 0
      ? prev5.filter((p) => p.isCorrect).length / prev5.length
      : recentAccuracy;

    let recentTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentAccuracy - prevAccuracy > 0.15) recentTrend = 'improving';
    else if (prevAccuracy - recentAccuracy > 0.15) recentTrend = 'declining';

    let strength: 'strong' | 'medium' | 'weak';
    if (accuracy >= 0.8) strength = 'strong';
    else if (accuracy >= 0.5) strength = 'medium';
    else strength = 'weak';

    strengths.push({
      topicId: String(topic._id),
      topicName: topic.name,
      strength,
      accuracy: Math.round(accuracy * 100),
      totalAnswered: performances.length,
      recentTrend,
    });
  }

  // Sort: weak first, then medium, then strong
  const order = { weak: 0, medium: 1, strong: 2 };
  strengths.sort((a, b) => order[a.strength] - order[b.strength]);

  return strengths;
}

export async function getTopicStrength(topicId: string): Promise<TopicStrength | null> {
  const all = await getWeakTopics();
  return all.find((t) => t.topicId === topicId) || null;
}
