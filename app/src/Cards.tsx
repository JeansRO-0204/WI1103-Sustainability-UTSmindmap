import { useCallback, useEffect, useState } from 'react'
import Setup, { scopeLabel, type Launch, type StudyCtx } from './Setup'
import { pickQueue, poolFor, profColor } from './quizlib'
import { ConceptChips, MD, SourceThumbs, noFocus } from './quizui'

type G = 0 | 1 | 2 // again, good, easy
interface Run { queue: string[]; i: number; flipped: boolean; grades: { id: string; g: G }[]; requeued: Record<string, number>; label: string }
const SCORE = [0, 0.8, 1]
const NAME = ['Again', 'Good', 'Easy']

export default function Cards({ ctx, active, launch }: { ctx: StudyCtx; active: boolean; launch: Launch | null }) {
  const [run, setRun] = useState<Run | null>(null)
  const [empty, setEmpty] = useState('')

  const begin = useCallback((ids: string[], label: string) => {
    if (!ids.length) { setEmpty(`No cards in scope: ${label}.`); setRun(null); return }
    setEmpty(''); setRun({ queue: ids, i: 0, flipped: false, grades: [], requeued: {}, label })
  }, [])

  useEffect(() => {
    if (!launch || launch.kind !== 'cards') return
    const pool = poolFor(ctx.qd, ctx.stats, ctx.state, launch.scope, 'c')
    begin(pickQueue(pool, launch.n ?? 10, ctx.stats, ctx.state, launch.cram ?? true), scopeLabel(launch.scope, ctx))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launch?.id])

  const cur = run && run.i < run.queue.length ? run.queue[run.i] : undefined
  const card = cur ? ctx.qd.cards.get(cur) : undefined

  const flip = useCallback(() => setRun((r) => (r && r.i < r.queue.length ? { ...r, flipped: !r.flipped } : r)), [])
  const grade = useCallback((g: G) => {
    if (!run || !cur || !run.flipped) return
    ctx.record(cur, SCORE[g], g === 0 ? 0 : g === 1 ? 1 : 2)
    const again = g === 0 && (run.requeued[cur] ?? 0) < 2
    setRun({
      ...run, i: run.i + 1, flipped: false,
      queue: again ? [...run.queue, cur] : run.queue,
      requeued: again ? { ...run.requeued, [cur]: (run.requeued[cur] ?? 0) + 1 } : run.requeued,
      grades: [...run.grades, { id: cur, g }],
    })
  }, [run, cur, ctx])

  useEffect(() => {
    if (!active || ctx.paused || !run || !card) return
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || (t.tagName === 'INPUT' && (t as HTMLInputElement).type !== 'checkbox'))) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip() }
      else if (e.key === '1' || e.key === '2' || e.key === '3') { e.preventDefault(); grade((Number(e.key) - 1) as G) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [active, ctx.paused, run, card, flip, grade])

  if (!run) return <div className="study-body">{empty && <div className="notice warn">{empty}</div>}<Setup kind="cards" ctx={ctx} onStart={begin} /></div>

  if (!card) {
    const cnt = [0, 0, 0]
    // final grade per card
    const last = new Map<string, G>()
    for (const x of run.grades) last.set(x.id, x.g)
    for (const g of last.values()) cnt[g]++
    const again = [...last].filter(([, g]) => g === 0).map(([id]) => id)
    return (
      <div className="study-body">
        <div className="qcard summary">
          <h2>Session complete</h2>
          <p className="muted">{run.label} &middot; {last.size} card{last.size === 1 ? '' : 's'}, {run.grades.length} grades</p>
          <div className="gradesum">
            {NAME.map((n, g) => <div key={n} style={{ borderColor: profColor([10, 60, 95][g]) }}><b>{cnt[g]}</b><span>{n}</span></div>)}
          </div>
          <div className="qactions">
            {again.length > 0 && <button className="primary" onClick={() => begin(again, 'Cards you missed')}>Repeat the Again cards ({again.length})</button>}
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
        <div className="qprog"><div style={{ width: `${(run.i / run.queue.length) * 100}%` }} /></div>
        <span>Card {run.i + 1} / {run.queue.length}</span>
        <span className="grow" />
        <span className="muted small">{run.label}</span>
        <button className="linkbtn" onClick={() => setRun(null)}>End session</button>
      </div>
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
      {run.flipped && (
        <div className="fc-after">
          <div className="grade">
            {NAME.map((n, g) => (
              <button key={n} className={'g' + g} onClick={() => grade(g as G)} {...noFocus}>{n} <kbd>{g + 1}</kbd></button>
            ))}
          </div>
          <SourceThumbs data={ctx.data} sources={card.sources} onSlide={ctx.onSlide} />
          <ConceptChips data={ctx.data} ids={[card.nodeId]} onFly={ctx.onFly} />
        </div>
      )}
    </div>
  )
}
