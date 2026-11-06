import MiniSearch from 'minisearch'
import type { QuizData } from './quizlib'

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export const termsOf = (q: string) => q.toLowerCase().split(/\s+/).filter((t) => t.length > 1)

/** Escaped HTML snippet around the first matching term, with <mark> on every term. */
export function snippet(text: string, q: string, len = 140): string {
  const terms = termsOf(q)
  const low = text.toLowerCase()
  let at = -1
  for (const t of terms) { const i = low.indexOf(t); if (i >= 0 && (at < 0 || i < at)) at = i }
  const start = Math.max(0, (at < 0 ? 0 : at) - 40)
  let out = esc(text.slice(start, start + len).replace(/\s+/g, ' '))
  for (const t of terms) out = out.replace(new RegExp(`(${esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'), '<mark>$1</mark>')
  return (start > 0 ? '…' : '') + out + (start + len < text.length ? '…' : '')
}

export const matchesAll = (hay: string, q: string) => { const t = termsOf(q); if (!t.length) return true; const h = hay.toLowerCase(); return t.every((x) => h.includes(x)) }

export interface QuizIndex { q: MiniSearch<any>; c: MiniSearch<any> }
const OPTS = { prefix: true, fuzzy: 0.2, combineWith: 'AND' as const }

/** Built lazily (first palette open): English + Indonesian question text, options, flashcards. Duplicates excluded. */
export function buildQuizIndex(qd: QuizData): QuizIndex {
  const q = new MiniSearch({ fields: ['stem', 'stemId', 'options', 'optionsId', 'topic'], idField: 'id', searchOptions: { ...OPTS, boost: { stem: 3, stemId: 3 } } })
  q.addAll([...qd.questions.values()].filter((x) => !x.dupOf).map((x) => ({
    id: x.id, stem: x.stem, stemId: x.stemId ?? '', options: x.options.join(' '), optionsId: (x.optionsId ?? []).join(' '), topic: x.topic,
  })))
  const c = new MiniSearch({ fields: ['front', 'back', 'topic'], idField: 'id', searchOptions: { ...OPTS, boost: { front: 3 } } })
  c.addAll([...qd.cards.values()].map((x) => ({ id: x.id, front: x.front, back: x.back, topic: x.topic })))
  return { q, c }
}
