// Quiz / flashcard data, Leitner scheduling, proficiency maths and progress import/export. No React in here.
import { BASE, type Data } from './data'
import type { Source } from './types'

export interface Question {
  id: string; source: 'quiz1' | 'quiz2' | 'latsol' | 'uts25' | 'generated'; n?: number
  stem: string; options: string[]; answer: number[]; answerText: string
  /** Quiz 1 / latsol / uts25: Indonesian original, optionsId aligned index-by-index with options */
  stemId?: string; optionsId?: string[]; answerTextId?: string
  /** Quiz 1 / latsol / uts25: the English text was translated by AI (the original is Indonesian) */
  enTranslated?: boolean
  /** Quiz 1 only: lecturer's worked calculation (verbatim, may contain LaTeX-ish markup) */
  calc?: string
  /** latsol: figures shown between stem and options, and one image per option (null = none); paths relative to app/public */
  images?: string[]; optionImages?: (string | null)[]
  confidence?: 'high' | 'medium' | 'low'
  keyStatus: 'given' | 'inferred' | 'disputed'
  module: string; nodeIds: string[]; topic: string
  explanation?: string; sources?: Source[]; dupOf?: string; note?: string
  /** latsol: id of the question this one builds on ("as in the previous number"); chains are kept consecutive */
  after?: string
}
export interface Flashcard {
  id: string; nodeId: string; module: string; topic: string; front: string; back: string; sources?: Source[]
}
export interface QuizFile {
  meta?: { generated?: string; quiz2Count?: number; quiz1Count?: number; latsolCount?: number; uts25Count?: number; sample?: boolean }
  questions: Question[]; flashcards: Flashcard[]
}

/** Unified view of a question or a card for scheduling / stats. */
export interface Item {
  id: string; kind: 'q' | 'c'; module: string; topic: string; nodeIds: string[]; dup: boolean; src: 'quiz1' | 'quiz2' | 'latsol' | 'uts25' | 'generated'
  /** latsol: predecessor id + source number, for chained questions and source ordering */
  after?: string; seq?: number
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
    items.push({ id: q.id, kind: 'q', module: q.module, topic: q.topic, nodeIds, dup: !!q.dupOf, src: q.source, after: q.after, seq: q.source === 'latsol' || q.source === 'uts25' ? Number(q.id.replace(/\D/g, '')) : undefined })
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

/** Pure Leitner step for one item. up = boxes to climb on success (1 normal, 2 for "Easy"); 0 = lapse back to box 1. */
export function applyAttempt(prev: ItemState | undefined, score: number, up: number, now = Date.now()): ItemState {
  const box = up <= 0 ? 1 : Math.min(5, (prev?.b ?? 1) + up)
  const a = [...(prev?.a ?? []), [now, score] as Att].slice(-MAX_ATT)
  return { b: box, d: now + INTERVALS[box - 1], a }
}

export function recordAttempt(st: QuizState, id: string, score: number, up: number, now = Date.now()): QuizState {
  return { v: 1, items: { ...st.items, [id]: applyAttempt(st.items[id], score, up, now) } }
}

/** Set (or with undefined, remove) one item's stored state; used to undo/replay attempts when a grade is changed. */
export function setItemState(st: QuizState, id: string, s: ItemState | undefined): QuizState {
  const items = { ...st.items }
  if (s) items[id] = s; else delete items[id]
  return { v: 1, items }
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
  | { kind: 'due' } | { kind: 'quiz1' } | { kind: 'quiz2' } | { kind: 'latsol' } | { kind: 'uts25' } | { kind: 'gen' } | { kind: 'unseen' } | { kind: 'node'; id: string }

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
    case 'latsol': return base.filter((i) => i.src === 'latsol')
    case 'uts25': return base.filter((i) => i.src === 'uts25')
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

/** Prediction-paper questions that build on an earlier number ("Merujuk kepada nomor 13...") form chains; this returns the chain of `id` in source order. */
function chainOf(id: string, byId: Map<string, Item>, kids: Map<string, Item[]>): Item[] {
  let root = byId.get(id)
  while (root?.after && byId.has(root.after)) root = byId.get(root.after)
  if (!root) return []
  const out: Item[] = []
  const walk = (i: Item) => { out.push(i); for (const k of kids.get(i.id) ?? []) walk(k) }
  walk(root)
  return out
}

export type Order = 'source' | 'shuffle'
export const getOrder = (): Order => (typeof localStorage !== 'undefined' && localStorage.getItem('mm.order') === 'shuffle' ? 'shuffle' : 'source')
export const setOrder = (o: Order) => { try { localStorage.setItem('mm.order', o) } catch { /* ignore */ } }

/** cram: random order, ignoring due dates. Otherwise due and unseen items come first.
 *  Prediction-paper questions that depend on an earlier one are pulled in together with it and always stay consecutive and in
 *  source order (so a round may run slightly over `n`). A prediction-paper-only (or UTS-2025-only) round is played in the paper's own number order unless `order` is 'shuffle' (chains stay together either way). */
export function pickQueue(pool: Item[], n: number, stats: Stats, st: QuizState, cram: boolean, all: Item[] = pool, order: Order = getOrder()): string[] {
  let r = shuffle(pool)
  if (!cram) {
    const urgent = (i: Item) => (!st.items[i.id]?.a.length || stats.due.has(i.id) ? 0 : 1)
    r = r.sort((a, b) => urgent(a) - urgent(b))
  }
  r = r.slice(0, n > 0 ? n : r.length)
  if (r.some((i) => i.src === 'latsol' || i.src === 'uts25')) {
    const byId = new Map(all.map((i) => [i.id, i]))
    const kids = new Map<string, Item[]>()
    for (const i of all) if (i.after) kids.set(i.after, [...(kids.get(i.after) ?? []), i])
    for (const l of kids.values()) l.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
    const seen = new Set<string>()
    const out: Item[] = []
    for (const i of r) {
      if (seen.has(i.id)) continue
      const chain = i.src === 'latsol' ? chainOf(i.id, byId, kids) : [i]
      for (const c of chain.length ? chain : [i]) if (!seen.has(c.id)) { seen.add(c.id); out.push(c) }
    }
    r = out
    if (order === 'source' && r.every((i) => i.src === r[0].src && (i.src === 'latsol' || i.src === 'uts25'))) r = [...r].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
  }
  return r.map((i) => i.id)
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
