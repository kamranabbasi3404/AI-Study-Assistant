'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { UserButton, SignInButton, useAuth } from "@clerk/nextjs";

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/upload', label: 'Upload', icon: '📄' },
  { href: '/quiz', label: 'Quiz', icon: '🎯' },
  { href: '/review', label: 'Review', icon: '🔄' },
  { href: '/documents', label: 'Documents', icon: '📚' },
  { href: '/chat', label: 'AI Chat', icon: '💬' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { isSignedIn } = useAuth();

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
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-6 py-6 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
            }}
          >
            🧠
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold gradient-text">StudyAI</h1>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Smart Learning
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
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
                  // Close sidebar on mobile after clicking
                  if (window.innerWidth < 1024) setCollapsed(true);
                }}
              >
                <span className="text-xl">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
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

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center py-4 border-t transition-colors hover:bg-[rgba(42,42,90,0.5)]"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
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
      </aside>

      {/* Mobile backdrop */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}
    </>
  );
}
