'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { BookOpen, Check, Clipboard, MessageSquare, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  type?: 'chat' | 'quiz';
  quizData?: any[];
}

function InlineQuiz({ questions }: { questions: any[] }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [totalScore, setTotalScore] = useState<number>(0);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');

    try {
      const submissions = questions.map((q, i) => ({
        questionId: q._id,
        answer: answers[i],
        timeTakenMs: 15000, // approximate time taken
      })).filter(s => s.questionId); // Only submit if they have a DB ID

      if (submissions.length > 0) {
        const res = await fetch('/api/chat/submit-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissions })
        });
        
        if (!res.ok) throw new Error('Failed to save progress');

        const data = await res.json();
        setEvaluations(data.evaluations || []);
        setTotalScore(data.score || 0);
      }
      
      setShowResults(true);
    } catch (err) {
      setSubmitError('Failed to save to Review Schedule, but showing results anyway.');
      setShowResults(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 space-y-6 w-full max-w-full">
      {questions.map((q, i) => {
        const isMCQ = q.options && q.options.length > 0;
        return (
          <div key={i} className="p-5 rounded-xl bg-white border border-[var(--color-border)] shadow-sm">
            <p className="font-semibold mb-4 text-[var(--color-text-primary)]">
              <span className="text-[var(--color-accent-primary)] mr-2">Q{i + 1}.</span> 
              {q.question}
            </p>
            
            {isMCQ ? (
              <div className="space-y-2">
                {q.options.map((opt: string, j: number) => {
                  const isSelected = answers[i] === opt;
                  const isCorrect = opt === q.correctAnswer;
                  
                  let btnClass = "w-full text-left p-3 rounded-xl text-sm transition-all border ";
                  if (showResults) {
                    if (isCorrect) btnClass += "bg-green-50 border-green-200 text-green-800";
                    else if (isSelected && !isCorrect) btnClass += "bg-red-50 border-red-200 text-red-800";
                    else btnClass += "bg-[var(--color-bg-secondary)] border-transparent text-[var(--color-text-muted)] opacity-70";
                  } else {
                    if (isSelected) btnClass += "bg-blue-50 border-blue-200 text-blue-800 ring-1 ring-blue-200";
                    else btnClass += "bg-[var(--color-bg-secondary)] border-transparent hover:bg-gray-100 text-[var(--color-text-secondary)]";
                  }

                  return (
                    <button
                      key={j}
                      onClick={() => !showResults && setAnswers(prev => ({ ...prev, [i]: opt }))}
                      disabled={showResults}
                      className={btnClass}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={answers[i] || ''}
                  onChange={(e) => !showResults && setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                  disabled={showResults}
                  placeholder="Type your answer here..."
                  className="w-full p-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm outline-none focus:border-[var(--color-accent-primary)] focus:ring-1 focus:ring-[var(--color-accent-primary)] resize-none transition-all text-[var(--color-text-primary)] disabled:opacity-70"
                  rows={3}
                />
              </div>
            )}

            {showResults && (
              <div className="mt-4 space-y-3">
                {!isMCQ && evaluations.length > 0 && (
                  (() => {
                    const evalData = evaluations.find(e => e.questionId === q._id);
                    if (!evalData) return null;
                    return (
                      <div className={`p-4 rounded-xl border ${evalData.score === 1 ? 'bg-green-50 border-green-200' : evalData.score > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <p className={`font-semibold text-sm ${evalData.score === 1 ? 'text-green-800' : evalData.score > 0 ? 'text-yellow-800' : 'text-red-800'}`}>AI Evaluation</p>
                          <span className={`font-bold px-2 py-1 rounded text-xs ${evalData.score === 1 ? 'bg-green-200 text-green-900' : evalData.score > 0 ? 'bg-yellow-200 text-yellow-900' : 'bg-red-200 text-red-900'}`}>
                            Score: {evalData.score} / 1
                          </span>
                        </div>
                        <p className={`text-sm ${evalData.score === 1 ? 'text-green-800' : evalData.score > 0 ? 'text-yellow-800' : 'text-red-800'}`}>{evalData.feedback}</p>
                      </div>
                    )
                  })()
                )}
                <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm">
                  <p className="font-semibold text-[var(--color-accent-primary)] mb-1">
                    {isMCQ ? 'Explanation:' : 'Reference Answer:'}
                  </p>
                  {!isMCQ && q.correctAnswer && (
                    <p className="text-[var(--color-text-primary)] font-medium mb-2">{q.correctAnswer}</p>
                  )}
                  {q.explanation && (
                    <p className="text-[var(--color-text-secondary)] leading-relaxed mt-1">{q.explanation}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      {!showResults ? (
        <button 
          onClick={handleSubmit}
          disabled={Object.keys(answers).length < questions.length || submitting}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2"
        >
          {submitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
          {submitting ? 'Saving Progress...' : 'Submit Answers'}
        </button>
      ) : (
        <div className="text-center p-5 rounded-xl space-y-2 bg-blue-50 border border-blue-100">
          <p className="font-bold text-lg text-blue-900">Total Score: {totalScore} / {questions.length}</p>
          <p className="text-sm text-green-700 flex items-center justify-center gap-1 font-medium"><CheckCircle className="w-4 h-4" /> Progress saved to Review Schedule</p>
          {submitError && <p className="text-xs text-red-500">{submitError}</p>}
        </div>
      )}
    </div>
  );
}

function MessageSources({ sources }: { sources: string[] }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs font-semibold mb-1 flex items-center gap-1 transition-opacity" 
        style={{ color: 'var(--color-text-muted)', cursor: 'pointer' }}
      >
        <span className="hover:text-[var(--color-accent-primary)] transition-colors flex items-center gap-1"><BookOpen className="w-3 h-3" /> View Sources</span>
        <span className="text-[10px] ml-1">{isOpen ? '▼' : '▶'}</span>
      </button>
      
      {isOpen && (
        <div className="mt-2 space-y-1 fade-in">
          {sources.map((source, j) => (
            <p key={j} className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              • {source}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.1)] transition-colors text-xs flex items-center gap-1"
      style={{ color: 'var(--color-text-muted)', cursor: 'pointer' }}
      title="Copy message"
    >
      {copied ? <Check className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
    </button>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch session messages on mount
  useEffect(() => {
    if (sessionId) {
      setLoading(true);
      setMessages([]); // Clear previous messages while loading
      fetch(`/api/chat/sessions/${sessionId}?_t=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.messages)) {
            setMessages(data.messages.map((m: any) => ({ ...m, questions: m.quizData || m.questions })));
            if (data.documentId) {
              setActiveDocumentId(data.documentId);
            } else {
              setActiveDocumentId(null);
            }
          } else if (Array.isArray(data)) {
            // Fallback just in case backend didn't update yet
            setMessages(data.map((m: any) => ({ ...m, questions: m.quizData || m.questions })));
          } else {
            setMessages([]);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setMessages([]);
      setActiveDocumentId(null);
    }
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Reset textarea height
    const textarea = document.querySelector('textarea');
    if (textarea) textarea.style.height = '40px';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg.content, sessionId, documentId: activeDocumentId }),
      });

      const data = await res.json();
      
      // Update URL if a new session was created
      if (!sessionId && data.sessionId) {
        router.replace(`/chat?session=${data.sessionId}`);
      }

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.message || data.answer || data.error || 'No response generated',
        sources: data.sources,
        type: data.type || 'chat',
        quizData: data.questions,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Failed to generate response. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    // Add temporary system message with a unique ID
    const tempId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: 'assistant', content: `Uploading and analyzing ${file.name}...` },
    ]);

    try {
      // 1. Ensure we have a session
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        const sessionRes = await fetch('/api/chat/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: `Upload: ${file.name}` })
        });
        const sessionData = await sessionRes.json();
        currentSessionId = sessionData._id;
        router.replace(`/chat?session=${currentSessionId}`);
      }

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      
      // Update active document ID
      if (data.documentId) {
        setActiveDocumentId(data.documentId);
      }

      const successContent = `Successfully uploaded **${file.name}**!\n\nI've extracted ${data.topicCount} topics. You can now ask me questions about it, or tell me to generate a quiz.`;

      // 2. Save success message to DB
      if (currentSessionId) {
        await fetch(`/api/chat/sessions/${currentSessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'assistant', content: successContent })
        });
      }

      // Replace the temporary message with the success message
      setMessages((prev) => [
        ...prev.filter(m => m.id !== tempId),
        { role: 'assistant', content: successContent }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev.filter(m => m.id !== tempId),
        { role: 'assistant', content: `Failed to upload ${file.name}. Please try again.` }
      ]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full flex flex-col fade-in" style={{ height: 'calc(100vh - 6rem)' }}>
      <div className="max-w-4xl mx-auto w-full mb-6 px-4 lg:px-8">
        <h1 className="text-3xl font-bold gradient-text">AI Study Chat</h1>
        <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Ask questions about your uploaded notes. Answers are grounded in your study material.
        </p>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto w-full mb-4"
        style={{ maxHeight: 'calc(100vh - 16rem)' }}
      >
        <div className="max-w-4xl mx-auto w-full space-y-4 px-4 lg:px-8">
          {messages.length === 0 && (
          <div className="text-center py-16">
            <div className="flex justify-center text-[var(--color-text-muted)] mb-4"><MessageSquare className="w-16 h-16" /></div>
            <h2 className="text-xl font-semibold mb-2">Ask anything about your notes</h2>
            <p style={{ color: 'var(--color-text-muted)' }}>
              Your questions will be answered using RAG — retrieving relevant chunks from your uploaded documents.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-6">
              {[
                'Summarize the main concepts',
                'What are the key differences between...',
                'Explain the relationship between...',
                'What are common misconceptions about...',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="text-xs px-4 py-2 rounded-xl transition-all"
                  style={{
                    background: 'rgba(37, 99, 235, 0.1)',
                    border: '1px solid rgba(37, 99, 235, 0.2)',
                    color: 'var(--color-accent-primary)',
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-2xl relative group ${
                msg.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'
              }`}
              style={{
                background:
                  msg.role === 'user'
                    ? 'linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-secondary))'
                    : 'var(--color-bg-card)',
                color: msg.role === 'user' ? 'white' : 'var(--color-text-primary)',
                border: msg.role === 'assistant' ? '1px solid var(--color-border)' : 'none',
              }}
            >
              {msg.role === 'assistant' && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CopyButton text={msg.content} />
                </div>
              )}
              
              {msg.role === 'assistant' ? (
                <div className="text-sm leading-relaxed whitespace-pre-wrap markdown-content">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              )}

              {/* Inline Quiz */}
              {msg.type === 'quiz' && msg.quizData && (
                <InlineQuiz questions={msg.quizData} />
              )}

              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <MessageSources sources={msg.sources} />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="p-4 rounded-2xl rounded-bl-md" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[var(--color-accent-primary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-[var(--color-accent-primary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-[var(--color-accent-primary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="max-w-4xl mx-auto w-full px-4 lg:px-8">
        <div
          className="flex gap-3 p-4 rounded-2xl items-center"
          style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
        >
          <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".pdf,.txt" 
          onChange={handleFileUpload} 
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || loading}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[rgba(255,255,255,0.05)] transition-colors text-xl"
          style={{ color: 'var(--color-text-secondary)' }}
          title="Upload a document"
        >
          +
        </button>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          onInput={(e) => {
            const target = e.currentTarget;
            target.style.height = '40px';
            target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
          }}
          placeholder="Ask anything or generate a quiz..."
          className="flex-1 bg-transparent outline-none text-sm resize-none py-2"
          style={{ color: 'var(--color-text-primary)', height: '40px' }}
        />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading || uploading}
            className={`px-6 py-2 rounded-xl font-semibold text-sm transition-all ${
              !input.trim() || loading || uploading
                ? 'bg-black/5 text-[var(--color-text-muted)] cursor-not-allowed'
                : 'btn-primary'
            }`}
          >
            {loading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
