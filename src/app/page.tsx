'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  totalAnswered: number;
  accuracy: number;
  streak: number;
  dueReviews: number;
  documentCount: number;
  weakTopics: {
    topicId: string;
    topicName: string;
    strength: 'strong' | 'medium' | 'weak';
    accuracy: number;
    totalAnswered: number;
    recentTrend: 'improving' | 'declining' | 'stable';
  }[];
  dailyAccuracy: { date: string; accuracy: number }[];
}

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) return;
    const duration = 1000;
    const stepTime = duration / end;
    const timer = setInterval(() => {
      start += 1;
      setDisplay(start);
      if (start >= end) clearInterval(timer);
    }, Math.max(stepTime, 16));
    return () => clearInterval(timer);
  }, [value]);

  return <span>{display}{suffix}</span>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--color-accent-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading your study data...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Documents',
      value: stats?.documentCount || 0,
      icon: '📚',
      gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    },
    {
      label: 'Questions Answered',
      value: stats?.totalAnswered || 0,
      icon: '✅',
      gradient: 'linear-gradient(135deg, #06b6d4, #22d3ee)',
    },
    {
      label: 'Accuracy',
      value: stats?.accuracy || 0,
      icon: '🎯',
      suffix: '%',
      gradient: 'linear-gradient(135deg, #22c55e, #4ade80)',
    },
    {
      label: 'Study Streak',
      value: stats?.streak || 0,
      icon: '🔥',
      suffix: ' days',
      gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
          <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Your learning overview at a glance
          </p>
        </div>
        <Link href="/upload" className="btn-primary flex items-center gap-2">
          <span>+</span> Upload Notes
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="glass-card p-6 slide-up"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: card.gradient }}
              >
                {card.icon}
              </span>
            </div>
            <div
              className="text-3xl font-bold mb-1"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <AnimatedCounter value={card.value} suffix={card.suffix || ''} />
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {/* Due Reviews Alert */}
      {(stats?.dueReviews || 0) > 0 && (
        <Link
          href="/review"
          className="glass-card p-5 flex items-center justify-between pulse-glow cursor-pointer block"
        >
          <div className="flex items-center gap-4">
            <span className="text-3xl">⏰</span>
            <div>
              <p className="font-semibold text-lg">
                You have {stats?.dueReviews} cards due for review
              </p>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Don&apos;t break your streak! Review now to strengthen your memory.
              </p>
            </div>
          </div>
          <span className="btn-primary hidden sm:inline-block">Start Review</span>
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weak Topics */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>🎯</span> Topic Strengths
          </h2>
          {!stats?.weakTopics?.length ? (
            <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
              <p className="text-4xl mb-3">📝</p>
              <p>Upload notes and take quizzes to see your topic strengths</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.weakTopics.map((topic) => (
                <div
                  key={topic.topicId}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(10, 10, 26, 0.5)' }}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-sm">{topic.topicName}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {topic.totalAnswered} questions •{' '}
                        {topic.recentTrend === 'improving'
                          ? '📈 Improving'
                          : topic.recentTrend === 'declining'
                          ? '📉 Declining'
                          : '➡️ Stable'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-sm font-mono font-bold"
                      style={{
                        color:
                          topic.strength === 'strong'
                            ? 'var(--color-success)'
                            : topic.strength === 'medium'
                            ? 'var(--color-warning)'
                            : 'var(--color-danger)',
                      }}
                    >
                      {topic.accuracy}%
                    </span>
                    <span className={`strength-badge strength-${topic.strength}`}>
                      {topic.strength}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accuracy Chart */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>📈</span> 7-Day Accuracy
          </h2>
          {!stats?.dailyAccuracy?.some((d) => d.accuracy > 0) ? (
            <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
              <p className="text-4xl mb-3">📊</p>
              <p>Start answering questions to see your accuracy trend</p>
            </div>
          ) : (
            <div className="flex items-end gap-2 h-48">
              {stats.dailyAccuracy.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span
                    className="text-xs font-mono"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {day.accuracy}%
                  </span>
                  <div
                    className="w-full rounded-t-lg transition-all duration-500"
                    style={{
                      height: `${Math.max(day.accuracy * 1.5, 4)}px`,
                      background:
                        day.accuracy >= 80
                          ? 'linear-gradient(to top, #22c55e, #4ade80)'
                          : day.accuracy >= 50
                          ? 'linear-gradient(to top, #eab308, #fbbf24)'
                          : day.accuracy > 0
                          ? 'linear-gradient(to top, #ef4444, #f87171)'
                          : 'var(--color-border)',
                    }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/upload" className="glass-card p-6 text-center group cursor-pointer block">
          <span className="text-4xl block mb-3 group-hover:scale-110 transition-transform">📄</span>
          <p className="font-semibold">Upload Notes</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            PDF or text files
          </p>
        </Link>
        <Link href="/quiz" className="glass-card p-6 text-center group cursor-pointer block">
          <span className="text-4xl block mb-3 group-hover:scale-110 transition-transform">🎯</span>
          <p className="font-semibold">Take a Quiz</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Test your knowledge
          </p>
        </Link>
        <Link href="/chat" className="glass-card p-6 text-center group cursor-pointer block">
          <span className="text-4xl block mb-3 group-hover:scale-110 transition-transform">💬</span>
          <p className="font-semibold">Ask AI</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Chat with your notes
          </p>
        </Link>
      </div>
    </div>
  );
}
