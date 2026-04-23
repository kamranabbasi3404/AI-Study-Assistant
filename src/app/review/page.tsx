'use client';

import { useEffect, useState } from 'react';
import { Target, BarChart2, Check, CheckCircle, PartyPopper, ClipboardList, Pencil, Lightbulb, Pointer, Frown, Meh, Smile, Star } from 'lucide-react';

interface ReviewItem {
  _id: string;
  question: {
    _id: string;
    question: string;
    correctAnswer: string;
    explanation: string;
    type: string;
    difficulty: string;
    options: string[];
  };
  interval: number;
  repetition: number;
  easeFactor: number;
}

export default function ReviewPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completed, setCompleted] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/review');
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch {
      console.error('Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  };

  const rateCard = async (quality: number) => {
    const review = reviews[currentIndex];
    if (!review) return;

    try {
      await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: review.question._id,
          quality,
        }),
      });

      setCompleted((c) => c + 1);
      setShowAnswer(false);

      if (currentIndex + 1 >= reviews.length) {
        setCurrentIndex(-1); // All done
      } else {
        setCurrentIndex((i) => i + 1);
      }
    } catch {
      console.error('Failed to rate card');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[var(--color-accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 fade-in">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Spaced Repetition Review</h1>
        <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Review cards due today to strengthen your memory
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center">
          <div className="text-[var(--color-accent-primary)] mb-4"><PartyPopper className="w-16 h-16" /></div>
          <h2 className="text-2xl font-bold mb-2">All caught up!</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>
            No cards due for review right now. Take a quiz to add more cards to your review schedule.
          </p>
          <a href="/quiz" className="btn-primary inline-flex items-center mt-6"><Target className="w-4 h-4 mr-2" /> Take a Quiz</a>
        </div>
      ) : currentIndex < 0 ? (
        // All reviews complete
        <div className="glass-card p-12 text-center flex flex-col items-center">
          <CheckCircle className="w-16 h-16 text-[var(--color-success)] mb-4" />
          <h2 className="text-2xl font-bold mb-2">Review Session Complete!</h2>
          <p className="mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            You reviewed <strong>{completed}</strong> cards. Great work!
          </p>
          <p className="mb-6" style={{ color: 'var(--color-text-muted)' }}>
            Come back later for more reviews based on the spaced repetition schedule.
          </p>
          <div className="flex justify-center gap-4 w-full">
            <a href="/" className="btn-primary inline-flex items-center"><BarChart2 className="w-4 h-4 mr-2" /> Dashboard</a>
            <a href="/quiz" className="btn-secondary inline-flex items-center"><Target className="w-4 h-4 mr-2" /> Take a Quiz</a>
          </div>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono" style={{ color: 'var(--color-text-muted)' }}>
              {currentIndex + 1} / {reviews.length} cards
            </span>
            <span className="text-sm flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
              <Check className="w-4 h-4 text-[var(--color-success)]" /> {completed} reviewed
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--color-border)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(completed / reviews.length) * 100}%`,
                background: 'linear-gradient(90deg, var(--color-accent-primary), var(--color-accent-secondary))',
              }}
            />
          </div>

          {/* Flashcard */}
          <div
            className="glass-card p-8 min-h-[300px] flex flex-col justify-center cursor-pointer transition-all duration-500"
            onClick={() => !showAnswer && setShowAnswer(true)}
            style={{
              transform: showAnswer ? 'rotateY(0)' : 'rotateY(0)',
            }}
          >
            {!showAnswer ? (
              <div className="text-center">
                <span className="text-xs px-3 py-1 rounded-lg inline-flex items-center gap-1 mb-6" style={{ background: 'rgba(37,99,235,0.15)', color: 'var(--color-accent-primary)' }}>
                  {reviews[currentIndex].question.type === 'mcq' ? <><ClipboardList className="w-3 h-3" /> MCQ</> : reviews[currentIndex].question.type === 'short_answer' ? <><Pencil className="w-3 h-3" /> Short Answer</> : <><Lightbulb className="w-3 h-3" /> Concept</>}
                </span>
                <h2 className="text-xl font-semibold leading-relaxed mb-8">
                  {reviews[currentIndex].question.question}
                </h2>
                <p className="text-sm flex items-center justify-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                  <Pointer className="w-4 h-4" /> Tap to reveal answer
                </p>
              </div>
            ) : (
              <div className="text-center slide-up">
                <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>ANSWER</p>
                <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-success)' }}>
                  {reviews[currentIndex].question.correctAnswer}
                </h2>
                {reviews[currentIndex].question.explanation && (
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {reviews[currentIndex].question.explanation}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Rating Buttons */}
          {showAnswer && (
            <div className="slide-up">
              <p className="text-sm text-center mb-3" style={{ color: 'var(--color-text-muted)' }}>
                How well did you recall this?
              </p>
              <div className="grid grid-cols-4 gap-3">
                <button
                  onClick={() => rateCard(0)}
                  className="py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-1 transition-all hover:scale-105"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  <Frown className="w-4 h-4" /> Forgot
                </button>
                <button
                  onClick={() => rateCard(2)}
                  className="py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-1 transition-all hover:scale-105"
                  style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308', border: '1px solid rgba(234,179,8,0.3)' }}
                >
                  <Meh className="w-4 h-4" /> Hard
                </button>
                <button
                  onClick={() => rateCard(4)}
                  className="py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-1 transition-all hover:scale-105"
                  style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}
                >
                  <Smile className="w-4 h-4" /> Good
                </button>
                <button
                  onClick={() => rateCard(5)}
                  className="py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-1 transition-all hover:scale-105"
                  style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
                >
                  <Star className="w-4 h-4" /> Easy
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
