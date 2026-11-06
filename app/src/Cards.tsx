import { useCallback, useEffect, useState } from 'react'
import Setup, { scopeLabel, type Launch, type StudyCtx } from './Setup'
import { applyAttempt, pickQueue, poolFor, profColor, type ItemState } from './quizlib'
import { ConceptChips, KeyHints, MD, SourceThumbs, Strip, noFocus } from './quizui'

type G = 0 | 1 | 2 // again, good, easy
/** One graded position in the queue. prev = the item's stored state just before this grade, so the grade can be undone and replaced. */
interface Att { id: string; g: G; t: number; prev: ItemState | undefined; rq: boolean }
/** atts[k] is the grade of queue[k] (graded strictly in order). v = card on screen (v === queue.length is the summary). */
interface Run { queue: string[]; v: number; flipped: boolean; atts: Att[]; requeued: Record<string, number>; label: string }
const SCORE = [0, 0.8, 1]
const UP = [0, 1, 2]
const NAME = ['Again', 'Good', 'Easy']

export default function Cards({ ctx, active, launch }: { ctx: StudyCtx; active: boolean; launch: Launch | null }) {
  const [run, setRun] = useState<Run | null>(null)
  const [empty, setEmpty] = useState('')

  const begin = useCallback((ids: string[], label: string) => {
    if (!ids.length) { setEmpty(`No cards in scope: ${label}.`); setRun(null); return }
    setEmpty(''); setRun({ queue: ids, v: 0, flipped: false, atts: [], requeued: {}, label })
  }, [])

  useEffect(() => {
    if (!launch || launch.kind !== 'cards') return
    if (launch.ids) { begin(launch.ids.filter((i) => ctx.qd.cards.has(i)), launch.label ?? 'Search result'); return }
    const pool = poolFor(ctx.qd, ctx.stats, ctx.state, launch.scope, 'c')
    begin(pickQueue(pool, launch.n ?? 10, ctx.stats, ctx.state, launch.cram ?? true), scopeLabel(launch.scope, ctx))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launch?.id])

  const f = run ? run.atts.length : 0 // first ungraded position
  const cur = run && run.v < run.queue.length ? run.queue[run.v] : undefined
  const card = cur ? ctx.qd.cards.get(cur) : undefined
  const done = run && run.v < f ? run.atts[run.v] : undefined // set => this card was graded already

  const flip = useCallback(() => setRun((r) => (r && r.v < r.queue.length ? { ...r, flipped: !r.flipped } : r)), [])
  /** graded cards reopen on the answer side; the first ungraded one starts on the prompt */
  const moveTo = (r: Run, nv: number): Run => (nv < 0 || nv > r.atts.length || nv > r.queue.length ? r : { ...r, v: nv, flipped: nv < r.atts.length })
  const go = useCallback((d: number) => setRun((r) => (r ? moveTo(r, r.v + d) : r)), [])
  const jump = useCallback((i: number) => setRun((r) => (r ? moveTo(r, i) : r)), [])

  const grade = useCallback((g: G) => {
    if (!run || !cur) return
    if (run.v === run.atts.length) {
      // first grade of this position
      if (!run.flipped) return
      const t = Date.now()
      const prev = ctx.state.items[cur]
      ctx.record(cur, SCORE[g], UP[g], t)
      const again = g === 0 && (run.requeued[cur] ?? 0) < 2
      setRun({
        ...run, v: run.v + 1, flipped: false,
        queue: again ? [...run.queue, cur] : run.queue,
        requeued: again ? { ...run.requeued, [cur]: (run.requeued[cur] ?? 0) + 1 } : run.requeued,
        atts: [...run.atts, { id: cur, g, t, prev, rq: again }],
      })
      return
    }
    // changing the grade of an earlier card: roll the item back to its snapshot, apply the new grade, then replay any later grades of the same card
    const old = run.atts[run.v]
    if (old.g === g) return
    const atts = [...run.atts]
    let s = applyAttempt(old.prev, SCORE[g], UP[g], old.t)
    atts[run.v] = { ...old, g }
    for (let k = run.v + 1; k < atts.length; k++) {
      if (atts[k].id !== cur) continue
      atts[k] = { ...atts[k], prev: s }
      s = applyAttempt(s, SCORE[atts[k].g], UP[atts[k].g], atts[k].t)
    }
    ctx.restore(cur, s)
    // keep the requeue (Again -> comes back) consistent with the new grade when the extra copy has not been shown yet
    let queue = run.queue, requeued = run.requeued
    if (old.rq && g !== 0) {
      const p = queue.lastIndexOf(cur)
      if (p >= atts.length) { queue = queue.filter((_, i) => i !== p); requeued = { ...requeued, [cur]: (requeued[cur] ?? 1) - 1 }; atts[run.v].rq = false }
    } else if (!old.rq && g === 0 && (requeued[cur] ?? 0) < 2) {
      queue = [...queue, cur]; requeued = { ...requeued, [cur]: (requeued[cur] ?? 0) + 1 }; atts[run.v].rq = true
    }
    setRun({ ...run, atts, queue, requeued })
  }, [run, cur, ctx])

  useEffect(() => {
    if (!active || ctx.paused || !run) return
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || (t.tagName === 'INPUT' && (t as HTMLInputElement).type !== 'checkbox'))) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
      else if (!card) return
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip() }
      else if (e.key === '1' || e.key === '2' || e.key === '3') { e.preventDefault(); grade((Number(e.key) - 1) as G) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [active, ctx.paused, run, card, flip, grade, go])

  if (!run) return <div className="study-body">{empty && <div className="notice warn">{empty}</div>}<Setup kind="cards" ctx={ctx} onStart={begin} /></div>

  const strip = (
    <Strip n={run.queue.length} cur={run.v} max={f} noun="Card" onJump={jump} cls={(i) => (i < f ? 'g' + run.atts[i].g : 'todo')} />
  )
  if (!card) {
    const cnt = [0, 0, 0]
    // final grade per card
    const last = new Map<string, G>()
    for (const x of run.atts) last.set(x.id, x.g)
    for (const g of last.values()) cnt[g]++
    const again = [...last].filter(([, g]) => g === 0).map(([id]) => id)
    return (
      <div className="study-body">
        {strip}
        <div className="qcard summary">
          <h2>Session complete</h2>
          <p className="muted">{run.label} &middot; {last.size} card{last.size === 1 ? '' : 's'}, {run.atts.length} grades</p>
          <div className="gradesum">
            {NAME.map((n, g) => <div key={n} style={{ borderColor: profColor([10, 60, 95][g]) }}><b>{cnt[g]}</b><span>{n}</span></div>)}
          </div>
          <div className="qactions">
            {again.length > 0 && <button className="primary" onClick={() => begin(again, 'Cards you missed')}>Repeat the Again cards ({again.length})</button>}
            <button onClick={() => go(-1)} {...noFocus}>&larr; Back to last card</button>
            <button onClick={() => setRun(null)}>New session</button>
          </div>
        </div>
      </div>
    )
  }

  const color = ctx.data.moduleColor(card.module)
  return (
    <div className="study-body">
      <div className="qhead">
        <div className="qprog"><div style={{ width: `${(f / run.queue.length) * 100}%` }} /></div>
        <span>Card {run.v + 1} / {run.queue.length}</span>
        <span className="grow" />
        <span className="muted small">{run.label}</span>
        <button className="linkbtn" onClick={() => setRun(null)}>End session</button>
      </div>
      {strip}
      {done && <div className="reviewbar">Already graded <b>{NAME[done.g]}</b>. Pick another grade to change it (the Leitner box is recomputed). <button className="linkbtn" onClick={() => jump(f)}>{f < run.queue.length ? `Resume at card ${f + 1}` : 'Go to summary'}</button></div>}
      <div className={'flash' + (run.flipped ? ' flipped' : '')} style={{ ['--c' as any]: color }} onClick={flip}>
        <div className="qtags">
          <span className="tag" style={{ background: color }}>{card.module}</span>
          <span className="tag ghost">{card.topic}</span>
          <span className="tag ghost">{run.flipped ? 'Answer' : 'Prompt'}</span>
        </div>
        <div className="fc-text">
          <MD text={run.flipped ? card.back : card.front} />
        </div>
        {!run.flipped && <div className="muted small hint">Click or press <kbd>Space</kbd> to flip</div>}
      </div>
      {(run.flipped || done) && (
        <div className="fc-after">
          <div className="grade">
            {NAME.map((n, g) => (
              <button key={n} className={'g' + g + (done?.g === g ? ' picked' : '')} onClick={() => grade(g as G)} {...noFocus}>{n} <kbd>{g + 1}</kbd></button>
            ))}
          </div>
          <SourceThumbs data={ctx.data} sources={card.sources} onSlide={ctx.onSlide} />
          <ConceptChips data={ctx.data} ids={[card.nodeId]} onFly={ctx.onFly} />
        </div>
      )}
      <KeyHints items={[['←', 'Back'], ['→', 'Next (graded cards)'], ['Space', 'Flip'], ['1/2/3', 'Again / Good / Easy']]} />
    </div>
  )
}
