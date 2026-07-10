# ElevateCV Developer Guide

## Core Commands
- Dev Server: `npm run dev`
- Build App: `npm run build`
- Run Lint: `npm run lint`
- Run Unit Tests: `npm test`
- Run Benchmark Evals: `npx tsx scripts/run_evals.ts`

## Key Architecture & Dependencies
- Frontend: Next.js (TypeScript, React 19)
- Styling: Vanilla CSS (Theme in `src/app/globals.css`)
- Embeddings/Generation: OpenAI SDK (`gpt-4o-mini`, `text-embedding-3-small`)
- Reranking: Cohere Rerank API (`rerank-v3.5` via `cohere-ai` SDK)
- Search: Tavily API
- Tracing: LangSmith (via wrapper in `src/utils/openai.ts`)
