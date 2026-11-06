import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Panel, ReactFlowProvider, useReactFlow } from '@xyflow/react'
import Canvas from './Canvas'
import Detail from './Detail'
import Lightbox from './Lightbox'
import Sidecar, { type Hits } from './Sidecar'
import Palette, { SearchBtn } from './Palette'
import { snippet } from './search'
import Study, { ModeSeg, type View } from './Study'
import type { Launch, StudyCtx } from './Setup'
import { EMPTY_STATE, computeStats, loadQuiz, mergeQuiz, recordAttempt, setItemState, type ItemState, type Agg, type QuizData, type QuizState, type Scope } from './quizlib'
import { ancestors, descendants, loadData, type Data } from './data'
import { CARD_H, CARD_W, computeLayout, visibleIds, type Pos } from './layout'
import { ActionsCtx, useLocalState } from './ui'
import type { LayoutMode } from './types'

const NO_PROF = new Map<string, Agg>()

export default function App() {
  const [data, setData] = useState<Data | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => { loadData().then(setData).catch((e) => setErr(String(e))) }, [])
  if (err) return <div className="boot err">Failed to load data: {err}</div>
  if (!data) return <div className="boot">Loading knowledge graph&hellip;</div>
  return <ReactFlowProvider><Main data={data} /></ReactFlowProvider>
}

function Main({ data }: { data: Data }) {
  const rf = useReactFlow()
  const defaultExpanded = useMemo(() => new Set([data.rootId, ...(data.children.get(data.rootId) ?? [])]), [data])
  const [expArr, setExpArr] = useLocalState<string[] | null>('mm.expanded', null)
  const expanded = useMemo(() => new Set((expArr ?? [...defaultExpanded]).filter((i) => data.nodes.has(i))), [expArr, defaultExpanded, data])
  const setExpanded = useCallback((f: (p: Set<string>) => Set<string>) => setExpArr((p) => [...f(new Set(p ?? [...defaultExpanded]))]), [setExpArr, defaultExpanded])

  const [revArr, setRevArr] = useLocalState<string[]>('mm.reviewed', [])
  const reviewed = useMemo(() => new Set(revArr), [revArr])
  const [prefs, setPrefs] = useLocalState('mm.prefs', { mode: 'radial' as LayoutMode, links: true, cram: false, side: typeof window === 'undefined' || window.innerWidth >= 1000 })
  const [ovr, setOvr] = useLocalState<Record<LayoutMode, Record<string, Pos>>>('mm.pos', { radial: {}, lr: {} })
  const { mode, cram } = prefs
  const overrides = useMemo(() => ovr[mode] ?? {}, [ovr, mode])

  // quiz / flashcards / proficiency
  const [qd, setQd] = useState<QuizData | null>(null)
  useEffect(() => { loadQuiz(data).then(setQd) }, [data])
  const [qraw, setQraw] = useLocalState<QuizState>('mm.quiz', EMPTY_STATE)
  const qstate = useMemo<QuizState>(() => (qraw && typeof qraw === 'object' && qraw.items && typeof qraw.items === 'object' ? qraw : EMPTY_STATE), [qraw])
  const stats = useMemo(() => (qd ? computeStats(qd, qstate) : null), [qd, qstate])
  const [view, setView] = useState<View>('map')
  const [launch, setLaunch] = useState<Launch | null>(null)
  const launchN = useRef(0)
  const record = useCallback((id: string, score: number, up: number, now?: number) => setQraw((p) => recordAttempt(p?.items ? p : EMPTY_STATE, id, score, up, now)), [setQraw])
  const restore = useCallback((id: string, st: ItemState | undefined) => setQraw((p) => setItemState(p?.items ? p : EMPTY_STATE, id, st)), [setQraw])
  const startIds = useCallback((kind: 'quiz' | 'cards', ids: string[], label: string) => { setLaunch({ id: ++launchN.current, kind, scope: { kind: 'all' }, ids, label }); setView(kind) }, [])
  const startPractice = useCallback((kind: 'quiz' | 'cards', scope: Scope) => { setLaunch({ id: ++launchN.current, kind, scope }); setView(kind) }, [])
  const mergeProgress = useCallback((rev: string[], quiz: QuizState) => {
    const m = mergeQuiz(qstate, quiz)
    const newReviewed = rev.filter((i) => !reviewed.has(i)).length
    setRevArr((p) => [...new Set([...p, ...rev])])
    setQraw(m.state)
    return { newReviewed, newAttempts: m.newAttempts, itemsTouched: m.itemsTouched }
  }, [qstate, reviewed, setRevArr, setQraw])

  const [selected, setSelected] = useState<string | null>(null)
  const [focus, setFocus] = useState<{ id: string; n: number; zoom?: number } | null>(null)
  const [fitReq, setFitReq] = useState(1)
  const [lb, setLb] = useState<{ module: string; slide: number } | null>(null)
  const [query, setQueryRaw] = useState('')
  const [matchIdx, setMatchIdx] = useState(-1)
  const setQuery = useCallback((s: string) => { setQueryRaw(s); setMatchIdx(-1) }, [])
  const [palOpen, setPalOpen] = useState(false)
  const palQuery = useRef('')
  const [msg, setMsg] = useState('')
  const [help, setHelp] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const focusN = useRef(0)
  const toastT = useRef<number>(0)
  const toast = useCallback((m: string) => { setMsg(m); clearTimeout(toastT.current); toastT.current = window.setTimeout(() => setMsg(''), 1600) }, [])

  const vis = useMemo(() => visibleIds(data, expanded, cram), [data, expanded, cram])
  const visSet = useMemo(() => new Set(vis), [vis])

  // search
  const q = query.trim()
  const hits: Hits | null = useMemo(() => {
    if (q.length < 2) return null
    const nodes = data.nodeSearch.search(q).map((r) => String(r.id))
    const slides = data.slideSearch.search(q).slice(0, 30).map((r) => {
      const c = data.chunkMap.get(String(r.id))!
      return { module: c.module, slide: c.slide, title: c.title, snippet: snippet(c.text + ' ' + (c.notes ?? ''), q) }
    })
    const ids = [...nodes]
    const seen = new Set(nodes)
    for (const sl of data.slideSearch.search(q)) {
      const c = data.chunkMap.get(String(sl.id))!
      for (const id of data.slideNodes.get(`${c.module}-s${c.slide}`) ?? []) if (!seen.has(id)) { seen.add(id); ids.push(id) }
    }
    return { nodes, slides, ids }
  }, [q, data])
  const highlight = useMemo(() => {
    if (!hits) return null
    const s = new Set<string>()
    for (const id of hits.nodes) { s.add(id); ancestors(data, id).forEach((a) => s.add(a)) }
    for (const sl of hits.slides) for (const id of data.slideNodes.get(`${sl.module}-s${sl.slide}`) ?? []) { s.add(id); ancestors(data, id).forEach((a) => s.add(a)) }
    return s
  }, [hits, data])

  const reveal = useCallback((id: string, zoom?: number) => {
    if (!data.nodes.has(id)) return
    setExpanded((p) => { const s = new Set(p); ancestors(data, id).forEach((a) => s.add(a)); return s })
    if (prefs.cram && !data.keep3.has(id)) setPrefs((p) => ({ ...p, cram: false }))
    setSelected(id)
    setView('map')
    setFocus({ id, n: ++focusN.current, zoom })
  }, [data, setExpanded, prefs.cram, setPrefs])

  const toggle = useCallback((id: string) => setExpanded((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s }), [setExpanded])
  const activate = useCallback((id: string) => { setSelected(id); if ((data.children.get(id) ?? []).length) toggle(id) }, [data, toggle])
  const review = useCallback((id: string) => setRevArr((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])), [setRevArr])
  const actions = useMemo(() => ({ activate, toggle, review }), [activate, toggle, review])

  const expandBranch = useCallback((id: string | null) => {
    setExpanded((p) => { const s = new Set(p); const r = id ?? data.rootId; s.add(r); descendants(data, r).forEach((d) => { if ((data.children.get(d) ?? []).length) s.add(d) }); return s })
  }, [data, setExpanded])
  const collapseAll = () => { setExpArr(null); setFitReq((n) => n + 1) }
  const resetLayout = () => { setOvr((p) => ({ ...p, [mode]: {} })); setFitReq((n) => n + 1) }
  const setMode = (m: LayoutMode) => { setPrefs((p) => ({ ...p, mode: m })); setFitReq((n) => n + 1) }

  const flyTo = useCallback((id: string) => { reveal(id, 1) }, [reveal])
  /** sidebar search: step through every matching node (direct concept hits first, then concepts citing matching slides) */
  const step = useCallback((dir: 1 | -1) => {
    if (!hits) return
    if (!hits.ids.length) { const s0 = hits.slides[0]; if (s0) setLb({ module: s0.module, slide: s0.slide }); return }
    const n = hits.ids.length
    const i = matchIdx < 0 ? (dir > 0 ? 0 : n - 1) : (matchIdx + dir + n) % n
    setMatchIdx(i)
    flyTo(hits.ids[i])
  }, [hits, matchIdx, flyTo])
  const openPal = useCallback(() => setPalOpen(true), [])

  // keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); if (!lb) setPalOpen((o) => !o); return }
      if (lb || palOpen) return
      if (e.key === '/' && !typing) { e.preventDefault(); setPrefs((p) => ({ ...p, side: true })); setTimeout(() => inputRef.current?.focus(), 0); return }
      if (view !== 'map') return // study panes own the keyboard
      if (e.key === 'Escape') { if (typing) return; if (help) setHelp(false); else setSelected(null); return }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      const sel = selected && visSet.has(selected) ? selected : null
      const kids = sel ? (data.children.get(sel) ?? []).filter((c) => visSet.has(c)) : []
      const go = (id: string | undefined) => { if (!id) return; setSelected(id); const ps = computeLayout(data, vis, mode).get(id); const o = overrides[id] ?? ps; if (o) rf.setCenter(o.x + CARD_W / 2, o.y + CARD_H / 2, { zoom: rf.getZoom(), duration: 350 }) }
      switch (e.key) {
        case 'f': case 'F': setFitReq((n) => n + 1); break
        case ' ': if (sel) { e.preventDefault(); toggle(sel) } break
        case 'e': case 'E': expandBranch(sel); break
        case 'r': case 'R': if (sel) review(sel); break
        case '?': setHelp((h) => !h); break
        case 'ArrowLeft': e.preventDefault(); if (!sel) go(data.rootId); else go(data.nodes.get(sel)?.parent ?? undefined); break
        case 'ArrowRight':
          e.preventDefault()
          if (!sel) go(data.rootId)
          else if (kids.length) go(kids[0])
          else if ((data.children.get(sel) ?? []).length) toggle(sel)
          break
        case 'ArrowUp': case 'ArrowDown': {
          e.preventDefault()
          if (!sel) { go(data.rootId); break }
          const par = data.nodes.get(sel)?.parent
          if (!par) break
          const sib = (data.children.get(par) ?? []).filter((c) => visSet.has(c))
          go(sib[sib.indexOf(sel) + (e.key === 'ArrowDown' ? 1 : -1)])
          break
        }
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [lb, palOpen, view, selected, visSet, data, vis, mode, overrides, rf, toggle, expandBranch, review, help, setPrefs])

  const ctx = useMemo<StudyCtx | null>(() => (qd && stats ? { data, qd, state: qstate, stats, record, restore, onFly: flyTo, onSlide: (module, slide) => setLb({ module, slide }), start: startPractice, paused: !!lb || palOpen } : null), [data, qd, stats, qstate, record, restore, flyTo, startPractice, lb, palOpen])
  const openSlide = useCallback((module: string, slide: number) => setLb({ module, slide }), [])
  const onDragStop = useCallback((id: string, p: Pos) => setOvr((o) => ({ ...o, [mode]: { ...o[mode], [id]: { x: Math.round(p.x), y: Math.round(p.y) } } })), [mode, setOvr])

  return (
    <ActionsCtx.Provider value={actions}>
      <div className={'app' + (prefs.side ? '' : ' no-side') + (selected && view === 'map' ? ' has-detail' : '') + (highlight ? ' searching' : '')}>
        {prefs.side && (
          <Sidecar
            data={data} reviewed={reviewed} stats={stats} query={query} setQuery={setQuery} inputRef={inputRef} hits={hits} matchIdx={matchIdx} onStep={step}
            onFly={flyTo} onSlide={openSlide}
          />
        )}
        <main className="stage">
          <Canvas
            data={data} vis={vis} expanded={expanded} selectedId={selected} reviewed={reviewed} highlight={highlight} nodeProf={stats?.node ?? NO_PROF}
            mode={mode} showLinks={prefs.links} overrides={overrides} focus={focus} fitReq={fitReq}
            onDragStop={onDragStop} onBackgroundClick={() => { /* keep selection */ }}
          >
            <Panel position="top-left" className="toolbar">
              <ModeSeg view={view} setView={setView} />
              <SearchBtn onClick={openPal} />
              <button className="tb" onClick={() => setPrefs((p) => ({ ...p, side: !p.side }))} title="Toggle materials sidebar">{prefs.side ? '◀ Materials' : '▶ Materials'}</button>
              <div className="seg">
                <button className={mode === 'radial' ? 'on' : ''} onClick={() => setMode('radial')}>Radial</button>
                <button className={mode === 'lr' ? 'on' : ''} onClick={() => setMode('lr')}>Tree &rarr;</button>
              </div>
              <button className={'tb' + (prefs.links ? ' on' : '')} onClick={() => setPrefs((p) => ({ ...p, links: !p.links }))}>Connections</button>
              <button className={'tb' + (cram ? ' on' : '')} onClick={() => { setPrefs((p) => ({ ...p, cram: !p.cram })); setFitReq((n) => n + 1) }} title="Show only importance 3 branches">Cram (&#9679;&#9679;&#9679;)</button>
              <button className="tb" onClick={() => { expandBranch(null); setFitReq((n) => n + 1) }}>Expand all</button>
              <button className="tb" onClick={collapseAll}>Collapse</button>
              <button className="tb" onClick={() => setFitReq((n) => n + 1)} title="F">Fit</button>
              <button className="tb" onClick={resetLayout} title="Forget dragged positions">Reset layout</button>
              <button className="tb" onClick={() => setHelp((h) => !h)} title="?">?</button>
            </Panel>
          </Canvas>
          <Study ctx={ctx} view={view} setView={setView} launch={launch} onSearch={openPal} reviewed={revArr} mergeProgress={mergeProgress} />
          {help && (
            <div className="help" onClick={() => setHelp(false)}>
              <h4>Keyboard</h4>
              <dl>
                <dt>/</dt><dd>search sidebar</dd><dt>&#8984;/Ctrl K</dt><dd>search everything</dd><dt>Esc</dt><dd>close panel</dd><dt>&uarr; &darr;</dt><dd>previous / next sibling</dd>
                <dt>&larr;</dt><dd>parent</dd><dt>&rarr;</dt><dd>first child (expands)</dd><dt>Space</dt><dd>expand / collapse</dd>
                <dt>E</dt><dd>expand whole branch</dd><dt>F</dt><dd>fit view</dd><dt>R</dt><dd>toggle reviewed</dd><dt>Lightbox</dt><dd>&larr; &rarr; slides, Esc</dd>
              </dl>
              <p>Drag a card by its top strip. Text on cards is selectable.</p>
            </div>
          )}
          {msg && <div className="toast">{msg}</div>}
        </main>
        {selected && view === 'map' && data.nodes.has(selected) && (
          <Detail
            data={data} id={selected} reviewed={reviewed.has(selected)} onSelect={(id) => reveal(id)} onSlide={openSlide}
            quiz={stats ? { agg: stats.node.get(selected), onPractice: (kind) => startPractice(kind, { kind: 'node', id: selected }) } : undefined}
            onReview={() => review(selected)} onClose={() => setSelected(null)} toast={toast}
          />
        )}
        <Palette
          open={palOpen} onClose={() => setPalOpen(false)} data={data} qd={qd} initial={palQuery.current} onQuery={(v) => { palQuery.current = v }}
          onNode={flyTo} onSlide={openSlide}
          onQuestion={(id) => startIds('quiz', [id], 'Search result')} onCard={(id) => startIds('cards', [id], 'Search result')}
        />
        {lb && <Lightbox data={data} module={lb.module} slide={lb.slide} onSlide={(s) => setLb({ module: lb.module, slide: s })} onClose={() => setLb(null)} onNode={(id) => { setLb(null); reveal(id) }} />}
      </div>
    </ActionsCtx.Provider>
  )
}
