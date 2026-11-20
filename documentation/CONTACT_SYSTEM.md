# Contact & email system

**Flow:** form (Contact.tsx) → `POST /api/contact` (Vercel function) → Resend API → Aiman's inbox. Reply-To is the visitor's email, so "Reply" in Gmail answers them directly.

## Validation (one shared module: `frontend/api/_lib/validate.ts`)
Name 2–80, email RFC-style + ≤254 and no `..`, subject 3–120, message 10–2000. Single-line fields reject line breaks (header-injection). At most 2 links in the message, none in the subject. The browser shows inline errors; the server re-checks everything and returns per-field errors.

## Spam & abuse protection (no CAPTCHA needed)
* **Honeypot** field — hidden from people and screen readers; if filled the server returns a fake success and sends nothing.
* **Fill-time check** — rejects submissions faster than 2.5 s or older than 2 h.
* **Rate limit** — 3 per 10 min and 12 per day per IP (best-effort on serverless).
* **Same-origin only** (Origin check), JSON-only content type, 10 KB body cap.
* **Output safety** — all visitor text is HTML-escaped in the email; control characters are stripped.
* Messages are never stored or logged; only provider status codes are logged on failure.

## Configuration (environment variables — never committed)
| Name | Purpose |
|---|---|
| `RESEND_API_KEY` | required — create at resend.com/api-keys |
| `CONTACT_TO` | recipient, default `s.aimanmunawarali@gmail.com` |
| `CONTACT_FROM` | sender, default `AIMVERSE <onboarding@resend.dev>` |

**Resend free-tier note:** without a verified domain, Resend can only deliver to the email you registered with — so register the Resend account with the same Gmail that should receive messages. To receive at any address, verify a domain in Resend and set `CONTACT_FROM` to an address on it.

## Tests
`cd rag-system && npx tsx ../tests/contact.test.ts` — 22 checks against a local fake Resend server (validation, injection, honeypot, timing, origin, rate limit, provider failure, missing key, HTML escaping).
Real delivery can only be proven with a real key: submit the form on the deployed site and check the inbox.
