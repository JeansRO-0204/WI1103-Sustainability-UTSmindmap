import { useCallback, useEffect, useMemo, useState } from 'react'
import Setup, { scopeLabel, type Launch, type StudyCtx } from './Setup'
import { INTERVALS, dueLabel, pickQueue, poolFor, shuffle, profColor } from './quizlib'
import { ConceptChips, Inline, MD, SourceThumbs, noFocus } from './quizui'

interface Run { ids: string[]; order: Record<string, number[]>; i: number; sel: number | null; checked: boolean; res: { id: string; ok: boolean }[]; label: string }

function newRun(ctx: StudyCtx, ids: string[], label: string): Run {
  const order: Record<string, number[]> = {}
  for (const id of ids) {
    const q = ctx.qd.questions.get(id)!
    const idx = q.options.map((_, k) => k)
    order[id] = q.source === 'generated' ? shuffle(idx) : idx // Quiz 2 option order stays verbatim
  }
  return { ids, order, i: 0, sel: null, checked: false, res: [], label }
}

export default function Quiz({ ctx, active, launch }: { ctx: StudyCtx; active: boolean; launch: Launch | null }) {
  const [run, setRun] = useState<Run | null>(null)
  const [empty, setEmpty] = useState('')

  const begin = useCallback((ids: string[], label: string) => {
    if (!ids.length) { setEmpty(`No questions in scope: ${label}.`); setRun(null); return }
    setEmpty(''); setRun(newRun(ctx, ids, label))
  }, [ctx])

  // start from outside (Practice buttons)
  useEffect(() => {
    if (!launch || launch.kind !== 'quiz') return
    const pool = poolFor(ctx.qd, ctx.stats, ctx.state, launch.scope, 'q')
    begin(pickQueue(pool, launch.n ?? 10, ctx.stats, ctx.state, launch.cram ?? true), scopeLabel(launch.scope, ctx))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launch?.id])

  const q = run && run.i < run.ids.length ? ctx.qd.questions.get(run.ids[run.i]) : undefined
  const order = run && q ? run.order[q.id] : []

  const select = useCallback((pos: number) => setRun((r) => (r && !r.checked ? { ...r, sel: pos } : r)), [])
  const check = useCallback(() => {
    if (!run || run.sel == null || run.checked || !q) return
    const ok = q.answer.includes(order[run.sel])
    ctx.record(q.id, ok ? 1 : 0, ok ? 1 : 0)
    setRun({ ...run, checked: true, res: [...run.res, { id: q.id, ok }] })
  }, [run, q, order, ctx])
  const next = useCallback(() => setRun((r) => (r && r.checked ? { ...r, i: r.i + 1, sel: null, checked: false } : r)), [])

  useEffect(() => {
    if (!active || ctx.paused || !run || !q) return
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || (t.tagName === 'INPUT' && (t as HTMLInputElement).type !== 'radio' && (t as HTMLInputElement).type !== 'checkbox'))) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (/^[1-9]$/.test(e.key)) { const p = Number(e.key) - 1; if (p < order.length) { e.preventDefault(); select(p) } }
      else if (e.key === 'Enter') { e.preventDefault(); if (run.checked) next(); else check() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [active, ctx.paused, run, q, order, select, check, next])

  const setup = <Setup kind="quiz" ctx={ctx} onStart={begin} />
  if (!run) return <div className="study-body">{empty && <div className="notice warn">{empty}</div>}{setup}</div>
  if (!q) return <Summary ctx={ctx} run={run} onRetry={(ids) => begin(ids, 'Retry missed')} onNew={() => setRun(null)} />

  const total = run.ids.length
  const right = run.res.filter((r) => r.ok).length
  const picked = run.sel != null ? order[run.sel] : -1
  const ok = run.checked && q.answer.includes(picked)
  const st = ctx.state.items[q.id]
  return (
    <div className="study-body">
      <div className="qhead">
        <div className="qprog"><div style={{ width: `${((run.i + (run.checked ? 1 : 0)) / total) * 100}%` }} /></div>
        <span>Question {run.i + 1} / {total}</span>
        <span className="muted">&middot; {right} correct</span>
        <span className="grow" />
        <span className="muted small">{run.label}</span>
        <button className="linkbtn" onClick={() => setRun(null)}>End quiz</button>
      </div>
      <div className="qcard">
        <div className="qtags">
          <span className="tag" style={{ background: ctx.data.moduleColor(q.module) }}>{q.module}</span>
          <span className="tag ghost">{q.topic}</span>
          <span className="tag ghost">{q.source === 'quiz2' ? `Quiz 2 #${q.n ?? ''}` : 'Generated'}</span>
          {q.source !== 'quiz2' && <span className="info-i" tabIndex={0} aria-label="About generated questions" data-tip="AI-generated from the course slides in the style of Quiz 2. Not written by your lecturer and not independently verified. Check anything doubtful against the cited slides.">i</span>}
          {q.keyStatus === 'inferred' && <span className="tag warn" title="The original quiz had no answer key">key inferred</span>}
          {q.keyStatus === 'disputed' && <span className="tag warn" title="The slides disagree with the quiz key">key disputed</span>}
        </div>
        <div className="qstem"><Inline text={q.stem} /></div>
        <div className="opts" role="radiogroup">
          {order.map((oi, pos) => {
            const isRight = run.checked && q.answer.includes(oi)
            const isWrong = run.checked && pos === run.sel && !isRight
            return (
              <label key={oi} className={'opt' + (pos === run.sel ? ' sel' : '') + (isRight ? ' right' : '') + (isWrong ? ' wrong' : '') + (run.checked ? ' locked' : '')}>
                <input type="radio" name="qopt" checked={pos === run.sel} disabled={run.checked} onChange={() => select(pos)} />
                <kbd>{pos + 1}</kbd>
                <span className="otext"><Inline text={q.options[oi]} /></span>
                {isRight && <b className="mark">&#10003;</b>}
                {isWrong && <b className="mark">&#10007;</b>}
              </label>
            )
          })}
        </div>
        {q.keyStatus === 'inferred' && !run.checked && <p className="muted small">The original quiz shipped without an answer key for this question; the answer used here is inferred from the slides.</p>}
        {!run.checked ? (
          <div className="qactions">
            <button className="primary" disabled={run.sel == null} onClick={check} {...noFocus}>Check <kbd>Enter</kbd></button>
          </div>
        ) : (
          <div className={'feedback ' + (ok ? 'ok' : 'bad')}>
            <h3>{ok ? 'Correct' : 'Not quite'}</h3>
            {!ok && <p className="ans">Correct answer: <b><Inline text={q.answerText} /></b></p>}
            {q.explanation && <MD text={q.explanation} />}
            {q.note && <p className="qnote"><b>Note:</b> {q.note}</p>}
            {st && <p className="muted small">Leitner box <b style={{ color: profColor(((st.b - 1) / 4) * 100) }}>{st.b}</b> / 5 &middot; next review {dueLabel(INTERVALS[st.b - 1])}</p>}
            <SourceThumbs data={ctx.data} sources={q.sources} onSlide={ctx.onSlide} />
            <ConceptChips data={ctx.data} ids={q.nodeIds} onFly={ctx.onFly} />
            <div className="qactions">
              <button className="primary" onClick={next} {...noFocus}>{run.i + 1 < total ? 'Next question' : 'Finish'} <kbd>Enter</kbd></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Summary({ ctx, run, onRetry, onNew }: { ctx: StudyCtx; run: Run; onRetry: (ids: string[]) => void; onNew: () => void }) {
  const right = run.res.filter((r) => r.ok).length
  const total = run.res.length
  const missed = run.res.filter((r) => !r.ok).map((r) => r.id)
  const by = useMemo(() => {
    const m = new Map<string, { ok: number; n: number }>()
    for (const r of run.res) { const t = ctx.qd.questions.get(r.id)!.topic; const e = m.get(t) ?? { ok: 0, n: 0 }; e.n++; if (r.ok) e.ok++; m.set(t, e) }
    return [...m].map(([topic, e]) => ({ topic, ...e })).sort((a, b) => a.ok / a.n - b.ok / b.n)
  }, [run, ctx.qd])
  const pct = total ? Math.round((right / total) * 100) : 0
  return (
    <div className="study-body">
      <div className="qcard summary">
        <h2>Quiz complete</h2>
        <div className="score" style={{ color: profColor(pct) }}>{right} / {total} <small>{pct}%</small></div>
        <p className="muted">{run.label}</p>
        <h5>By topic</h5>
        <div className="bytopic">
          {by.map((t) => (
            <div key={t.topic} className="trow">
              <span className="tname">{t.topic}</span>
              <div className="pbar"><div style={{ width: `${(t.ok / t.n) * 100}%`, background: profColor((t.ok / t.n) * 100) }} /></div>
              <span className="tnum">{t.ok}/{t.n}</span>
              <button className="linkbtn" onClick={() => ctx.start('quiz', { kind: 'topic', topic: t.topic })}>Practice</button>
            </div>
          ))}
        </div>
        <div className="qactions">
          {missed.length > 0 && <button className="primary" onClick={() => onRetry(missed)}>Retry missed ({missed.length})</button>}
          <button onClick={onNew}>New quiz</button>
        </div>
      </div>
    </div>
  )
}
