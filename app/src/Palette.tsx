import { useEffect, useMemo, useRef, useState } from 'react'
import type { Data } from './data'
import type { QuizData } from './quizlib'
import { buildQuizIndex, snippet, termsOf, type QuizIndex } from './search'

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

export function SearchBtn({ onClick }: { onClick: () => void }) {
  return <button className="tb searchbtn" onClick={onClick} title={`Search everything (${isMac ? '⌘' : 'Ctrl+'}K)`}>&#128269; Search <kbd>{isMac ? '⌘K' : 'Ctrl K'}</kbd></button>
}

type Group = 'node' | 'slide' | 'q' | 'c'
type Row =
  | { t: 'node'; id: string }
  | { t: 'slide'; module: string; slide: number }
  | { t: 'q'; id: string }
  | { t: 'c'; id: string }
  | { t: 'more'; g: Group; left: number }

const TITLES: Record<Group, string> = { node: 'Concepts', slide: 'Slides', q: 'Quiz questions', c: 'Flashcards' }
const PAGE = 8, MAXR = 60
const SRC = (q: { source: string; n?: number }) => (q.source === 'quiz1' ? `Quiz 1 #${q.n ?? ''}` : q.source === 'quiz2' ? `Quiz 2 #${q.n ?? ''}` : q.source === 'latsol' ? `Prediction #${q.n ?? ''}` : q.source === 'uts25' ? `UTS 2025 #${q.n ?? ''}` : 'Generated')

interface Props {
  open: boolean; onClose: () => void
  data: Data; qd: QuizData | null
  initial: string; onQuery: (q: string) => void
  onNode: (id: string) => void
  onSlide: (module: string, slide: number) => void
  onQuestion: (id: string) => void
  onCard: (id: string) => void
}

export default function Palette(p: Props) {
  const { open, data, qd } = p
  const [val, setVal] = useState(p.initial)
  const [dq, setDq] = useState(p.initial.trim())
  const [limits, setLimits] = useState<Record<Group, number>>({ node: PAGE, slide: PAGE, q: PAGE, c: PAGE })
  const [sel, setSel] = useState(0)
  const inp = useRef<HTMLInputElement>(null)
  const idx = useRef<{ qd: QuizData; ix: QuizIndex } | null>(null)
  const actRef = useRef<HTMLDivElement>(null)

  // lazy: build the question/card index the first time the palette is open with quiz data available
  if (open && qd && idx.current?.qd !== qd) idx.current = { qd, ix: buildQuizIndex(qd) }

  useEffect(() => { if (open) { setVal((v) => v); setTimeout(() => { inp.current?.focus(); inp.current?.select() }, 0) } }, [open])
  useEffect(() => { const t = setTimeout(() => setDq(val.trim()), 120); return () => clearTimeout(t) }, [val])
  useEffect(() => { p.onQuery(val) }, [val]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setLimits({ node: PAGE, slide: PAGE, q: PAGE, c: PAGE }); setSel(0) }, [dq])

  const found = useMemo(() => {
    if (!open || dq.length < 2) return null
    const ix = idx.current?.ix
    return {
      node: data.nodeSearch.search(dq).slice(0, MAXR).map((r) => String(r.id)),
      slide: data.slideSearch.search(dq).slice(0, MAXR).map((r) => String(r.id)),
      q: ix ? ix.q.search(dq).slice(0, MAXR).map((r) => String(r.id)) : [],
      c: ix ? ix.c.search(dq).slice(0, MAXR).map((r) => String(r.id)) : [],
    }
  }, [open, dq, data, qd]) // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => {
    if (!found) return []
    const out: { g: Group; rows: Row[]; total: number }[] = []
    for (const g of ['node', 'slide', 'q', 'c'] as Group[]) {
      const ids = found[g]
      if (!ids.length) continue
      const rows: Row[] = ids.slice(0, limits[g]).map((id) => {
        if (g === 'node') return { t: 'node', id }
        if (g === 'slide') { const c = data.chunkMap.get(id)!; return { t: 'slide', module: c.module, slide: c.slide } }
        return { t: g, id } as Row
      })
      if (ids.length > limits[g]) rows.push({ t: 'more', g, left: ids.length - limits[g] })
      out.push({ g, rows, total: ids.length })
    }
    return out
  }, [found, limits, data])
  const flat = useMemo(() => groups.flatMap((g) => g.rows), [groups])
  useEffect(() => { actRef.current?.scrollIntoView({ block: 'nearest' }) }, [sel, flat])

  if (!open) return null

  const run = (r: Row) => {
    if (r.t === 'more') { setLimits((l) => ({ ...l, [r.g]: MAXR })); return }
    p.onClose()
    if (r.t === 'node') p.onNode(r.id)
    else if (r.t === 'slide') p.onSlide(r.module, r.slide)
    else if (r.t === 'q') p.onQuestion(r.id)
    else p.onCard(r.id)
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); p.onClose() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(flat.length - 1, s + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); const r = flat[sel]; if (r) run(r) }
  }

  let n = -1
  const renderRow = (r: Row) => {
    n++
    const i = n, on = i === sel
    const cls = 'pal-row' + (on ? ' on' : '')
    const common = { className: cls, onMouseMove: () => { if (sel !== i) setSel(i) }, onClick: () => run(r) }
    const ref = on ? actRef : undefined
    if (r.t === 'more') return <div key={'m' + r.g} ref={ref} {...common} className={cls + ' more'}>Show {r.left} more {TITLES[r.g].toLowerCase()}</div>
    if (r.t === 'node') {
      const nd = data.nodes.get(r.id)!
      return <div key={'n' + r.id} ref={ref} {...common} style={{ ['--c' as any]: data.moduleColor(nd.module) }}><b>{nd.label}</b><span className="pal-meta">{nd.module ?? 'core'}{nd.module && data.modules.find((m) => m.id === nd.module)?.week ? ` · W${data.modules.find((m) => m.id === nd.module)!.week}` : ''}</span><span className="pal-sn">{nd.summary}</span></div>
    }
    if (r.t === 'slide') {
      const c = data.chunkMap.get(`${r.module}-s${r.slide}`)!
      const notes = c.notes ?? ''
      const t = termsOf(dq)
      const inText = t.some((x) => c.text.toLowerCase().includes(x))
      const body = inText || !notes ? c.text : notes
      return <div key={`s${r.module}${r.slide}`} ref={ref} {...common} style={{ ['--c' as any]: data.moduleColor(r.module) }}><b>[{r.module} s{r.slide}] {c.title}</b>{!inText && notes && <span className="pal-meta">speaker notes</span>}<span className="pal-sn" dangerouslySetInnerHTML={{ __html: snippet(body, dq) }} /></div>
    }
    if (r.t === 'q' && qd) {
      const q = qd.questions.get(r.id)!
      const t = termsOf(dq)
      const has = (s?: string) => !!s && t.some((x) => s.toLowerCase().includes(x))
      const fields: [string, boolean][] = [[q.stem, false], [q.stemId ?? '', true], [q.options.join(' | '), false], [(q.optionsId ?? []).join(' | '), true]]
      const hit = fields.find(([s]) => has(s)) ?? fields[0]
      return <div key={'q' + r.id} ref={ref} {...common} style={{ ['--c' as any]: data.moduleColor(q.module) }}><b className="pal-line"><span className="tag" style={{ background: data.moduleColor(q.module) }}>{q.module}</span> <span className="tag ghost">{SRC(q)}</span>{hit[1] && <span className="tag ghost">ID</span>}</b><span className="pal-sn" dangerouslySetInnerHTML={{ __html: snippet(hit[0] || q.stem, dq, 170) }} /></div>
    }
    if (r.t === 'c' && qd) {
      const c = qd.cards.get(r.id)!
      const t = termsOf(dq)
      const inFront = t.some((x) => c.front.toLowerCase().includes(x))
      return <div key={'c' + r.id} ref={ref} {...common} style={{ ['--c' as any]: data.moduleColor(c.module) }}><b className="pal-line"><span className="tag" style={{ background: data.moduleColor(c.module) }}>{c.module}</span> <span className="tag ghost">{c.topic}</span></b><span className="pal-sn" dangerouslySetInnerHTML={{ __html: snippet(c.front, dq, 170) }} />{!inFront && <span className="pal-meta">match is on the back of the card</span>}</div>
    }
    return null
  }

  return (
    <div className="pal-back" onMouseDown={p.onClose}>
      <div className="pal" role="dialog" aria-label="Search" onMouseDown={(e) => e.stopPropagation()}>
        <div className="pal-in">
          <input ref={inp} value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={onKey} placeholder="Search concepts, slides, quiz questions (EN/ID) and flashcards" spellCheck={false} autoComplete="off" />
          {val && <button className="icon" onClick={() => { setVal(''); inp.current?.focus() }} title="Clear">&#10005;</button>}
        </div>
        <div className="pal-list">
          {!found && <p className="empty">Type at least 2 characters. Prefix and typo-tolerant, English and Indonesian.</p>}
          {found && !groups.length && <p className="empty">No matches for &ldquo;{dq}&rdquo;.</p>}
          {found && !qd && <p className="empty small">Quiz data not loaded: questions and cards are not searched.</p>}
          {groups.map((g) => (
            <div key={g.g} className="pal-group">
              <h6>{TITLES[g.g]} <small>{g.total >= MAXR ? `${MAXR}+` : g.total}</small></h6>
              {g.rows.map(renderRow)}
            </div>
          ))}
        </div>
        <div className="pal-foot"><span><kbd>&uarr;</kbd><kbd>&darr;</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span><span className="grow" />
          <span>Concept &rarr; map &middot; Slide &rarr; viewer &middot; Question &rarr; practice &middot; Card &rarr; Cards</span></div>
      </div>
    </div>
  )
}
