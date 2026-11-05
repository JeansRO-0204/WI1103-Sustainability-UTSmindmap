import { useMemo, useRef, useState } from 'react'
import type { StudyCtx } from './Setup'
import { exportProgress, parseProgress, profColor, weakestTopics, type QuizState } from './quizlib'
import { Bar, pct } from './quizui'

interface Props {
  ctx: StudyCtx
  reviewed: string[]
  mergeProgress: (reviewed: string[], quiz: QuizState) => { newReviewed: number; newAttempts: number; itemsTouched: number }
}

export default function Progress({ ctx, reviewed, mergeProgress }: Props) {
  const { stats, qd, data, state } = ctx
  const [note, setNote] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const file = useRef<HTMLInputElement>(null)

  const topics = useMemo(() => [...stats.topic].map(([label, a]) => ({ label, ...a })).sort((a, b) => {
    if ((a.tested > 0) !== (b.tested > 0)) return a.tested > 0 ? -1 : 1 // tested first (weakest first), untested grey at the end
    return a.p - b.p || a.label.localeCompare(b.label)
  }), [stats])
  const weakNodes = useMemo(() => [...stats.node].filter(([, a]) => a.tested > 0).map(([id, a]) => ({ id, ...a })).sort((a, b) => a.p - b.p).slice(0, 8), [stats])
  const weakest = new Set(weakestTopics(stats))
  const o = stats.overall
  const attempted = Object.values(state.items).filter((s) => s.a.length).length

  const doExport = () => {
    const text = exportProgress(reviewed, state)
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url; a.download = `wi1103-progress-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNote({ kind: 'ok', text: `Exported ${reviewed.length} reviewed concept${reviewed.length === 1 ? '' : 's'} and ${attempted} practiced item${attempted === 1 ? '' : 's'} to a JSON file. Keep it somewhere safe; import it on another browser or device to carry your progress over.` })
  }
  const doImport = async (f: File | undefined) => {
    if (!f) return
    try {
      const p = parseProgress(await f.text())
      const r = mergeProgress(p.reviewed, p.quiz)
      setNote({
        kind: 'ok',
        text: `Imported "${f.name}" and merged it into your current progress (nothing was deleted; newer attempts win). Added ${r.newReviewed} reviewed concept${r.newReviewed === 1 ? '' : 's'}, ${r.newAttempts} new attempt${r.newAttempts === 1 ? '' : 's'} across ${r.itemsTouched} item${r.itemsTouched === 1 ? '' : 's'}.`,
      })
    } catch (e) {
      setNote({ kind: 'err', text: `Import failed, nothing was changed: ${(e as Error).message}` })
    }
    if (file.current) file.current.value = ''
  }

  return (
    <div className="study-body wide">
      {note && <div className={'notice ' + (note.kind === 'ok' ? 'good' : 'warn')} role="status">{note.text} <button className="linkbtn" onClick={() => setNote(null)}>dismiss</button></div>}
      <div className="dash-top">
        <div className="ready" style={{ ['--pc' as any]: profColor(o.p, o.tested > 0) }}>
          <div className="big">{o.tested > 0 ? `${o.p}%` : '–'}</div>
          <div><b>Overall readiness</b><br /><span className="muted small">{o.tested}/{o.total} items practiced &middot; {o.attempts} attempts &middot; duplicates not counted</span></div>
        </div>
        <div className="dash-actions">
          <button className="primary" onClick={() => ctx.start('quiz', { kind: 'weakest' })} disabled={!stats.topic.size}>Quiz my weakest topics</button>
          <button onClick={() => ctx.start('quiz', { kind: 'due' })} disabled={!stats.due.size}>Due now ({[...stats.due].filter((i) => qd.itemMap.get(i)?.kind === 'q' && !qd.itemMap.get(i)?.dup).length} q)</button>
          <button onClick={() => ctx.start('cards', { kind: 'due' })} disabled={!stats.due.size}>Due cards ({[...stats.due].filter((i) => qd.itemMap.get(i)?.kind === 'c').length})</button>
          <button onClick={() => ctx.start('quiz', { kind: 'all' })}>Cram everything</button>
        </div>
      </div>

      <h3>By week</h3>
      <div className="weeks">
        {qd.modules.map((m) => {
          const a = stats.week.get(m)
          const mod = data.modules.find((x) => x.id === m)
          return (
            <div key={m} className="wrow">
              <span className="wname" style={{ ['--c' as any]: data.moduleColor(m) }}><i />{m}{mod?.week ? ` · W${mod.week}` : ''}</span>
              <span className="wtitle muted small" title={mod?.title}>{mod?.title}</span>
              <Bar agg={a} />
              <span className="pnum" style={{ color: profColor(a?.p, !!a?.tested) }}>{pct(a)}</span>
              <span className="muted small tnum">{a?.tested ?? 0}/{a?.total ?? 0}</span>
              <button className="linkbtn" onClick={() => ctx.start('quiz', { kind: 'week', module: m })}>Practice</button>
            </div>
          )
        })}
      </div>

      <h3>Topics, weakest first</h3>
      <div className="topics-list">
        {topics.map((t) => (
          <div key={t.label} className={'trow' + (t.tested ? '' : ' untested')}>
            <span className="tname"><i style={{ background: data.moduleColor(t.module) }} />{t.label}{weakest.has(t.label) && <em className="tagw">weak</em>}</span>
            <span className="muted small tmod">{t.module}</span>
            <Bar agg={t} />
            <span className="pnum" style={{ color: profColor(t.p, t.tested > 0) }}>{pct(t)}</span>
            <span className="muted small tnum" title="attempts / items practiced">{t.attempts} att. &middot; {t.tested}/{t.total}</span>
            <button className="linkbtn" onClick={() => ctx.start('quiz', { kind: 'topic', topic: t.label })}>Practice this</button>
          </div>
        ))}
        {!topics.length && <p className="muted">No quiz data loaded.</p>}
      </div>

      {weakNodes.length > 0 && (
        <>
          <h3>Weakest concepts</h3>
          <div className="qchips">
            {weakNodes.map((w) => {
              const n = data.nodes.get(w.id)!
              return <button key={w.id} className="chip" style={{ ['--c' as any]: profColor(w.p) }} onClick={() => ctx.start('quiz', { kind: 'node', id: w.id })} title="Practice this concept">{n.label} <b>{w.p}%</b></button>
            })}
          </div>
        </>
      )}

      <h3>Your progress file</h3>
      <p className="muted small">Progress lives in this browser only (<code>localStorage</code>). Export it to back it up or move it to another device; import merges, it never overwrites newer attempts.</p>
      <div className="dash-actions">
        <button onClick={doExport}>Export progress</button>
        <button onClick={() => file.current?.click()}>Import progress</button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => doImport(e.target.files?.[0])} />
      </div>
    </div>
  )
}

