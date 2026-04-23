'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Question {
  _id: string;
  type: 'mcq' | 'short_answer' | 'concept';
  difficulty: string;
  question: string;
  options: string[];
}

interface AnswerResult {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
}

export default function ActiveQuizPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [textAnswer, setTextAnswer] = useState('');
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [timer, setTimer] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [quizComplete, setQuizComplete] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());

  useEffect(() => {
    const stored = sessionStorage.getItem('currentQuiz');
    if (!stored) {
      router.push('/quiz');
      return;
    }
    const data = JSON.parse(stored);
    setQuestions(data.questions || []);
  }, [router]);

  // Timer
  useEffect(() => {
    if (quizComplete) return;
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [quizComplete]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const submitAnswer = useCallback(async () => {
    const q = questions[currentIndex];
    if (!q) return;

    const answer = q.type === 'mcq' ? selectedAnswer : textAnswer;
    if (!answer.trim()) return;

    setSubmitting(true);
    const timeTaken = Date.now() - startTime;

    try {
      const res = await fetch('/api/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: q._id,
          answer: answer.trim(),
          timeTakenMs: timeTaken,
        }),
      });

      const data = await res.json();
      setResult(data);
      setScore((prev) => ({
        correct: prev.correct + (data.isCorrect ? 1 : 0),
        total: prev.total + 1,
      }));
    } catch {
      setResult({
        isCorrect: false,
        correctAnswer: 'Error checking answer',
        explanation: 'Could not verify your answer. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }, [questions, currentIndex, selectedAnswer, textAnswer, startTime]);

  const nextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      setQuizComplete(true);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedAnswer('');
    setTextAnswer('');
    setResult(null);
    setStartTime(Date.now());
  };

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[var(--color-accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Quiz Complete Screen
  if (quizComplete) {
    const percentage = Math.round((score.correct / score.total) * 100);
    return (
      <div className="max-w-2xl mx-auto fade-in">
        <div className="glass-card p-8 text-center space-y-6">
          <span className="text-7xl block">
            {percentage >= 80 ? '🏆' : percentage >= 50 ? '💪' : '📖'}
          </span>
          <h1 className="text-3xl font-bold gradient-text">Quiz Complete!</h1>

          <div className="flex items-center justify-center gap-8">
            <div>
              <p className="text-4xl font-bold" style={{ fontFamily: 'var(--font-mono)', color: percentage >= 80 ? 'var(--color-success)' : percentage >= 50 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                {percentage}%
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Accuracy</p>
            </div>
            <div>
              <p className="text-4xl font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
                {score.correct}/{score.total}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Correct</p>
            </div>
            <div>
              <p className="text-4xl font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
                {formatTime(timer)}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Time</p>
            </div>
          </div>

          <p style={{ color: 'var(--color-text-secondary)' }}>
            {percentage >= 80
              ? 'Excellent work! Keep pushing to master these topics! 🌟'
              : percentage >= 50
              ? 'Good effort! Review the weak areas and try again. 💪'
              : 'Keep studying! The spaced repetition system will help you improve. 📚'}
          </p>

          <div className="flex justify-center gap-4">
            <button onClick={() => router.push('/quiz')} className="btn-primary">
              🎯 New Quiz
            </button>
            <button onClick={() => router.push('/review')} className="btn-secondary">
              🔄 Review Cards
            </button>
            <button onClick={() => router.push('/')} className="btn-secondary">
              📊 Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="max-w-3xl mx-auto space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-mono px-3 py-1 rounded-lg" style={{ background: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}>
            {currentIndex + 1}/{questions.length}
          </span>
          <span className={`strength-badge strength-${currentQ.difficulty === 'easy' ? 'strong' : currentQ.difficulty === 'hard' ? 'weak' : 'medium'}`}>
            {currentQ.difficulty}
          </span>
          <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--color-accent-secondary)' }}>
            {currentQ.type === 'mcq' ? '📋 MCQ' : currentQ.type === 'short_answer' ? '✏️ Short Answer' : '💡 Concept'}
          </span>
        </div>
        <span className="font-mono text-lg" style={{ color: 'var(--color-accent-cyan)' }}>
          ⏱ {formatTime(timer)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--color-border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${((currentIndex + (result ? 1 : 0)) / questions.length) * 100}%`,
            background: 'linear-gradient(90deg, #7c3aed, #a855f7, #ec4899)',
          }}
        />
      </div>

      {/* Question Card */}
      <div className="glass-card p-8">
        <h2 className="text-xl font-semibold mb-6 leading-relaxed">{currentQ.question}</h2>

        {/* MCQ Options */}
        {currentQ.type === 'mcq' && (
          <div className="space-y-3">
            {currentQ.options.map((option, i) => {
              const letter = option.charAt(0);
              const isSelected = selectedAnswer === option;
              const isCorrect = result && result.correctAnswer.includes(letter);
              const isWrong = result && isSelected && !result.isCorrect;

              return (
                <button
                  key={i}
                  onClick={() => !result && setSelectedAnswer(option)}
                  disabled={!!result}
                  className={`w-full p-4 rounded-xl text-left transition-all duration-200 border ${
                    result
                      ? isCorrect
                        ? 'border-green-500 bg-green-500/10'
                        : isWrong
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-[var(--color-border)] opacity-50'
                      : isSelected
                      ? 'border-[var(--color-accent-primary)] bg-[rgba(124,58,237,0.1)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-accent-primary)] bg-[rgba(10,10,26,0.3)]'
                  }`}
                >
                  <span className="font-medium text-sm">{option}</span>
                  {result && isCorrect && <span className="float-right text-green-400">✓</span>}
                  {result && isWrong && <span className="float-right text-red-400">✗</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Text Answer */}
        {(currentQ.type === 'short_answer' || currentQ.type === 'concept') && (
          <textarea
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            disabled={!!result}
            placeholder={
              currentQ.type === 'short_answer'
                ? 'Type your answer (1-2 sentences)...'
                : 'Explain the concept in detail...'
            }
            className="w-full p-4 rounded-xl border text-sm resize-none"
            style={{
              background: 'rgba(10, 10, 26, 0.5)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
              minHeight: currentQ.type === 'concept' ? '120px' : '80px',
            }}
          />
        )}
      </div>

      {/* Result Feedback */}
      {result && (
        <div
          className={`glass-card p-6 slide-up border ${
            result.isCorrect ? 'border-green-500/30' : 'border-red-500/30'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{result.isCorrect ? '🎉' : '💡'}</span>
            <p className="text-lg font-bold" style={{ color: result.isCorrect ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {result.isCorrect ? 'Correct!' : 'Not quite right'}
            </p>
          </div>
          {!result.isCorrect && (
            <p className="text-sm mb-2">
              <span className="font-semibold" style={{ color: 'var(--color-success)' }}>Correct Answer: </span>
              {result.correctAnswer}
            </p>
          )}
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {result.explanation}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        {!result ? (
          <button
            onClick={submitAnswer}
            disabled={submitting || (!selectedAnswer && !textAnswer.trim())}
            className={`py-3 px-8 rounded-xl font-bold transition-all ${
              submitting || (!selectedAnswer && !textAnswer.trim())
                ? 'bg-[rgba(42,42,90,0.3)] text-[var(--color-text-muted)] cursor-not-allowed'
                : 'btn-primary'
            }`}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Checking...
              </span>
            ) : (
              'Submit Answer'
            )}
          </button>
        ) : (
          <button onClick={nextQuestion} className="btn-primary py-3 px-8">
            {currentIndex + 1 >= questions.length ? '🏁 Finish Quiz' : 'Next Question →'}
          </button>
        )}
      </div>
    </div>
  );
}
