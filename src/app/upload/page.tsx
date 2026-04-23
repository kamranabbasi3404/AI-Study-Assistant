'use client';

import { useState, useCallback } from 'react';

interface ProcessingResult {
  documentId: string;
  title: string;
  topicCount: number;
  chunkCount: number;
  topics: { name: string; difficulty: string }[];
}

type ProcessingStep = 'idle' | 'uploading' | 'extracting' | 'chunking' | 'embedding' | 'detecting' | 'done' | 'error';

const stepLabels: Record<ProcessingStep, string> = {
  idle: 'Ready to upload',
  uploading: 'Uploading file...',
  extracting: 'Extracting text from document...',
  chunking: 'Splitting into smart chunks...',
  embedding: 'Generating AI embeddings...',
  detecting: 'Detecting topics...',
  done: 'Processing complete!',
  error: 'Processing failed',
};

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [step, setStep] = useState<ProcessingStep>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUpload = useCallback(async (file: File) => {
    if (!file.name.match(/\.(pdf|txt)$/i)) {
      setError('Please upload a PDF or TXT file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB');
      return;
    }

    setSelectedFile(file);
    setError('');
    setStep('uploading');

    // Simulate pipeline steps for UX
    const steps: ProcessingStep[] = ['extracting', 'chunking', 'embedding', 'detecting'];
    let stepIndex = 0;
    const stepTimer = setInterval(() => {
      if (stepIndex < steps.length) {
        setStep(steps[stepIndex]);
        stepIndex++;
      }
    }, 2000);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      clearInterval(stepTimer);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await res.json();
      setResult(data);
      setStep('done');
    } catch (err) {
      clearInterval(stepTimer);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStep('error');
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const stepProgress = {
    idle: 0,
    uploading: 15,
    extracting: 30,
    chunking: 50,
    embedding: 70,
    detecting: 85,
    done: 100,
    error: 0,
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 fade-in">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Upload Study Notes</h1>
        <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Upload your PDF or text notes. Our AI will extract topics, generate embeddings, and prepare your study material.
        </p>
      </div>

      {/* Upload Zone */}
      <div
        className={`relative glass-card p-12 text-center cursor-pointer transition-all duration-300 ${
          dragOver ? 'scale-[1.02]' : ''
        }`}
        style={{
          borderStyle: 'dashed',
          borderWidth: '2px',
          borderColor: dragOver
            ? 'var(--color-accent-primary)'
            : step === 'error'
            ? 'var(--color-danger)'
            : 'var(--color-border)',
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => {
          if (step === 'idle' || step === 'done' || step === 'error') {
            document.getElementById('file-input')?.click();
          }
        }}
      >
        <input
          id="file-input"
          type="file"
          accept=".pdf,.txt"
          className="hidden"
          onChange={handleFileSelect}
        />

        {step === 'idle' || step === 'error' ? (
          <>
            <div className="text-6xl mb-4">
              {dragOver ? '📥' : '📄'}
            </div>
            <p className="text-xl font-semibold mb-2">
              {dragOver ? 'Drop your file here' : 'Drag & drop your notes'}
            </p>
            <p style={{ color: 'var(--color-text-muted)' }}>
              or click to browse • PDF, TXT up to 10MB
            </p>
            {error && (
              <p className="mt-4 text-sm font-medium" style={{ color: 'var(--color-danger)' }}>
                ❌ {error}
              </p>
            )}
          </>
        ) : step === 'done' ? (
          <>
            <div className="text-6xl mb-4">✅</div>
            <p className="text-xl font-semibold mb-2 text-green-400">Processing Complete!</p>
            <p style={{ color: 'var(--color-text-muted)' }}>
              Click to upload another file
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 border-4 border-[var(--color-accent-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xl font-semibold mb-2">{stepLabels[step]}</p>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
              {selectedFile?.name}
            </p>

            {/* Progress bar */}
            <div
              className="w-full h-2 rounded-full overflow-hidden"
              style={{ background: 'var(--color-bg-primary)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${stepProgress[step]}%`,
                  background: 'linear-gradient(90deg, #7c3aed, #a855f7, #ec4899)',
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* Processing Result */}
      {result && (
        <div className="glass-card p-6 slide-up space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">📊</span>
            <div>
              <h2 className="text-xl font-bold">{result.title}</h2>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {result.chunkCount} chunks • {result.topicCount} topics detected
              </p>
            </div>
          </div>

          <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Detected Topics
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.topics.map((topic, i) => (
              <div
                key={i}
                className="p-4 rounded-xl flex items-center justify-between"
                style={{ background: 'rgba(10, 10, 26, 0.5)' }}
              >
                <span className="font-medium text-sm">{topic.name}</span>
                <span className={`strength-badge strength-${topic.difficulty === 'easy' ? 'strong' : topic.difficulty === 'hard' ? 'weak' : 'medium'}`}>
                  {topic.difficulty}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <a href="/quiz" className="btn-primary">
              🎯 Take a Quiz
            </a>
            <a href="/documents" className="btn-secondary">
              📚 View Documents
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
