import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

import { ThemeProvider } from "../components/ThemeProvider";

export const metadata: Metadata = {
  title: "StudyAI - Adaptive Learning Assistant",
  description: "AI-powered study assistant with RAG, spaced repetition, adaptive quizzes, and weak area detection. Transform your notes into active learning.",
  keywords: "AI study assistant, spaced repetition, adaptive learning, quiz generator, RAG",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="antialiased">
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <div className="min-h-screen">
              {userId && <Sidebar />}
              <main
                className={`transition-all duration-300 ${userId ? 'lg:ml-64 p-6 lg:p-8' : 'w-full min-h-screen'}`}
                style={userId ? { paddingTop: '2rem' } : {}}
              >
                {children}
              </main>
            </div>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
