'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Target, TrendingUp, Clock, FileText, RotateCcw, MessageSquare } from 'lucide-react';

import LandingPage from '@/components/LandingPage';

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
  badges: {
    id: string;
    name: string;
    icon: string;
    desc: string;
    unlocked: boolean;
  }[];
}

export default function DashboardPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [newBadge, setNewBadge] = useState<any | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    async function fetchStats() {
      try {
        const res = await fetch('/api/stats');
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        setStats(data);

        // Check for newly unlocked badges
        if (data.badges) {
          const unlockedBadgeIds = data.badges.filter((b: any) => b.unlocked).map((b: any) => b.id);
          const savedBadgesStr = localStorage.getItem('unlockedBadges');
          const savedBadges = savedBadgesStr ? JSON.parse(savedBadgesStr) : [];

          const newlyUnlocked = data.badges.find((b: any) => b.unlocked && !savedBadges.includes(b.id));

          if (newlyUnlocked) {
            setNewBadge(newlyUnlocked);
            localStorage.setItem('unlockedBadges', JSON.stringify([...new Set([...savedBadges, ...unlockedBadgeIds])]));
          } else {
            localStorage.setItem('unlockedBadges', JSON.stringify(unlockedBadgeIds));
          }
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [isLoaded, isSignedIn]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[var(--color-accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <LandingPage />;
  }

  if (!stats) return null;

  return (
    <div className="space-y-10 fade-in pb-10">
      {/* Welcome Section */}
      <section className="relative p-8 rounded-3xl overflow-hidden glass-card border-[var(--color-border)] shadow-sm">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-[var(--welcome-glow-1)] rounded-full blur-3xl transition-colors" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-[var(--welcome-glow-2)] rounded-full blur-3xl transition-colors" />
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-orange-400 to-amber-500">
            Welcome back, {user?.firstName || 'Student'}!
          </h1>
          <p className="text-lg md:text-xl font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Here&apos;s your learning analytics. Let&apos;s crush your goals today.
          </p>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<BookOpen className="w-8 h-8 text-rose-500" />}
          label="Documents"
          value={stats.totalDocuments}
          subtext="Total study materials"
          color="rgba(244, 63, 94, 0.1)"
        />
        <StatCard
          icon={<Target className="w-8 h-8 text-orange-500" />}
          label="Questions"
          value={stats.totalQuestionsAnswered}
          subtext="Answered this week"
          color="rgba(249, 115, 22, 0.1)"
        />
        <StatCard
          icon={<TrendingUp className="w-8 h-8 text-amber-500" />}
          label="Accuracy"
          value={`${stats.averageAccuracy}%`}
          subtext="Mastery level"
          color="rgba(245, 158, 11, 0.1)"
        />
        <StatCard
          icon={<Clock className="w-8 h-8 text-emerald-500" />}
          label="Study Time"
          value={`${stats.studyTimeToday}m`}
          subtext="Time spent today"
          color="rgba(16, 185, 129, 0.1)"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content: Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-8 h-full">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-600 to-orange-500">Recent Activity</h2>
              <Link href="/documents" className="text-sm font-bold uppercase tracking-wider transition-colors" style={{ color: 'var(--color-accent-primary)' }}>
                View All →
              </Link>
            </div>

            <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-[19px] before:w-[2px] before:bg-[var(--color-border)] before:z-0">
              {stats.recentActivity.length === 0 ? (
                <div className="text-center py-16 px-4 bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] relative z-10 shadow-sm">
                  <p className="text-lg font-medium mb-6" style={{ color: 'var(--color-text-secondary)' }}>No recent activity yet. Start by uploading some notes in the chat!</p>
                  <Link href="/chat" className="btn-primary inline-block px-8 py-3 text-lg shadow-[0_4px_14px_rgba(244,63,94,0.3)]">
                    Open Chat
                  </Link>
                </div>
              ) : (
                stats.recentActivity.map((activity, i) => (
                  <div key={i} className="flex gap-6 group relative z-10">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm ring-4 ring-[var(--color-bg-card)] z-10 bg-rose-50 border border-rose-100 transition-transform group-hover:scale-110">
                        {activity.type === 'upload' ? <FileText className="w-5 h-5 text-rose-500" /> : activity.type === 'quiz' ? <Target className="w-5 h-5 text-orange-500" /> : <RotateCcw className="w-5 h-5 text-amber-500" />}
                      </div>
                    </div>
                    <div className="pb-8 flex-1">
                      <div className="bg-[var(--color-bg-secondary)] p-5 rounded-2xl border border-[var(--color-border)] group-hover:border-rose-200 transition-all shadow-sm group-hover:shadow-[0_4px_20px_rgba(244,63,94,0.05)]">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{activity.title}</p>
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-500">{activity.timestamp}</span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{activity.description}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: Topic Strength & Actions */}
        <div className="space-y-8">
          {/* Quick Actions */}
          <div className="glass-card p-1 shadow-sm">
            <div className="bg-gradient-to-br from-rose-500/5 to-orange-500/5 rounded-2xl p-6 h-full border border-[var(--color-border)]">
              <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>Quick Actions</h2>
              <div className="grid grid-cols-2 gap-4">
                <Link href="/chat" className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-card-hover)] transition-all border border-[var(--color-border)] hover:border-rose-500/30 group shadow-sm">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                    <FileText className="w-6 h-6 text-rose-500" />
                  </div>
                  <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Upload</span>
                </Link>
                <Link href="/chat" className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-card-hover)] transition-all border border-[var(--color-border)] hover:border-orange-500/30 group shadow-sm">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                    <MessageSquare className="w-6 h-6 text-orange-500" />
                  </div>
                  <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Chat</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Topic Strength */}
          <div className="glass-card p-8 shadow-sm">
            <h2 className="text-xl font-bold mb-8 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <Target className="w-5 h-5 text-rose-500" /> Topic Mastery
            </h2>
            <div className="space-y-6">
              {stats.topicStrength.length === 0 ? (
                <div className="text-center py-8 bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] shadow-sm">
                  <p className="text-sm px-4" style={{ color: 'var(--color-text-secondary)' }}>
                    Upload notes and take quizzes to see your strengths here
                  </p>
                </div>
              ) : (
                stats.topicStrength.slice(0, 5).map((topic, i) => (
                  <div key={i} className="space-y-2 group">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold transition-colors truncate max-w-[180px]" style={{ color: 'var(--color-text-primary)' }}>{topic.name}</span>
                      <span className="font-bold bg-slate-100 px-2 py-1 rounded-md" style={{
                        color: topic.strength >= 80 ? 'var(--color-success)' : topic.strength >= 50 ? 'var(--color-warning)' : 'var(--color-danger)'
                      }}>
                        {topic.strength}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                      <div
                        className="h-full rounded-full transition-all duration-1000 relative overflow-hidden"
                        style={{
                          width: `${topic.strength}%`,
                          background: topic.strength >= 80 ? 'linear-gradient(90deg, #10b981, #34d399)' : topic.strength >= 50 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)'
                        }}
                      >
                        <div className="absolute inset-0 bg-white/30 w-full h-full transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out"></div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Badges Section */}
          <div className="glass-card p-8 shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              🏆 Your Badges
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {stats.badges?.map((badge) => (
                <div
                  key={badge.id}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] text-center transition-all ${badge.unlocked
                      ? 'shadow-sm hover:scale-105 cursor-default hover:border-[var(--color-accent-secondary)]'
                      : 'opacity-40 grayscale cursor-not-allowed'
                    }`}
                  title={badge.desc}
                >
                  <div className="text-3xl mb-2">{badge.icon}</div>
                  <span className="text-[10px] font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                    {badge.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Badge Unlock Popup */}
      {newBadge && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" style={{ animation: 'fadeIn 0.3s ease-out' }}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center border border-rose-100" style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div className="text-7xl mb-4 animate-bounce" style={{ filter: 'drop-shadow(0 10px 15px rgba(244,63,94,0.3))' }}>{newBadge.icon}</div>
            <h2 className="text-2xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500">Badge Unlocked!</h2>
            <p className="text-lg font-bold text-[var(--color-text-primary)] mb-1">{newBadge.name}</p>
            <p className="text-sm text-[var(--color-text-secondary)] mb-8">{newBadge.desc}</p>
            <button
              onClick={() => setNewBadge(null)}
              className="btn-primary w-full py-3 shadow-[0_8px_30px_rgba(244,63,94,0.2)] hover:shadow-[0_8px_30px_rgba(244,63,94,0.4)]"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, subtext, color }: { icon: React.ReactNode; label: string; value: string | number; subtext: string; color: string }) {
  return (
    <div className="glass-card p-6 flex items-start gap-4 shadow-sm border border-[var(--color-border)]">
      <div className="text-3xl p-3 rounded-2xl border border-slate-100 shadow-sm" style={{ background: color }}>
        {icon}
      </div>
      <div className="relative z-10">
        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
          {label}
        </p>
        <p className="text-3xl font-black tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {subtext}
        </p>
      </div>
    </div>
  );
}
