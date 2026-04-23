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

  const totalAnswered = await Performance.countDocuments();
  const totalCorrect = await Performance.countDocuments({ isCorrect: true });
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  // Due reviews
  const now = new Date();
  const dueCount = await ReviewSchedule.countDocuments({ nextReview: { $lte: now } });

  // Study streak (days with at least one answer)
  const performances = await Performance.find()
    .sort({ answeredAt: -1 })
    .select('answeredAt')
    .lean();

  let streak = 0;
  if (performances.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let checkDate = new Date(today);
    const dateSet = new Set(
      performances.map((p) => {
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

  // Recent accuracy trend (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentPerformances = await Performance.find({
    answeredAt: { $gte: sevenDaysAgo },
  }).lean();

  const dailyAccuracy: { date: string; accuracy: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayPerfs = recentPerformances.filter((p) => {
      const pd = new Date(p.answeredAt).toISOString().split('T')[0];
      return pd === dateStr;
    });
    const dayAccuracy = dayPerfs.length > 0
      ? Math.round((dayPerfs.filter((p) => p.isCorrect).length / dayPerfs.length) * 100)
      : 0;
    dailyAccuracy.push({ date: dateStr, accuracy: dayAccuracy });
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
