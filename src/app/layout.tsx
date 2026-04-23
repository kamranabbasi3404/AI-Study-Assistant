import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "StudyAI - Adaptive Learning Assistant",
  description: "AI-powered study assistant with RAG, spaced repetition, adaptive quizzes, and weak area detection. Transform your notes into active learning.",
  keywords: "AI study assistant, spaced repetition, adaptive learning, quiz generator, RAG",
};

import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="antialiased">
          <Sidebar />
          <main
            className="min-h-screen transition-all duration-300 lg:ml-64 p-6 lg:p-8"
            style={{ paddingTop: '2rem' }}
          >
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  );
}
