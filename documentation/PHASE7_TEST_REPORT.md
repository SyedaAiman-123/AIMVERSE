# Phase 7 — Testing & Optimisation Report

Date: 2026-11-21. Everything below was actually run in this session; "Not verified" lists what was **not**.

## 1. Automated tests
| Suite | Result |
|---|---|
| `tsc --noEmit` + `vite build` | pass (601 modules, built in ~2 s) |
| `tests/contact.test.ts` (fake Resend server) | 22/22 |
| `tests/mock-gemini.test.ts` (fake Gemini server) | 12/12 — after fixing the test: it had gone stale when query embedding was added (the mock recorded the embed call as the "last generate call") |
| `tests/rag-eval.ts` (dev set, tuned on) | 20/22 answerable, 9/9 refused. Known misses: "Which projects use Three.js?" (answers extractively, wrong refs) and "What After Effects work has she done?" (refused) |
| `tests/rag-holdout.ts` / `rag-holdout2.ts` | 6/6 + 6/6 answerable, 6/6 + 4/4 refused (holdout #1 was reused after fixes, so it is not a clean estimate) |

## 2. Responsive (in-app browser emulation, 375 px phone)
- Entry screen, Classic view, contact dialog and promo dialog fit with no horizontal overflow.
- Not verified: tablet widths in detail, real phones, landscape orientation, the 3D world after entering on a phone (the entry is a press-and-hold gesture that my synthetic key events did not trigger).

## 3. Accessibility (automated DOM audit + inspection)
- Pass: every button/link/input has an accessible name; one each of `main`, `nav`, `header`, `footer`; `lang="en"`; every image has `alt`; focus-visible styles and `prefers-reduced-motion` rules exist; all distinct text/background pairs in the Classic view are ≥ 4.5:1.
- Fixed: Classic view had no skip link — added (`Skip to content`, visible on keyboard focus).
- Not verified: screen-reader pass (NVDA/VoiceOver), full keyboard walk of the 3D world, contrast inside the 3D scene and dialogs.

## 4. Performance (production build served by `vite preview`)
- Initial load: 9 requests, ~1.26 MB transferred; the largest are the avatar `.glb` (670 KB) and three JS chunks (~100–160 KB gzip each). No project video and no promo video is requested until opened.
- Promo video re-encoded for the web: 25.4 MB → 9.3 MB (H.264 CRF 25, 3.5 Mbps cap, AAC 128k); the 25 MB master stays in `after-effects/`.
- Not verified: frame rate / GPU cost of the 3D scene (the in-app browser is throttled and software-rendered, so its paint timings were not used), Lighthouse scores, low-end devices.

## 5. API security (against the dev server)
| Probe | Result |
|---|---|
| `GET /api/chat`, `GET /api/contact` | 405 |
| Malformed JSON, missing/non-string/empty/oversize message | 400 |
| Cross-origin POST to `/api/contact` | 403 |
| Cross-origin POST to `/api/chat` | **was allowed; fixed → 403** (it would have let other sites spend the free Gemini quota) |
| Subject with CR/LF header injection | 400 |
| Honeypot field filled | 200 but no email sent (by design; covered in the contact tests) |
| "What is her phone number?" | blocked, no personal data returned |
| Off-topic question | refused without a model call |
| Injected `system` role in history | ignored (only user/assistant turns are kept) |
| Secrets in the production bundle | none found (`AIza…`, `re_…`, env var names); `.env` is git-ignored |

Not verified: rate-limit behaviour on Vercel (the in-memory limiter resets per serverless instance, so it is best-effort), real Gemini and Resend calls from the deployed site.

## 6. Known issues / honest limits
- RAG dev-set misses above; the AE-work question should be improved or its answer chunk checked.
- The CV PDF still lists "Tic-Tac-Toe" / "Virtual Teaching Board" which the owner asked to drop from the site.
- The Gemini API key was pasted into chat earlier and should be regenerated before publishing.
- The browsers tested were the in-app Chromium only; Firefox/Safari are untested.
