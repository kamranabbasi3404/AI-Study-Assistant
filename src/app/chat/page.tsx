'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg.content }),
      });

      const data = await res.json();
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.answer || data.error || 'No response generated',
        sources: data.sources,
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

  return (
    <div className="max-w-4xl mx-auto flex flex-col fade-in" style={{ height: 'calc(100vh - 6rem)' }}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold gradient-text">AI Study Chat</h1>
        <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Ask questions about your uploaded notes. Answers are grounded in your study material.
        </p>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4"
        style={{ maxHeight: 'calc(100vh - 16rem)' }}
      >
        {messages.length === 0 && (
          <div className="text-center py-16">
            <span className="text-7xl block mb-4">💬</span>
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
                    background: 'rgba(124, 58, 237, 0.1)',
                    border: '1px solid rgba(124, 58, 237, 0.2)',
                    color: 'var(--color-accent-secondary)',
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
              className={`max-w-[80%] p-4 rounded-2xl ${
                msg.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'
              }`}
              style={{
                background:
                  msg.role === 'user'
                    ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                    : 'var(--color-bg-card)',
                border: msg.role === 'assistant' ? '1px solid var(--color-border)' : 'none',
              }}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    📚 Sources from your notes:
                  </p>
                  {msg.sources.map((source, j) => (
                    <p key={j} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      • {source}
                    </p>
                  ))}
                </div>
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

      {/* Input */}
      <div
        className="flex gap-3 p-4 rounded-2xl"
        style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Ask a question about your study notes..."
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--color-text-primary)' }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className={`px-6 py-2 rounded-xl font-semibold text-sm transition-all ${
            !input.trim() || loading
              ? 'bg-[rgba(42,42,90,0.3)] text-[var(--color-text-muted)] cursor-not-allowed'
              : 'btn-primary'
          }`}
        >
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
