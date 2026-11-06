import { useMemo, useState } from 'react'
import type { Data } from './data'
import { pickQueue, poolFor, weakestTopics, type ItemState, type QuizData, type QuizState, type Scope, type Stats } from './quizlib'

export interface Launch { id: number; kind: 'quiz' | 'cards'; scope: Scope; n?: number; cram?: boolean; /** explicit item ids (search results) overrides scope */ ids?: string[]; label?: string }

export interface StudyCtx {
  data: Data; qd: QuizData; state: QuizState; stats: Stats
  record: (id: string, score: number, up: number, now?: number) => void
  /** overwrite one item's stored Leitner state (undefined = remove); used when a grade is changed afterwards */
  restore: (id: string, s: ItemState | undefined) => void
  onFly: (id: string) => void
  onSlide: (module: string, slide: number) => void
  start: (kind: 'quiz' | 'cards', scope: Scope) => void
  /** true while the lightbox is open: keyboard shortcuts must not fire */
  paused: boolean
}

export function scopeLabel(s: Scope, ctx: StudyCtx): string {
  switch (s.kind) {
    case 'all': return 'All material'
    case 'week': return `Week ${ctx.data.modules.find((m) => m.id === s.module)?.week ?? s.module} (${s.module})`
    case 'topic': return `Topic: ${s.topic}`
    case 'weakest': return `Weakest topics: ${weakestTopics(ctx.stats).join(', ')}`
    case 'due': return 'Due now'
    case 'quiz1': return 'Quiz 1 questions'
    case 'quiz2': return 'Quiz 2 questions'
    case 'latsol': return 'Prediction paper questions'
    case 'gen': return 'Generated questions'
    case 'unseen': return 'Unseen items'
    case 'node': return `Concept: ${ctx.data.nodes.get(s.id)?.label ?? s.id}`
  }
}

const KINDS: { k: Scope['kind']; label: string }[] = [
  { k: 'all', label: 'All' }, { k: 'week', label: 'A week' }, { k: 'topic', label: 'A topic' }, { k: 'weakest', label: 'Weakest topics' },
  { k: 'due', label: 'Due now' }, { k: 'quiz1', label: 'Quiz 1 only' }, { k: 'quiz2', label: 'Quiz 2 only' }, { k: 'latsol', label: 'Prediction paper' }, { k: 'gen', label: 'Generated only' }, { k: 'unseen', label: 'Unseen' },
]

export default function Setup({ kind, ctx, onStart }: { kind: 'quiz' | 'cards'; ctx: StudyCtx; onStart: (ids: string[], label: string) => void }) {
  const [sk, setSk] = useState<Scope['kind']>('all')
  const ik = kind === 'quiz' ? 'q' : 'c'
  const has = (s: Scope) => poolFor(ctx.qd, ctx.stats, ctx.state, s, ik).length > 0
  const weeks = ctx.qd.modules.filter((m) => has({ kind: 'week', module: m }))
  const topicList = ctx.qd.topics.filter((t) => has({ kind: 'topic', topic: t.label }))
  const [week, setWeek] = useState(weeks[0] ?? 'M1')
  const [topic, setTopic] = useState(topicList[0]?.label ?? '')
  const [n, setN] = useState(10)
  const [cram, setCram] = useState(true)
  const noun = kind === 'quiz' ? 'questions' : 'cards'
  const scopeOf = (k: Scope['kind']): Scope => {
    switch (k) {
      case 'week': return { kind: 'week', module: week }
      case 'topic': return { kind: 'topic', topic }
      case 'node': return { kind: 'all' }
      default: return { kind: k } as Scope
    }
  }
  const counts = useMemo(() => {
    const o: Record<string, number> = {}
    for (const { k } of KINDS) o[k] = k === 'week' ? weeks.length : k === 'topic' ? topicList.length : poolFor(ctx.qd, ctx.stats, ctx.state, scopeOf(k), ik).length
    return o
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.qd, ctx.stats, ctx.state, week, topic, ik])
  const scope = scopeOf(sk)
  const pool = poolFor(ctx.qd, ctx.stats, ctx.state, scope, ik)
  const count = n > 0 ? Math.min(n, pool.length) : pool.length
  const go = () => onStart(pickQueue(pool, n, ctx.stats, ctx.state, sk === 'due' ? false : cram), scopeLabel(scope, ctx))
  const dueCount = poolFor(ctx.qd, ctx.stats, ctx.state, { kind: 'due' }, ik).length

  return (
    <div className="setup">
      <h2>{kind === 'quiz' ? 'Practice quiz' : 'Flashcards'}</h2>
      <p className="muted">
        {kind === 'quiz' ? 'One question at a time with instant feedback, explanation and source slides.' : 'Flip the card, then grade yourself. Cards graded Again come back at the end of the session.'}
        {' '}{dueCount > 0 ? <b>{dueCount} {noun} due for review.</b> : 'Nothing is due for review yet.'}
      </p>
      <h5>What to practice</h5>
      <div className="scope-chips">
        {KINDS.map(({ k, label }) => (
          <button key={k} className={'sc' + (sk === k ? ' on' : '')} disabled={counts[k] === 0} onClick={() => setSk(k)}>
            {label}{k !== 'week' && k !== 'topic' && <small>{counts[k]}</small>}
          </button>
        ))}
      </div>
      {sk === 'week' && (
        <select value={week} onChange={(e) => setWeek(e.target.value)}>
          {weeks.map((m) => <option key={m} value={m}>{m} &middot; {ctx.data.modules.find((x) => x.id === m)?.title ?? ''} ({poolFor(ctx.qd, ctx.stats, ctx.state, { kind: 'week', module: m }, ik).length})</option>)}
        </select>
      )}
      {sk === 'topic' && (
        <select value={topic} onChange={(e) => setTopic(e.target.value)}>
          {topicList.map((t) => <option key={t.label} value={t.label}>{t.module} &middot; {t.label} ({poolFor(ctx.qd, ctx.stats, ctx.state, { kind: 'topic', topic: t.label }, ik).length})</option>)}
        </select>
      )}
      {sk === 'weakest' && <p className="muted small">{weakestTopics(ctx.stats).join(' · ') || 'No topics yet.'}</p>}
      <div className="row">
        <label>How many&nbsp;
          <select value={n} onChange={(e) => setN(Number(e.target.value))}>
            {[5, 10, 20, 40].map((v) => <option key={v} value={v}>{v}</option>)}
            <option value={0}>All in scope</option>
          </select>
        </label>
        <label className={sk === 'due' ? 'dis' : ''} title="Pick items regardless of their due date, in random order. Use this when the exam is close.">
          <input type="checkbox" checked={cram || sk === 'due'} disabled={sk === 'due'} onChange={(e) => setCram(e.target.checked)} /> Cram mode (ignore due dates)
        </label>
      </div>
      <button className="primary" disabled={!pool.length} onClick={go}>
        {pool.length ? `Start ${count} ${noun}` : `No ${noun} in this scope`}
      </button>
      {!cram && sk !== 'due' && <p className="muted small">Without cram mode, due and never-seen items are picked first.</p>}
    </div>
  )
}
