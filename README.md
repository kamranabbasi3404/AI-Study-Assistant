# StudyAI - Intelligent Learning Assistant

StudyAI is a modern, full-stack AI-powered study companion built to help students learn, revise, and test their knowledge intelligently. It uses advanced RAG (Retrieval-Augmented Generation) and custom machine learning logic to act as a personalized bilingual tutor.

## 🚀 Key Features & Recent Updates

### 🧠 Core AI & Infrastructure
- **Groq Llama-3 Integration:** Fully migrated to Groq API utilizing the `llama-3.3-70b-versatile` model for lightning-fast completions, replacing Google Gemini.
- **100% Local Vector Embeddings:** Implemented a custom deterministic TF-IDF & N-gram hashing algorithm for document embeddings. This enables seamless RAG (Retrieval-Augmented Generation) over uploaded PDFs without relying on any paid external embedding APIs.
- **Bilingual Tutor Mode:** Advanced prompt engineering enforces the AI to understand and natively reply in **Roman Urdu and Roman English**, making it incredibly accessible for local students.

### ⏱️ Analytics & Tracking
- **Real-Time Active Study Tracker:** Custom idle-detection engine runs purely on the frontend. It actively tracks mouse, keyboard, and scroll activity when the user is on the chat page. It pauses automatically if the user goes idle for 2 minutes and securely syncs the true active study minutes to the MongoDB backend (`DailyStudyLog`).
- **Topic Mastery & Spaced Repetition:** The system tracks individual topic strengths based on quiz performance and schedules optimal review cycles.

### 🎨 Premium UI/UX Redesign
- **Warm Aesthetic Design:** Completely overhauled the UI from a generic corporate blue/white to a gorgeous, premium **Warm Cream, Rose, and Amber** aesthetic.
- **Mesh Gradients & Glassmorphism:** Features subtle CSS mesh radial gradients and frosted glass cards for a modern SaaS feel.
- **Smart Chat Naming & History:** Chat sessions automatically inherit the exact name of the uploaded PDF (e.g., stripping the old "Upload:" prefix). The sidebar features early text truncation and transparent hover actions for an immaculate look.

### 📝 Interactive Study Tools
- **PDF Uploads:** Upload study notes and instantly query them.
- **Inline Adaptive Quizzes:** AI generates contextual multiple-choice and short-answer questions directly in the chat flow.
- **Conceptual Grading System:** Answers aren't just graded right or wrong—the AI assigns partial credit for conceptual understanding.

## 🛠️ Tech Stack
- **Frontend:** Next.js 15 (App Router), React, Tailwind CSS, Lucide Icons
- **Backend/Database:** Node.js, Mongoose, MongoDB
- **Authentication:** Clerk
- **AI Models:** Groq SDK (Llama 3)
- **Deployment:** Ready for Vercel

## ⚙️ Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Setup environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
   CLERK_SECRET_KEY=your_clerk_secret
   MONGODB_URI=your_mongodb_uri
   GROQ_API_KEY=your_groq_key
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000)

---
*Built to make learning smarter, faster, and more engaging.*
