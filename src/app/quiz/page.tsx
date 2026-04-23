'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DocumentWithTopics {
  _id: string;
  title: string;
  topics: {
    _id: string;
    name: string;
    difficultyLevel: string;
  }[];
}

export default function QuizPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentWithTopics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['mcq', 'short_answer', 'concept']);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch('/api/documents')
      .then((r) => r.json())
      .then((data) => {
        setDocuments(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    if (!selectedTopic) return;
    setGenerating(true);

    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: selectedTopic,
          count: questionCount,
          types: selectedTypes,
        }),
      });

      const data = await res.json();
      if (data.questions) {
        // Store in sessionStorage for the quiz page
        sessionStorage.setItem('currentQuiz', JSON.stringify(data));
        router.push('/quiz/active');
      }
    } catch (err) {
      console.error('Quiz generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[var(--color-accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const allTopics = documents.flatMap((doc) =>
    doc.topics.map((t) => ({ ...t, documentTitle: doc.title }))
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 fade-in">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Start a Quiz</h1>
        <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Select a topic and customize your quiz settings
        </p>
      </div>

      {allTopics.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <span className="text-6xl block mb-4">📝</span>
          <p className="text-xl font-semibold mb-2">No topics yet</p>
          <p className="mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Upload your study notes first to generate quiz topics.
          </p>
          <a href="/upload" className="btn-primary inline-block">Upload Notes</a>
        </div>
      ) : (
        <>
          {/* Topic Selection */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-4">📚 Select Topic</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allTopics.map((topic) => (
                <button
                  key={topic._id}
                  onClick={() => setSelectedTopic(topic._id)}
                  className={`p-4 rounded-xl text-left transition-all duration-200 border ${
                    selectedTopic === topic._id
                      ? 'border-[var(--color-accent-primary)] bg-[rgba(124,58,237,0.1)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-accent-primary)] bg-[rgba(10,10,26,0.5)]'
                  }`}
                >
                  <p className="font-semibold text-sm">{topic.name}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    From: {topic.documentTitle}
                  </p>
                  <span className={`strength-badge mt-2 inline-block strength-${topic.difficultyLevel === 'easy' ? 'strong' : topic.difficultyLevel === 'hard' ? 'weak' : 'medium'}`}>
                    {topic.difficultyLevel}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Quiz Settings */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-4">⚙️ Quiz Settings</h2>

            {/* Question Count */}
            <div className="mb-6">
              <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--color-text-secondary)' }}>
                Number of Questions
              </label>
              <div className="flex gap-2">
                {[3, 5, 8, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setQuestionCount(n)}
                    className={`px-5 py-2 rounded-xl font-semibold text-sm transition-all ${
                      questionCount === n
                        ? 'bg-[var(--color-accent-primary)] text-white'
                        : 'bg-[rgba(42,42,90,0.5)] text-[var(--color-text-secondary)] hover:bg-[rgba(42,42,90,0.8)]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Types */}
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--color-text-secondary)' }}>
                Question Types
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'mcq', label: '📋 Multiple Choice', emoji: '📋' },
                  { value: 'short_answer', label: '✏️ Short Answer', emoji: '✏️' },
                  { value: 'concept', label: '💡 Concept Based', emoji: '💡' },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => {
                      setSelectedTypes((prev) =>
                        prev.includes(type.value)
                          ? prev.filter((t) => t !== type.value)
                          : [...prev, type.value]
                      );
                    }}
                    className={`px-4 py-2 rounded-xl font-medium text-sm transition-all border ${
                      selectedTypes.includes(type.value)
                        ? 'border-[var(--color-accent-primary)] bg-[rgba(124,58,237,0.15)] text-[var(--color-accent-secondary)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-primary)]'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleGenerate}
            disabled={!selectedTopic || selectedTypes.length === 0 || generating}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              !selectedTopic || generating
                ? 'bg-[rgba(42,42,90,0.3)] text-[var(--color-text-muted)] cursor-not-allowed'
                : 'btn-primary'
            }`}
          >
            {generating ? (
              <span className="flex items-center justify-center gap-3">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating Quiz...
              </span>
            ) : (
              '🚀 Start Quiz'
            )}
          </button>
        </>
      )}
    </div>
  );
}
