'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ConfirmDialog from '@/components/ConfirmDialog';
interface Document {
  _id: string;
  title: string;
  originalFilename: string;
  topicCount: number;
  chunkCount: number;
  createdAt: string;
  topics: { _id: string; name: string; difficultyLevel: string }[];
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch {
      console.error('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const requestDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    
    setDeleting(id);
    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      setDocuments((docs) => docs.filter((d) => d._id !== id));
    } catch {
      console.error('Failed to delete document');
    } finally {
      setDeleting(null);
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
    <div className="max-w-5xl mx-auto space-y-8 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Document Library</h1>
          <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded
          </p>
        </div>
        <Link href="/chat" className="btn-primary flex items-center gap-2">
          <span>+</span> Upload New
        </Link>
      </div>

      {documents.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <span className="text-7xl block mb-4">📚</span>
          <h2 className="text-2xl font-bold mb-2">No documents yet</h2>
          <p className="mb-6" style={{ color: 'var(--color-text-muted)' }}>
            Upload your study notes to get started with AI-powered learning.
          </p>
          <Link href="/chat" className="btn-primary inline-block">Go to Chat to Upload</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 items-start">
          {documents.map((doc, i) => (
            <div
              key={doc._id}
              className="glass-card p-6 slide-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
                  >
                    📄
                  </span>
                  <div>
                    <h3 className="font-bold text-sm">{doc.title}</h3>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {doc.originalFilename}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => requestDelete(doc._id)}
                  disabled={deleting === doc._id}
                  className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-sm"
                  style={{ color: 'var(--color-text-muted)' }}
                  title="Delete document"
                >
                  {deleting === doc._id ? '⏳' : '🗑️'}
                </button>
              </div>

              <div className="flex items-center gap-4 mb-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <span>📊 {doc.chunkCount} chunks</span>
                <span>🏷️ {doc.topicCount} topics</span>
                <span>📅 {new Date(doc.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Topics */}
              <div className="flex flex-wrap gap-2">
                {(expandedDocs[doc._id] ? doc.topics : doc.topics.slice(0, 4)).map((topic) => (
                  <span
                    key={topic._id}
                    className="text-xs px-3 py-1 rounded-lg transition-all"
                    style={{
                      background: 'rgba(124, 58, 237, 0.1)',
                      color: 'var(--color-accent-secondary)',
                      border: '1px solid rgba(124, 58, 237, 0.2)',
                    }}
                  >
                    {topic.name}
                  </span>
                ))}
                {doc.topics.length > 4 && (
                  <button
                    onClick={() => setExpandedDocs(prev => ({ ...prev, [doc._id]: !prev[doc._id] }))}
                    className="text-xs px-3 py-1 rounded-lg transition-colors hover:bg-[rgba(255,255,255,0.1)] font-medium"
                    style={{
                      color: 'var(--color-text-secondary)',
                      border: '1px dashed var(--color-border)',
                    }}
                  >
                    {expandedDocs[doc._id] ? 'Show Less' : `+${doc.topics.length - 4} More`}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        title="Delete Document"
        message="Are you sure you want to delete this document? All related quizzes, performance data, and review schedules will also be deleted. This action cannot be undone."
        confirmText="Delete Document"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
