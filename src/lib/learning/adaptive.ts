import connectDB from '@/lib/db';
import Performance from '@/lib/models/Performance';
import ReviewSchedule from '@/lib/models/ReviewSchedule';
import Question from '@/lib/models/Question';

/**
 * Adaptive difficulty - adjusts quiz difficulty based on recent performance
 * 
 * Logic:
 * - 3+ correct in a row → increase difficulty
 * - 2+ wrong in a row → decrease difficulty + show explanation
 */
export async function getNextDifficulty(
  topicId: string
): Promise<{ difficulty: 'easy' | 'medium' | 'hard'; shouldShowExplanation: boolean }> {
  await connectDB();

  const recentPerformances = await Performance.find({ topicId })
    .sort({ answeredAt: -1 })
    .limit(5)
    .lean();

  if (recentPerformances.length === 0) {
    return { difficulty: 'medium', shouldShowExplanation: false };
  }

  // Count consecutive correct/wrong from most recent
  let consecutiveCorrect = 0;
  let consecutiveWrong = 0;

  for (const p of recentPerformances) {
    if (p.isCorrect) {
      if (consecutiveWrong > 0) break;
      consecutiveCorrect++;
    } else {
      if (consecutiveCorrect > 0) break;
      consecutiveWrong++;
    }
  }

  // Get current difficulty of last question
  const lastQuestion = await Question.findById(recentPerformances[0].questionId);
  const currentDifficulty = lastQuestion?.difficulty || 'medium';

  let difficulty: 'easy' | 'medium' | 'hard' = currentDifficulty as 'easy' | 'medium' | 'hard';
  let shouldShowExplanation = false;

  if (consecutiveCorrect >= 3) {
    // Increase difficulty
    if (currentDifficulty === 'easy') difficulty = 'medium';
    else if (currentDifficulty === 'medium') difficulty = 'hard';
  } else if (consecutiveWrong >= 2) {
    // Decrease difficulty + show explanation
    if (currentDifficulty === 'hard') difficulty = 'medium';
    else if (currentDifficulty === 'medium') difficulty = 'easy';
    shouldShowExplanation = true;
  }

  return { difficulty, shouldShowExplanation };
}

/**
 * Get questions due for spaced repetition review
 */
export async function getDueReviews(limit: number = 20) {
  await connectDB();

  const now = new Date();
  const dueSchedules = await ReviewSchedule.find({
    nextReview: { $lte: now },
  })
    .sort({ nextReview: 1 })
    .limit(limit)
    .populate({
      path: 'questionId',
      model: Question,
    })
    .lean();

  return dueSchedules.filter((s) => s.questionId); // Filter out any with deleted questions
}

/**
 * Get study statistics
 */
export async function getStudyStats() {
  await connectDB();

  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [allPerformances, dueCount] = await Promise.all([
    Performance.find().sort({ answeredAt: -1 }).lean(),
    ReviewSchedule.countDocuments({ nextReview: { $lte: now } }),
  ]);

  const totalAnswered = allPerformances.length;
  const totalCorrect = allPerformances.filter((p) => p.isCorrect).length;
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  // Study streak calculation using a Set for O(1) lookups
  let streak = 0;
  if (totalAnswered > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkDate = new Date(today);
    const dateSet = new Set(
      allPerformances.map((p) => {
        const d = new Date(p.answeredAt);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
    );

    while (true) {
      const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
      if (dateSet.has(key)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Daily accuracy for last 7 days using a Map for efficient grouping
  const dailyAccuracy: { date: string; accuracy: number }[] = [];
  const perfsByDate = new Map<string, { total: number; correct: number }>();

  // Initialize last 7 days
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    perfsByDate.set(dateStr, { total: 0, correct: 0 });
  }

  // Populate data
  for (const p of allPerformances) {
    if (p.answeredAt < sevenDaysAgo) continue;
    const dateStr = new Date(p.answeredAt).toISOString().split('T')[0];
    const data = perfsByDate.get(dateStr);
    if (data) {
      data.total++;
      if (p.isCorrect) data.correct++;
    }
  }

  // Format result
  const sortedDates = Array.from(perfsByDate.keys()).sort();
  for (const dateStr of sortedDates) {
    const data = perfsByDate.get(dateStr)!;
    const acc = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
    dailyAccuracy.push({ date: dateStr, accuracy: acc });
  }

  return {
    totalAnswered,
    totalCorrect,
    accuracy,
    streak,
    dueReviews: dueCount,
    dailyAccuracy,
  };
}
