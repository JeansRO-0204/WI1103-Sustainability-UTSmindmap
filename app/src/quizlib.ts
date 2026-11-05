// Quiz / flashcard data, Leitner scheduling, proficiency maths and progress import/export. No React in here.
import { BASE, type Data } from './data'
import type { Source } from './types'

export interface Question {
  id: string; source: 'quiz1' | 'quiz2' | 'generated'; n?: number
  stem: string; options: string[]; answer: number[]; answerText: string
  /** Quiz 1 only: Indonesian original, optionsId aligned index-by-index with options */
  stemId?: string; optionsId?: string[]; answerTextId?: string
  /** Quiz 1 only: the English text was translated by AI (the lecturer's original is Indonesian) */
  enTranslated?: boolean
  /** Quiz 1 only: lecturer's worked calculation (verbatim, may contain LaTeX-ish markup) */
  calc?: string
  keyStatus: 'given' | 'inferred' | 'disputed'
  module: string; nodeIds: string[]; topic: string
  explanation?: string; sources?: Source[]; dupOf?: string; note?: string
}
export interface Flashcard {
  id: string; nodeId: string; module: string; topic: string; front: string; back: string; sources?: Source[]
}
export interface QuizFile {
  meta?: { generated?: string; quiz2Count?: number; quiz1Count?: number; sample?: boolean }
  questions: Question[]; flashcards: Flashcard[]
}

/** Unified view of a question or a card for scheduling / stats. */
export interface Item {
  id: string; kind: 'q' | 'c'; module: string; topic: string; nodeIds: string[]; dup: boolean; src: 'quiz1' | 'quiz2' | 'generated'
}
export interface QuizData {
  questions: Map<string, Question>
  cards: Map<string, Flashcard>
  items: Item[]
  itemMap: Map<string, Item>
  byNode: Map<string, Item[]>
  topics: { label: string; module: string }[]
  modules: string[]
  sample: boolean
}

export async function loadQuiz(data: Data): Promise<QuizData | null> {
  let f: QuizFile
  try {
    const r = await fetch(BASE + 'data/quiz.json', { cache: 'no-store' })
    if (!r.ok) return null
    f = (await r.json()) as QuizFile
    if (!Array.isArray(f.questions)) return null
  } catch { return null }
  const questions = new Map<string, Question>()
  const cards = new Map<string, Flashcard>()
  const items: Item[] = []
  for (const q of f.questions) {
    if (!q.options?.length || !q.answer?.length) continue
    const nodeIds = (q.nodeIds ?? []).filter((n) => data.nodes.has(n))
    questions.set(q.id, { ...q, nodeIds })
    items.push({ id: q.id, kind: 'q', module: q.module, topic: q.topic, nodeIds, dup: !!q.dupOf, src: q.source })
  }
  for (const c of f.flashcards ?? []) {
    if (!c.front || !c.back) continue
    cards.set(c.id, c)
    items.push({ id: c.id, kind: 'c', module: c.module, topic: c.topic, nodeIds: data.nodes.has(c.nodeId) ? [c.nodeId] : [], dup: false, src: 'generated' })
  }
  const itemMap = new Map(items.map((i) => [i.id, i]))
  const byNode = new Map<string, Item[]>()
  for (const it of items) if (!it.dup) for (const n of it.nodeIds) { if (!byNode.has(n)) byNode.set(n, []); byNode.get(n)!.push(it) }
  const tm = new Map<string, string>()
  for (const it of items) if (!tm.has(it.topic)) tm.set(it.topic, it.module)
  const topics = [...tm].map(([label, module]) => ({ label, module })).sort((a, b) => a.module.localeCompare(b.module) || a.label.localeCompare(b.label))
  const modules = [...new Set(items.map((i) => i.module))].sort()
  return { questions, cards, items, itemMap, byNode, topics, modules, sample: !!f.meta?.sample }
}

// ---------- persistent state ----------
export type Att = [number, number] // [timestamp ms, score 0..1]
export interface ItemState { b: number; d: number; a: Att[] } // Leitner box 1..5, due timestamp, attempts (last 20)
export interface QuizState { v: 1; items: Record<string, ItemState> }
export const EMPTY_STATE: QuizState = { v: 1, items: {} }
export const MAX_ATT = 20
export const DAY = 86400000
export const INTERVALS = [0, DAY, 2 * DAY, 4 * DAY, 8 * DAY] // box 1..5

/** up = boxes to climb on success (1 normal, 2 for "Easy"); 0 = lapse back to box 1. */
export function recordAttempt(st: QuizState, id: string, score: number, up: number, now = Date.now()): QuizState {
  const prev = st.items[id]
  const box = up <= 0 ? 1 : Math.min(5, (prev?.b ?? 1) + up)
  const a = [...(prev?.a ?? []), [now, score] as Att].slice(-MAX_ATT)
  return { v: 1, items: { ...st.items, [id]: { b: box, d: now + INTERVALS[box - 1], a } } }
}

export function dueLabel(ms: number): string {
  if (ms <= 0) return 'now'
  const d = ms / DAY
  return d >= 1 ? `${Math.round(d)} day${Math.round(d) === 1 ? '' : 's'}` : 'now'
}

/** 0-100 or null when never attempted. Recency-weighted accuracy (0.7 decay per older attempt) blended 60/40 with Leitner box level. */
export function itemProf(s?: ItemState): number | null {
  if (!s || !s.a.length) return null
  let w = 1, sw = 0, sum = 0
  for (let i = s.a.length - 1; i >= 0; i--) { sum += w * s.a[i][1]; sw += w; w *= 0.7 }
  return Math.round(100 * (0.6 * (sum / sw) + 0.4 * ((s.b - 1) / 4)))
}

export interface Agg { p: number; tested: number; total: number; attempts: number }
export interface Stats {
  item: Map<string, number | null>
  node: Map<string, Agg>
  topic: Map<string, Agg & { module: string }>
  week: Map<string, Agg>
  overall: Agg
  due: Set<string>
}

const aggOf = (its: Item[], prof: Map<string, number | null>, st: QuizState): Agg => {
  let sum = 0, tested = 0, attempts = 0
  for (const it of its) {
    const p = prof.get(it.id)
    attempts += st.items[it.id]?.a.length ?? 0
    if (p != null) { sum += p; tested++ }
  }
  return { p: its.length ? Math.round(sum / its.length) : 0, tested, total: its.length, attempts }
}

/** Untested items count as 0 so a concept with 1/4 items answered does not look mastered. Duplicates (dupOf) are excluded everywhere. */
export function computeStats(qd: QuizData, st: QuizState, now = Date.now()): Stats {
  const item = new Map<string, number | null>()
  const due = new Set<string>()
  for (const it of qd.items) {
    item.set(it.id, itemProf(st.items[it.id]))
    const s = st.items[it.id]
    if (s && s.a.length && s.d <= now) due.add(it.id)
  }
  const live = qd.items.filter((i) => !i.dup)
  const node = new Map<string, Agg>()
  for (const [n, its] of qd.byNode) node.set(n, aggOf(its, item, st))
  const group = (key: (i: Item) => string) => {
    const m = new Map<string, Item[]>()
    for (const it of live) { const k = key(it); if (!m.has(k)) m.set(k, []); m.get(k)!.push(it) }
    return m
  }
  const topic = new Map<string, Agg & { module: string }>()
  for (const [k, its] of group((i) => i.topic)) topic.set(k, { ...aggOf(its, item, st), module: its[0].module })
  const week = new Map<string, Agg>()
  for (const [k, its] of group((i) => i.module)) week.set(k, aggOf(its, item, st))
  return { item, node, topic, week, overall: aggOf(live, item, st), due }
}

export function profColor(p: number | null | undefined, tested = true): string {
  if (p == null || !tested) return '#c4cbd6'
  const hue = p < 50 ? (p / 50) * 38 : 38 + ((p - 50) / 50) * 97
  return `hsl(${Math.round(hue)} 72% ${p < 50 ? 46 : 38}%)`
}

// ---------- scopes ----------
export type Scope =
  | { kind: 'all' } | { kind: 'week'; module: string } | { kind: 'topic'; topic: string } | { kind: 'weakest' }
  | { kind: 'due' } | { kind: 'quiz1' } | { kind: 'quiz2' } | { kind: 'gen' } | { kind: 'unseen' } | { kind: 'node'; id: string }

export function weakestTopics(stats: Stats, k = 3): string[] {
  const all = [...stats.topic].map(([label, a]) => ({ label, ...a }))
  const tested = all.filter((a) => a.tested > 0).sort((a, b) => a.p - b.p)
  const untested = all.filter((a) => a.tested === 0)
  return [...tested, ...untested].slice(0, k).map((a) => a.label)
}

export function poolFor(qd: QuizData, stats: Stats, st: QuizState, scope: Scope, kind: 'q' | 'c'): Item[] {
  const base = qd.items.filter((i) => i.kind === kind && !i.dup)
  switch (scope.kind) {
    case 'all': return base
    case 'week': return base.filter((i) => i.module === scope.module)
    case 'topic': return base.filter((i) => i.topic === scope.topic)
    case 'weakest': { const w = new Set(weakestTopics(stats)); return base.filter((i) => w.has(i.topic)) }
    case 'due': return base.filter((i) => stats.due.has(i.id))
    case 'quiz1': return base.filter((i) => i.src === 'quiz1')
    case 'quiz2': return base.filter((i) => i.src === 'quiz2')
    case 'gen': return base.filter((i) => i.src === 'generated')
    case 'unseen': return base.filter((i) => !(st.items[i.id]?.a.length))
    case 'node': return base.filter((i) => i.nodeIds.includes(scope.id))
  }
}

export function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] }
  return r
}

/** cram: random order, ignoring due dates. Otherwise due and unseen items come first. */
export function pickQueue(pool: Item[], n: number, stats: Stats, st: QuizState, cram: boolean): string[] {
  let r = shuffle(pool)
  if (!cram) {
    const urgent = (i: Item) => (!st.items[i.id]?.a.length || stats.due.has(i.id) ? 0 : 1)
    r = r.sort((a, b) => urgent(a) - urgent(b))
  }
  return r.slice(0, n > 0 ? n : r.length).map((i) => i.id)
}

// ---------- export / import ----------
export const PROGRESS_APP = 'wi1103-mindmap-progress'

export function exportProgress(reviewed: string[], quiz: QuizState): string {
  return JSON.stringify({ app: PROGRESS_APP, version: 1, exported: new Date().toISOString(), reviewed, quiz }, null, 1)
}

const isAtt = (x: unknown): x is Att => Array.isArray(x) && x.length === 2 && Number.isFinite(x[0]) && Number.isFinite(x[1])

export function parseProgress(text: string): { reviewed: string[]; quiz: QuizState } {
  let j: any
  try { j = JSON.parse(text) } catch { throw new Error('Not a valid JSON file.') }
  if (!j || j.app !== PROGRESS_APP) throw new Error('This file is not a progress export from this app.')
  const reviewed = Array.isArray(j.reviewed) ? j.reviewed.filter((x: unknown) => typeof x === 'string') : []
  const items: Record<string, ItemState> = {}
  for (const [id, s] of Object.entries<any>(j.quiz?.items ?? {})) {
    if (!s || !Array.isArray(s.a)) continue
    const a = s.a.filter(isAtt).slice(-MAX_ATT)
    if (a.length) items[id] = { b: Math.min(5, Math.max(1, Math.round(s.b) || 1)), d: Number(s.d) || 0, a }
  }
  return { reviewed, quiz: { v: 1, items } }
}

/** Merge two progress states: union of attempts per item (keep the newest 20); box/due come from whichever side attempted most recently. */
export function mergeQuiz(cur: QuizState, inc: QuizState): { state: QuizState; newAttempts: number; itemsTouched: number } {
  const out: Record<string, ItemState> = { ...cur.items }
  let newAttempts = 0, itemsTouched = 0
  for (const [id, b] of Object.entries(inc.items)) {
    const a = cur.items[id]
    if (!a) { out[id] = b; newAttempts += b.a.length; itemsTouched++; continue }
    const have = new Set(a.a.map((x) => x[0]))
    const extra = b.a.filter((x) => !have.has(x[0]))
    if (!extra.length) continue
    const merged = [...a.a, ...extra].sort((x, y) => x[0] - y[0]).slice(-MAX_ATT)
    const newer = b.a[b.a.length - 1][0] > a.a[a.a.length - 1][0] ? b : a
    out[id] = { b: newer.b, d: newer.d, a: merged }
    newAttempts += extra.length; itemsTouched++
  }
  return { state: { v: 1, items: out }, newAttempts, itemsTouched }
}
