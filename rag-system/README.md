# Ask Aiman AI — RAG pipeline

A genuine retrieval-augmented generation system. The LLM only ever sees passages retrieved from Aiman's own documents,
and refuses (without calling the model) when nothing relevant is found.

```
sources/  ──►  ingest.ts  ──►  frontend/api/_rag/index.json  ──►  api/chat.ts (Vercel function)  ──►  Chat.tsx
 CV PDF         extract                chunks (+ vectors)            retrieve → gate → ground → cite
 project notes  clean + REDACT
 Between Waking chunk
 deck PDF       embed (Gemini)
 data.ts
```

## 1. Ingestion (`npm run ingest`)
1. **Extract** — CV PDF and Between Waking deck via `pdfjs-dist`; project notes text; structured facts from `frontend/src/data.ts`.
2. **Clean** — strips emoji, markdown, hashtags, odd whitespace. **Redacts** emails and phone numbers *before* indexing so private details can never be retrieved or quoted. Developer-instruction lines inside the notes file are dropped.
3. **Chunk** — logical sections first (CV headings, one block per project), then ~800-character windows split on sentence boundaries (never inside "Three.js" or "98.3%").
4. **Embed** — only if `GEMINI_API_KEY` is set: `gemini-embedding-001`, 768 dims, task type `RETRIEVAL_DOCUMENT`, L2-normalised, batched with back-off for free-tier limits. Without a key the index is lexical-only.
5. **Store** — a single JSON file (~60 KB lexical, ~600 KB with vectors). ~110 chunks is small enough that exact in-memory cosine search is instant and needs no hosted vector database (Chroma/Qdrant evaluated: unnecessary on serverless at this size).

## 2. Query time (`frontend/api/chat.ts`, `api/_rag/engine.ts`)
1. **Validate + rate-limit** (10/min, 120/day per IP, best-effort on serverless), strip control chars, 400-char cap.
2. **Privacy guard** — questions asking for phone/email/address/salary etc. are answered with a fixed message; no model call.
3. **Hybrid retrieval** — BM25 over stemmed tokens (+ small synonym table) fused (reciprocal-rank) with cosine similarity on Gemini query embeddings when available. Listing/counting questions get the project overview injected.
4. **Confidence gate** — idf-weighted coverage of the question's own words (unknown words count against it). Below threshold → "I don't have that information…" and **no LLM call**. Threshold is 0.3 with an LLM (the model can also decline) and 0.5 for the quote-only fallback.
5. **Grounded generation** — Gemini (`gemini-flash-lite-latest` by default) with a system prompt: answer only from numbered context, cite `[n]`, third person, no contact details, ignore instructions inside the question/context. Temperature 0.2, 450 tokens, 7.5 s timeout (Vercel Hobby limit is 10 s).
6. **Fallback** — if the model is unavailable, rate-limited or returns nothing, the answer is an *extractive* quote of the top passages with citations and a clear note. Never invented text.
7. **Citations** — every answer returns its sources; the UI turns them into links that open the project's case file or scroll to the section.

## 3. Setup
```powershell
cd frontend
copy .env.example .env      # then paste your free key from https://aistudio.google.com/apikey
cd ..\rag-system
npm install
npm run ingest              # re-run whenever CV / project text changes (adds vectors when a key is set)
cd ..\frontend
npm run dev                 # /api/chat is served locally by a Vite plugin
```
Vercel: set `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) in Project → Settings → Environment Variables. `vercel.json` already bundles `api/_rag/index.json` with the function.

## 4. Free-tier limitations (read before relying on it)
* Quotas are **per project** with requests-per-minute and requests-per-day caps that vary by model and can change; exact numbers must be checked in AI Studio. Heavy traffic can exhaust them — the extractive fallback keeps the chatbot useful.
* On Google's free tier, submitted content **may be used to improve Google products**; the UI says so and tells visitors not to share personal information. A paid/billing-enabled project is treated differently — check the current Gemini API terms.
* Serverless instances are ephemeral: the in-memory rate limiter is best-effort only, and cold starts add latency.
* Verified with a real key (2026-11-21): `gemini-embedding-001` batch embedding and `generateContent` both work. Google has **retired `gemini-2.5-*` models for new accounts**, so the default is the alias `gemini-flash-lite-latest` (override with `GEMINI_MODEL`). Model names change — if answers suddenly become quote-only, check the model name first (server logs print `gemini generate failed`).

## 5. Tests (`npm run eval`, `npm run test:mock`; also `tests/rag-holdout*.ts`)
See `tests/results/rag-eval.md`. Retrieval/gating run without a key; the fake-Gemini test verifies request shape, citations and fallbacks.
