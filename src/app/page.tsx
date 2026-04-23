'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardStats {
  totalDocuments: number;
  totalQuestionsAnswered: number;
  averageAccuracy: number;
  studyTimeToday: number;
  recentActivity: {
    type: 'upload' | 'quiz' | 'review';
    title: string;
    timestamp: string;
    description: string;
  }[];
  topicStrength: {
    name: string;
    strength: number; // 0-100
  }[];
}

export default function DashboardPage() {
  const { user } = useUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[var(--color-accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8 fade-in">
      {/* Welcome Section */}
      <section>
        <h1 className="text-4xl font-bold gradient-text">
          Welcome back, {user?.firstName || 'Student'}!
        </h1>
        <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
          Here&apos;s your study progress for today. Ready to learn something new?
        </p>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon="📚" 
          label="Documents" 
          value={stats.totalDocuments} 
          subtext="Total study materials"
        />
        <StatCard 
          icon="🎯" 
          label="Questions" 
          value={stats.totalQuestionsAnswered} 
          subtext="Answered this week"
        />
        <StatCard 
          icon="📈" 
          label="Accuracy" 
          value={`${stats.averageAccuracy}%`} 
          subtext="Mastery level"
        />
        <StatCard 
          icon="⏱️" 
          label="Study Time" 
          value={`${stats.studyTimeToday}m`} 
          subtext="Time spent today"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content: Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Recent Activity</h2>
              <Link href="/documents" className="text-sm font-medium hover:underline" style={{ color: 'var(--color-accent-primary)' }}>
                View All
              </Link>
            </div>
            
            <div className="space-y-6">
              {stats.recentActivity.length === 0 ? (
                <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
                  <p>No recent activity yet. Start by uploading some notes in the chat!</p>
                  <Link href="/chat" className="btn-primary mt-4 inline-block">
                    Open Chat
                  </Link>
                </div>
              ) : (
                stats.recentActivity.map((activity, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: 'rgba(124, 58, 237, 0.15)' }}>
                        {activity.type === 'upload' ? '📄' : activity.type === 'quiz' ? '🎯' : '🔄'}
                      </div>
                      {i !== stats.recentActivity.length - 1 && (
                        <div className="w-0.5 h-full mt-2" style={{ background: 'var(--color-border)' }} />
                      )}
                    </div>
                    <div className="pb-6">
                      <p className="font-bold">{activity.title}</p>
                      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{activity.description}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{activity.timestamp}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: Topic Strength */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-xl font-bold mb-6">Topic Strength</h2>
            <div className="space-y-4">
              {stats.topicStrength.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
                  Upload notes and take quizzes to see your topic strengths
                </p>
              ) : (
                stats.topicStrength.slice(0, 5).map((topic, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate max-w-[150px]">{topic.name}</span>
                      <span className="font-bold" style={{ 
                        color: topic.strength >= 80 ? 'var(--color-success)' : topic.strength >= 50 ? 'var(--color-accent-primary)' : 'var(--color-danger)'
                      }}>
                        {topic.strength}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ 
                          width: `${topic.strength}%`,
                          background: topic.strength >= 80 ? 'var(--color-success)' : topic.strength >= 50 ? 'var(--color-accent-primary)' : 'var(--color-danger)'
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-6 bg-gradient-to-br from-[rgba(124,58,237,0.1)] to-transparent">
            <h2 className="text-xl font-bold mb-4">Quick Start</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/chat" className="flex flex-col items-center justify-center p-4 rounded-xl hover:bg-[rgba(255,255,255,0.05)] transition-colors border border-[var(--color-border)]">
                <span className="text-2xl mb-2">📄</span>
                <span className="text-xs font-bold uppercase tracking-wider">Upload Notes</span>
              </Link>
              <Link href="/chat" className="flex flex-col items-center justify-center p-4 rounded-xl hover:bg-[rgba(255,255,255,0.05)] transition-colors border border-[var(--color-border)]">
                <span className="text-2xl mb-1">💬</span>
                <span className="text-xs font-bold uppercase tracking-wider">AI Chat</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subtext }: { icon: string; label: string; value: string | number; subtext: string }) {
  return (
    <div className="glass-card p-6 flex items-start gap-4 hover:scale-[1.02] transition-transform duration-300">
      <div className="text-3xl p-3 rounded-2xl" style={{ background: 'rgba(124, 58, 237, 0.1)' }}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
          {label}
        </p>
        <p className="text-3xl font-black">{value}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {subtext}
        </p>
      </div>
    </div>
  );
}
