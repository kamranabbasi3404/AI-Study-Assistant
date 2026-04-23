'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { UserButton, SignInButton, useAuth } from "@clerk/nextjs";
import ConfirmDialog from './ConfirmDialog';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/documents', label: 'Documents', icon: '📚' },
  { href: '/review', label: 'Review', icon: '🔄' },
];

interface ChatSession {
  _id: string;
  title: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      fetch(`/api/chat/sessions?_t=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setSessions(data);
        });
    }
  }, [isSignedIn, pathname]); // Re-fetch when pathname changes to catch new sessions

  const handleSaveEdit = async (id: string) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    await fetch(`/api/chat/sessions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle })
    });
    setSessions(sessions.map(s => s._id === id ? { ...s, title: editTitle } : s));
    setEditingId(null);
  };

  const requestDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    
    try {
      const res = await fetch(`/api/chat/sessions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      
      setSessions(sessions.filter(s => s._id !== id));
      
      // If we're on the deleted chat, go to new chat
      if (window.location.search.includes(`session=${id}`)) {
        router.push('/chat');
      }
    } catch (e) {
      console.error('Failed to delete chat:', e);
      alert('Failed to delete chat. Please try again.');
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg lg:hidden"
        style={{ background: 'var(--color-bg-card)' }}
        aria-label="Toggle sidebar"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>

      <aside
        className={`fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300 ${
          collapsed ? '-translate-x-full lg:translate-x-0 lg:w-20' : 'translate-x-0 w-64'
        }`}
        style={{
          background: 'var(--color-bg-secondary)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {/* Header with Logo and Toggle */}
        <div
          className="flex items-center justify-between px-6 py-6 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
              }}
            >
              🧠
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-base font-bold gradient-text">StudyAI</h1>
              </div>
            )}
          </div>
          
          {/* Collapse toggle (moved to top) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-[rgba(42,42,90,0.5)]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform ${collapsed ? 'rotate-180' : ''}`}
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {/* New Chat Button */}
          <button
            onClick={() => {
              if (window.innerWidth < 1024) setCollapsed(true);
              router.push('/chat');
            }}
            className="w-full flex items-center justify-center gap-2 mb-4 py-3 rounded-xl btn-primary shadow-lg transition-transform hover:scale-105 active:scale-95"
            style={{ fontWeight: 'bold' }}
          >
            <span className="text-xl">✨</span>
            {!collapsed && <span>New Chat</span>}
          </button>

          {/* Main Links */}
          {navItems.map((item) => {
            const isActive = pathname === item.href && pathname !== '/chat';
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive ? '' : 'hover:bg-[rgba(42,42,90,0.5)]'
                }`}
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(168,85,247,0.1))'
                    : 'transparent',
                  color: isActive
                    ? '#a855f7'
                    : 'var(--color-text-secondary)',
                  borderLeft: isActive ? '3px solid #a855f7' : '3px solid transparent',
                }}
                onClick={() => {
                  if (window.innerWidth < 1024) setCollapsed(true);
                }}
              >
                <span className="text-xl">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {/* Chat History Section */}
          {!collapsed && sessions.length > 0 && (
            <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
              <p className="px-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                Recent Chats
              </p>
              <div className="space-y-1">
                {sessions.slice(0, 10).map((session) => (
                  <div key={session._id} className="group relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                    <span className="text-base opacity-70">💬</span>
                    {editingId === session._id ? (
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleSaveEdit(session._id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(session._id)}
                        className="flex-1 bg-[rgba(0,0,0,0.3)] border border-[var(--color-border)] rounded px-2 py-1 text-white text-sm outline-none"
                      />
                    ) : (
                      <Link
                        href={`/chat?session=${session._id}`}
                        onClick={() => {
                          if (window.innerWidth < 1024) setCollapsed(true);
                        }}
                        className="flex-1 truncate text-[var(--color-text-secondary)] hover:text-white"
                      >
                        {session.title}
                      </Link>
                    )}
                    
                    {/* Hover Actions */}
                    {!editingId && (
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity absolute right-2 bg-[var(--color-bg-secondary)] px-1 rounded">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            setEditingId(session._id);
                            setEditTitle(session.title);
                          }}
                          className="p-1 hover:text-[var(--color-accent-primary)] transition-colors"
                          title="Rename"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={(e) => requestDelete(session._id, e)}
                          className="p-1 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          {isSignedIn ? (
            <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : 'px-2'}`}>
              <UserButton />
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Account</span>
                  <span className="text-xs text-muted">Manage settings</span>
                </div>
              )}
            </div>
          ) : (
            <SignInButton mode="modal">
              <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium hover:bg-[rgba(42,42,90,0.5)] transition-all`}>
                <span className="text-xl">👤</span>
                {!collapsed && <span>Sign In</span>}
              </button>
            </SignInButton>
          )}
        </div>
      </aside>

      {/* Mobile backdrop */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}
      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        title="Delete Chat"
        message="Are you sure you want to delete this chat? This action cannot be undone."
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </>
  );
}
