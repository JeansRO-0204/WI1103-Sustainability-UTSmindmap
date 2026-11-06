import { useCallback, useEffect, useMemo, useState } from 'react'
import Setup, { scopeLabel, type Launch, type StudyCtx } from './Setup'
import { INTERVALS, dueLabel, pickQueue, poolFor, shuffle, profColor } from './quizlib'
import { ConceptChips, Inline, KeyHints, MD, SourceThumbs, Strip, ZoomImg, cleanMath, noFocus } from './quizui'

/** answers[k] is the recorded answer to ids[k] or null (questions can be answered in any order). v = the question on screen (v === ids.length is the summary).
 *  drafts[k] = option picked but not yet checked. An answered question is read-only: nothing already recorded is re-recorded. */
type Ans = { sel: number; ok: boolean }
interface Run { ids: string[]; order: Record<string, number[]>; v: number; drafts: Record<number, number>; answers: (Ans | null)[]; label: string }

function newRun(ctx: StudyCtx, ids: string[], label: string): Run {
  const order: Record<string, number[]> = {}
  for (const id of ids) {
    const q = ctx.qd.questions.get(id)!
    const idx = q.options.map((_, k) => k)
    order[id] = q.source === 'generated' ? shuffle(idx) : idx // Quiz 1 / Quiz 2 / prediction paper option order stays verbatim
  }
  return { ids, order, v: 0, drafts: {}, answers: ids.map(() => null), label }
}

export default function Quiz({ ctx, active, launch }: { ctx: StudyCtx; active: boolean; launch: Launch | null }) {
  const [run, setRun] = useState<Run | null>(null)
  const [empty, setEmpty] = useState('')
  const [lang, setLangState] = useState<'en' | 'id'>(() => { try { return localStorage.getItem('mm.lang') === 'id' ? 'id' : 'en' } catch { return 'en' } })
  const setLang = (l: 'en' | 'id') => { setLangState(l); try { localStorage.setItem('mm.lang', l) } catch { /* private mode */ } }

  const begin = useCallback((ids: string[], label: string) => {
    if (!ids.length) { setEmpty(`No questions in scope: ${label}.`); setRun(null); return }
    setEmpty(''); setRun(newRun(ctx, ids, label))
  }, [ctx])

  // start from outside (Practice buttons)
  useEffect(() => {
    if (!launch || launch.kind !== 'quiz') return
    if (launch.ids) { begin(launch.ids.filter((i) => ctx.qd.questions.has(i)), launch.label ?? 'Search result'); return }
    const pool = poolFor(ctx.qd, ctx.stats, ctx.state, launch.scope, 'q')
    begin(pickQueue(pool, launch.n ?? 10, ctx.stats, ctx.state, launch.cram ?? true, ctx.qd.items), scopeLabel(launch.scope, ctx))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launch?.id])

  const total = run ? run.ids.length : 0
  const answered = run ? run.answers.filter(Boolean).length : 0
  const firstOpen = run ? run.answers.findIndex((a) => !a) : -1
  const q = run && run.v < total ? ctx.qd.questions.get(run.ids[run.v]) : undefined
  const order = run && q ? run.order[q.id] : []
  const ans = run && run.v < total ? run.answers[run.v] ?? undefined : undefined // set => read-only review of an already recorded answer
  const sel = run ? run.drafts[run.v] ?? null : null
  const checked = !!ans

  const select = useCallback((pos: number) => setRun((r) => (r && r.v < r.ids.length && !r.answers[r.v] ? { ...r, drafts: { ...r.drafts, [r.v]: pos } } : r)), [])
  const check = useCallback(() => {
    const pick = run?.drafts[run.v]
    if (!run || !q || run.answers[run.v] || pick == null) return
    const ok = q.answer.includes(order[pick])
    ctx.record(q.id, ok ? 1 : 0, ok ? 1 : 0)
    const answers = run.answers.slice(); answers[run.v] = { sel: pick, ok }
    const drafts = { ...run.drafts }; delete drafts[run.v]
    setRun({ ...run, drafts, answers })
  }, [run, q, order, ctx])
  /** free navigation: any question can be opened, answered or reviewed in any order. Moving forward past the last question opens the summary. */
  const go = useCallback((d: number) => setRun((r) => { if (!r) return r; const nv = r.v + d; return nv < 0 || nv > r.ids.length ? r : { ...r, v: nv } }), [])
  const jump = useCallback((i: number) => setRun((r) => (r && i >= 0 && i <= r.ids.length ? { ...r, v: i } : r)), [])
  /** "Next" after an answer: the following question, or from the last one the first still-unanswered question (summary when none is left) */
  const next = useCallback(() => setRun((r) => {
    if (!r) return r
    if (r.v + 1 < r.ids.length) return { ...r, v: r.v + 1 }
    const open = r.answers.findIndex((a) => !a)
    return { ...r, v: open >= 0 ? open : r.ids.length }
  }), [])

  useEffect(() => {
    if (!active || ctx.paused || !run) return
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || (t.tagName === 'INPUT' && (t as HTMLInputElement).type !== 'radio' && (t as HTMLInputElement).type !== 'checkbox'))) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
      else if (!q) return
      else if (/^[1-9]$/.test(e.key)) { const p = Number(e.key) - 1; if (p < order.length) { e.preventDefault(); select(p) } }
      else if (e.key === 'Enter') { e.preventDefault(); if (checked) next(); else check() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [active, ctx.paused, run, q, order, checked, select, check, go, next])

  const setup = <Setup kind="quiz" ctx={ctx} onStart={begin} />
  if (!run) return <div className="study-body">{empty && <div className="notice warn">{empty}</div>}{setup}</div>
  const strip = (
    <Strip n={total} cur={run.v} max={total - 1} noun="Question" onJump={jump}
      cls={(i) => { const a = run.answers[i]; return a ? (a.ok ? 'ok' : 'bad') : run.drafts[i] != null ? 'todo draft' : 'todo' }} />
  )
  if (!q) return <Summary ctx={ctx} run={run} strip={strip} onBack={() => go(-1)} onOpen={() => jump(firstOpen)} onRetry={(ids) => begin(ids, 'Retry missed')} onNew={() => setRun(null)} />

  const right = run.answers.filter((r) => r?.ok).length
  const selPos = ans ? ans.sel : sel
  const ok = !!ans && ans.ok
  const st = ctx.state.items[q.id]
  const bi = (q.source === 'quiz1' || q.source === 'latsol' || q.source === 'uts25') && !!q.stemId && q.optionsId?.length === q.options.length // bilingual item
  const id = bi && lang === 'id'
  const optText = (i: number) => (id ? q.optionsId![i] : q.options[i])
  return (
    <div className="study-body">
      <div className="qhead">
        <div className="qprog"><div style={{ width: `${(answered / total) * 100}%` }} /></div>
        <span>Question {run.v + 1} / {total}</span>
        <span className="muted">&middot; {right} correct</span>
        <span className="grow" />
        <span className="muted small">{run.label}</span>
        <button className="linkbtn" onClick={() => setRun(null)}>End quiz</button>
      </div>
      {strip}
      {ans && <div className="reviewbar">Reviewing your recorded answer (read-only). <button className="linkbtn" onClick={() => jump(firstOpen >= 0 ? firstOpen : total)}>{firstOpen >= 0 ? `Go to first unanswered (${firstOpen + 1})` : 'Go to summary'}</button></div>}
      <div className="qcard">
        <div className="qtags">
          <span className="tag" style={{ background: ctx.data.moduleColor(q.module) }}>{q.module}</span>
          <span className="tag ghost">{q.topic}</span>
          <span className="tag ghost">{q.source === 'quiz1' ? `Quiz 1 #${q.n ?? ''}` : q.source === 'quiz2' ? `Quiz 2 #${q.n ?? ''}` : q.source === 'latsol' ? `Prediction paper #${q.n ?? ''}` : q.source === 'uts25' ? `UTS 2025 Ver. A #${q.n ?? ''}` : 'Generated'}</span>
          {q.source === 'quiz1' && q.enTranslated && <span className="info-i" tabIndex={0} aria-label="About the English translation" data-tip="English translation by AI; the lecturer's original is Indonesian.">i</span>}
          {q.source === 'latsol' && <span className="info-i" tabIndex={0} aria-label="About the prediction paper" data-tip="Student-made practice paper (SAPPK 2025), not by the lecturer. English is an AI translation; answer key is the authors' and may contain errors.">i</span>}
          {q.source === 'uts25' && <span className="info-i" tabIndex={0} aria-label="About the UTS 2025 paper" data-tip="UTS 2025 Version A paper (published by @shiromewo, CC BY-NC 4.0). It shipped without an answer key, so the answers here are inferred from the slides. English is an AI translation. Questions 8-17 are not in the PDF.">i</span>}
          {q.source === 'generated' && <span className="info-i" tabIndex={0} aria-label="About generated questions" data-tip="AI-generated from the course slides in the style of Quiz 2. Not written by your lecturer and not independently verified. Check anything doubtful against the cited slides.">i</span>}
          {q.after && <span className="tag ghost" title="This question builds on the earlier numbered one; they are always asked together, in order.">continues #{Number(q.after.replace(/\D/g, ''))}</span>}
          {q.keyStatus === 'inferred' && <span className="tag warn" title="The original quiz had no answer key">key inferred</span>}
          {q.keyStatus === 'disputed' && <span className="tag warn" title="The slides disagree with the quiz key">key disputed</span>}
          {q.confidence === 'low' && <span className="tag warn" title="Low confidence that the answer key is right">confidence: low</span>}
          {bi && (
            <span className="grow" />
          )}
          {bi && (
            <span className="langtoggle" role="group" aria-label="Question language">
              {(['en', 'id'] as const).map((l) => (
                <button key={l} className={lang === l ? 'on' : ''} aria-pressed={lang === l} onClick={() => setLang(l)} {...noFocus}>{l.toUpperCase()}</button>
              ))}
            </span>
          )}
        </div>
        <div className="qstem" lang={id ? 'id' : 'en'}><Inline text={id ? q.stemId! : q.stem} /></div>
        {q.images?.length ? <div className="qimgs">{q.images.map((src, k) => <ZoomImg key={src} src={src} alt={`Question ${q.n ?? ''} figure${q.images!.length > 1 ? ` ${k + 1}` : ''}`} />)}</div> : null}
        <div className="opts" role="radiogroup">
          {order.map((oi, pos) => {
            const isRight = checked && q.answer.includes(oi)
            const isWrong = checked && pos === selPos && !isRight
            return (
              <label key={oi} className={'opt' + (pos === selPos ? ' sel' : '') + (isRight ? ' right' : '') + (isWrong ? ' wrong' : '') + (checked ? ' locked' : '')}>
                <input type="radio" name="qopt" checked={pos === selPos} disabled={checked} onChange={() => select(pos)} />
                <kbd>{pos + 1}</kbd>
                <span className="otext" lang={id ? 'id' : 'en'}>
                  <Inline text={optText(oi)} />
                  {q.optionImages?.[oi] && <ZoomImg small src={q.optionImages[oi]!} alt={`Question ${q.n ?? ''} option ${String.fromCharCode(65 + oi)}`} />}
                </span>
                {isRight && <b className="mark">&#10003;</b>}
                {isWrong && <b className="mark">&#10007;</b>}
              </label>
            )
          })}
        </div>
        {q.keyStatus === 'inferred' && !checked && <p className="muted small">{q.source === 'latsol' ? "The authors' answer marking was missing or ambiguous for this question; the answer used here is inferred from the slides." : q.source === 'uts25' ? 'This paper has no answer key; the answer used here is inferred from the slides.' : 'The original quiz shipped without an answer key for this question; the answer used here is inferred from the slides.'}</p>}
        {!checked ? (
          <div className="qactions">
            <button disabled={run.v === 0} onClick={() => go(-1)} title="Previous question (Left arrow)" {...noFocus}>&larr; Back</button>
            <button onClick={() => (run.v + 1 < total ? go(1) : jump(total))} title="Skip without answering (Right arrow)" {...noFocus}>{run.v + 1 < total ? 'Skip' : 'Finish'} &rarr;</button>
            <button className="primary" disabled={sel == null} onClick={check} {...noFocus}>Check <kbd>Enter</kbd></button>
          </div>
        ) : (
          <div className={'feedback ' + (ok ? 'ok' : 'bad')}>
            <h3>{ok ? 'Correct' : 'Not quite'}</h3>
            {!ok && <p className="ans">Correct answer: <b><Inline text={id ? (q.answerTextId ?? optText(q.answer[0])) : q.answerText} /></b></p>}
            {q.explanation && <MD text={q.explanation} />}
            {q.calc && <div className="calcblock"><h5>Worked calculation</h5><p>{cleanMath(q.calc)}</p></div>}
            {q.note && <p className="qnote"><b>Note:</b> {q.note}</p>}
            {st && <p className="muted small">Leitner box <b style={{ color: profColor(((st.b - 1) / 4) * 100) }}>{st.b}</b> / 5 &middot; next review {dueLabel(INTERVALS[st.b - 1])}</p>}
            <SourceThumbs data={ctx.data} sources={q.sources} onSlide={ctx.onSlide} />
            <ConceptChips data={ctx.data} ids={q.nodeIds} onFly={ctx.onFly} />
            <div className="qactions">
              <button disabled={run.v === 0} onClick={() => go(-1)} title="Previous question (Left arrow)" {...noFocus}>&larr; Back</button>
              <button className="primary" onClick={next} title="Next (Enter)" {...noFocus}>{run.v + 1 < total ? 'Next' : firstOpen >= 0 && firstOpen !== run.v ? 'Next unanswered' : 'Finish'} &rarr; <kbd>Enter</kbd></button>
            </div>
          </div>
        )}
      </div>
      <KeyHints items={[['←', 'Back'], ['→', 'Next'], ...(checked ? [] : [['1-9', 'Select'], ['Enter', 'Check']] as [string, string][]), ...(checked ? [['Enter', 'Next']] as [string, string][] : [])]} />
    </div>
  )
}

function Summary({ ctx, run, strip, onBack, onOpen, onRetry, onNew }: { ctx: StudyCtx; run: Run; strip: React.ReactNode; onBack: () => void; onOpen: () => void; onRetry: (ids: string[]) => void; onNew: () => void }) {
  const res = run.answers.flatMap((a, k) => (a ? [{ id: run.ids[k], ok: a.ok }] : []))
  const right = res.filter((r) => r.ok).length
  const total = run.ids.length
  const open = total - res.length
  const missed = res.filter((r) => !r.ok).map((r) => r.id)
  const by = useMemo(() => {
    const m = new Map<string, { ok: number; n: number }>()
    for (const r of res) { const t = ctx.qd.questions.get(r.id)!.topic; const e = m.get(t) ?? { ok: 0, n: 0 }; e.n++; if (r.ok) e.ok++; m.set(t, e) }
    return [...m].map(([topic, e]) => ({ topic, ...e })).sort((a, b) => a.ok / a.n - b.ok / b.n)
  }, [run, ctx.qd])
  const pct = res.length ? Math.round((right / res.length) * 100) : 0
  return (
    <div className="study-body">
      {strip}
      <div className="qcard summary">
        <h2>{open ? 'Quiz summary' : 'Quiz complete'}</h2>
        <div className="score" style={{ color: profColor(pct) }}>{right} / {res.length} <small>{pct}%</small></div>
        {open > 0 && <p className="muted">{open} of {total} question{open === 1 ? '' : 's'} still unanswered (not counted).</p>}
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
          {open > 0 && <button className="primary" onClick={onOpen}>Answer the {open} unanswered</button>}
          <button onClick={onBack} {...noFocus}>&larr; Back to last question</button>
          <button onClick={onNew}>New quiz</button>
        </div>
      </div>
    </div>
  )
}
