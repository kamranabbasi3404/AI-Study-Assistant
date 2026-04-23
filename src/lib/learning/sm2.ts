/**
 * SM-2 (SuperMemo-2) Spaced Repetition Algorithm
 * 
 * This is the same algorithm used by Anki. It schedules review
 * intervals based on how well the user recalls the information.
 * 
 * Quality ratings:
 * 5 - Perfect recall, instant
 * 4 - Correct, slight hesitation
 * 3 - Correct, but difficult
 * 2 - Incorrect, but close
 * 1 - Incorrect, recognized answer
 * 0 - Complete blackout
 */

export interface SM2Item {
  interval: number;     // days until next review
  repetition: number;   // number of successful reviews
  easeFactor: number;   // multiplier (min 1.3)
}

export interface SM2Result extends SM2Item {
  nextReviewDate: Date;
}

export function calculateSM2(item: SM2Item, quality: number): SM2Result {
  let { interval, repetition, easeFactor } = item;

  // Clamp quality to 0-5
  quality = Math.max(0, Math.min(5, quality));

  // Update ease factor
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  if (quality < 3) {
    // Failed recall: reset
    repetition = 0;
    interval = 1;
  } else {
    // Successful recall
    if (repetition === 0) {
      interval = 1;       // Review tomorrow
    } else if (repetition === 1) {
      interval = 3;       // Review in 3 days
    } else if (repetition === 2) {
      interval = 7;       // Review in 7 days
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetition += 1;
  }

  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return { interval, repetition, easeFactor, nextReviewDate };
}

/**
 * Maps performance to SM-2 quality rating
 */
export function performanceToQuality(
  isCorrect: boolean,
  timeTakenMs: number,
  averageTimeMs: number = 30000
): number {
  if (!isCorrect) {
    // Wrong answer
    if (timeTakenMs < averageTimeMs * 0.5) return 1; // Quick wrong = recognized but confused
    return 0; // Slow wrong = complete blackout
  }

  // Correct answer
  if (timeTakenMs < averageTimeMs * 0.3) return 5;  // Very fast = perfect recall
  if (timeTakenMs < averageTimeMs * 0.7) return 4;  // Moderate = slight hesitation
  return 3;                                           // Slow = difficult recall
}
