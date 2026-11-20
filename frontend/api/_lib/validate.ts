/**
 * Contact-form validation shared by the browser form AND the server, so the rules can never drift apart.
 * Pure TypeScript — no Node or browser APIs.
 */
export type ContactInput = { name: string; email: string; subject: string; message: string }
export type FieldErrors = Partial<Record<keyof ContactInput, string>>

export const LIMITS = { name: [2, 80], subject: [3, 120], message: [10, 2000], email: 254 } as const

/** Removes control characters (keeps tab/newline in messages) and trims. */
export const clean = (s: unknown, multiline = false): string =>
  typeof s === 'string' ? s.replace(multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, ' ').replace(multiline ? /[ \t]+\n/g : /\s+/g, multiline ? '\n' : ' ').trim() : ''

const EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/
export const isEmail = (s: string) => s.length <= LIMITS.email && EMAIL.test(s) && !s.includes('..') && !s.startsWith('.') && !s.split('@')[0].endsWith('.')

const countLinks = (s: string) => (s.match(/https?:\/\/|www\./gi) ?? []).length

export function validate(raw: Record<string, unknown>): { ok: true; value: ContactInput } | { ok: false; errors: FieldErrors } {
  // header-injection guard: single-line fields may not contain line breaks even before cleaning
  const lineBreak = (v: unknown) => typeof v === 'string' && /[\r\n]/.test(v)
  const value: ContactInput = {
    name: clean(raw.name),
    email: clean(raw.email).toLowerCase(),
    subject: clean(raw.subject),
    message: clean(raw.message, true),
  }
  const errors: FieldErrors = {}
  if (lineBreak(raw.name)) errors.name = 'Your name must be a single line.'
  else if (value.name.length < LIMITS.name[0]) errors.name = `Please enter your name (at least ${LIMITS.name[0]} characters).`
  else if (value.name.length > LIMITS.name[1]) errors.name = `Your name can be at most ${LIMITS.name[1]} characters.`

  if (lineBreak(raw.email)) errors.email = 'Your email must be a single line.'
  else if (!value.email) errors.email = 'Please enter your email address.'
  else if (!isEmail(value.email)) errors.email = 'That email address doesn’t look right.'

  if (lineBreak(raw.subject)) errors.subject = 'The subject must be a single line.'
  else if (value.subject.length < LIMITS.subject[0]) errors.subject = `Please add a subject (at least ${LIMITS.subject[0]} characters).`
  else if (value.subject.length > LIMITS.subject[1]) errors.subject = `The subject can be at most ${LIMITS.subject[1]} characters.`

  if (value.message.length < LIMITS.message[0]) errors.message = `Please write a message (at least ${LIMITS.message[0]} characters).`
  else if (value.message.length > LIMITS.message[1]) errors.message = `The message can be at most ${LIMITS.message[1]} characters.`
  else if (countLinks(value.message) > 2 || countLinks(value.subject) > 0) errors.message = 'Please include at most 2 links, and none in the subject.'

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value }
}

/** Escapes text for safe inclusion in the HTML part of the email. */
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
