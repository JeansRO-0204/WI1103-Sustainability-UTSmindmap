import { useState } from 'react'
import { descendants, originalUrl, pdfUrl, thumbUrl, type Data } from './data'
import { SlideImg } from './ui'
import { matchesAll } from './search'
import { profColor, type Stats } from './quizlib'

export interface Hits { ids: string[]; nodes: string[]; slides: { module: string; slide: number; title: string; snippet: string }[] }

interface Props {
  data: Data
  reviewed: Set<string>
  stats: Stats | null
  query: string
  setQuery: (q: string) => void
  inputRef: React.RefObject<HTMLInputElement | null>
  hits: Hits | null
  onFly: (id: string) => void
  onSlide: (m: string, s: number) => void
  matchIdx: number
  onStep: (dir: 1 | -1) => void
}

export default function Sidecar({ data, reviewed, stats, query, setQuery, inputRef, hits, onFly, onSlide, matchIdx, onStep }: Props) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [filt, setFilt] = useState<Record<string, string>>({})
  const toggleMod = (id: string) => setOpen((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const total = data.graph.nodes.length, done = [...reviewed].filter((i) => data.nodes.has(i)).length
  return (
    <aside className="side">
      <div className="brand">
        <h1>WI1103 Sustainability</h1>
        <div className="prog"><div style={{ width: `${(done / total) * 100}%` }} /></div>
        <small>{done} / {total} concepts reviewed{data.sample && <span className="sample"> &middot; SAMPLE DATA</span>}</small>
        {stats && stats.overall.total > 0 && <small className="qready"><br />Quiz readiness <b style={{ color: profColor(stats.overall.p, stats.overall.tested > 0) }}>{stats.overall.tested > 0 ? `${stats.overall.p}%` : '–'}</b> &middot; {stats.overall.tested}/{stats.overall.total} items practiced</small>}
      </div>
      <div className="search">
        <input
          ref={inputRef} value={query} placeholder="Search concepts and slide text  ( / )"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setQuery(''); (e.target as HTMLInputElement).blur() } else if (e.key === 'Enter') { e.preventDefault(); onStep(e.shiftKey ? -1 : 1) } }}
        />
        {query && <button className="icon" onClick={() => setQuery('')} title="Clear (Esc)">&#10005;</button>}
      </div>
      {hits && (
        <div className="matchbar">
          <span className="mcount">{hits.ids.length ? `${matchIdx >= 0 ? matchIdx + 1 : '–'} / ${hits.ids.length} on map` : 'No concept on map'}</span>
          <button className="tb" disabled={!hits.ids.length} onClick={() => onStep(-1)} title="Previous match (Shift+Enter)">&#8249; Prev</button>
          <button className="tb" disabled={!hits.ids.length} onClick={() => onStep(1)} title="Next match (Enter)">Next &#8250;</button>
          <button className="tb" onClick={() => setQuery('')} title="Clear search (Esc)">Clear</button>
        </div>
      )}
      <div className="side-scroll">
        {hits ? (
          <div className="results">
            <h6>Concepts ({hits.nodes.length})</h6>
            {hits.nodes.slice(0, 12).map((id) => {
              const n = data.nodes.get(id)!
              return (
                <button key={id} className="hit-row" style={{ ['--c' as any]: data.moduleColor(n.module) }} onClick={() => onFly(id)}>
                  <b>{n.label}</b><span>{n.module ?? 'core'} &middot; {n.summary}</span>
                </button>
              )
            })}
            <h6>Slides ({hits.slides.length})</h6>
            {hits.slides.slice(0, 14).map((s) => (
              <button key={s.module + s.slide} className="hit-row" style={{ ['--c' as any]: data.moduleColor(s.module) }} onClick={() => onSlide(s.module, s.slide)}>
                <b>[{s.module} s{s.slide}] {s.title}</b><span dangerouslySetInnerHTML={{ __html: s.snippet }} />
              </button>
            ))}
            {!hits.nodes.length && !hits.slides.length && <p className="empty">No matches.</p>}
          </div>
        ) : (
          <>
          <div className="modbar">
            <button onClick={() => setOpen(new Set(data.modules.map((m) => m.id)))}>Expand all</button>
            <button onClick={() => setOpen(new Set())}>Collapse all</button>
          </div>
          {data.modules.map((m) => {
            const ids = data.graph.nodes.filter((n) => n.module === m.id).map((n) => n.id)
            const r = ids.filter((i) => reviewed.has(i)).length
            const deck = data.decks.get(m.id) ?? []
            const isOpen = open.has(m.id)
            const modNode = data.nodes.get(m.id.toLowerCase()) ?? data.nodes.get(m.id.toLowerCase() + '.themes')
            const allTopics = modNode ? descendants(data, modNode.id).filter((i) => (data.depth.get(i) ?? 9) <= (data.depth.get(modNode.id) ?? 0) + 2) : []
            const fq = (filt[m.id] ?? '').trim()
            const topics = fq ? allTopics.filter((i) => { const n = data.nodes.get(i)!; return matchesAll(`${n.label} ${n.summary} ${(n.keyTerms ?? []).join(' ')}`, fq) }) : allTopics
            const slides = fq ? deck.filter((c) => matchesAll(`${c.title} ${c.text} ${c.notes ?? ''}`, fq)) : deck
            const color = data.moduleColor(m.id)
            const qa = stats?.week.get(m.id)
            return (
              <div key={m.id} className={'mod' + (isOpen ? ' open' : '')} style={{ ['--c' as any]: color }}>
                <button className="mod-head" onClick={() => toggleMod(m.id)}>
                  <span className="dot" />
                  <span className="mt"><b>{m.id}</b>{m.week ? ` · W${m.week}` : ''}<br /><span>{m.title}</span></span>
                  <span className="cnt">{ids.length ? `${r}/${ids.length}` : ''}
                    {qa && <b className="qp" style={{ color: profColor(qa.p, qa.tested > 0) }} title={`Quiz proficiency: ${qa.tested}/${qa.total} items practiced`}>Q {qa.tested > 0 ? `${qa.p}%` : '–'}</b>}
                  </span>
                </button>
                <div className="prog thin"><div style={{ width: ids.length ? `${(r / ids.length) * 100}%` : 0 }} /></div>
                {isOpen && (
                  <div className="mod-body">
                    <div className="links">
                      {(m.slideCount ?? 0) > 0 && <a href={pdfUrl(m.id)} target="_blank" rel="noreferrer">Open PDF</a>}
                      {m.file && <a href={originalUrl(m)} target="_blank" rel="noreferrer">Original file</a>}
                      <button onClick={() => modNode && onFly(modNode.id)}>Show on map</button>
                    </div>
                    <div className="modfilter">
                      <input value={filt[m.id] ?? ''} placeholder={`Filter ${m.id} topics and slides`} onChange={(e) => setFilt((f) => ({ ...f, [m.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setFilt((f) => ({ ...f, [m.id]: '' })) } }} />
                      {fq && <button className="icon" onClick={() => setFilt((f) => ({ ...f, [m.id]: '' }))} title="Clear filter">&#10005;</button>}
                      {fq && <small>{topics.length}/{allTopics.length} topics &middot; {slides.length}/{deck.length} slides</small>}
                    </div>
                    <div className="strip">
                      {fq && !slides.length && <small className="muted">No matching slides.</small>}
                      {slides.map((c) => (
                        <button key={c.slide} className="thumb" onClick={() => onSlide(m.id, c.slide)} title={c.title}>
                          <SlideImg src={thumbUrl(c)} label={String(c.slide)} /><span>{c.slide}</span>
                        </button>
                      ))}
                    </div>
                    {fq && !topics.length && <small className="muted">No matching topics.</small>}
                    <ul className="topics">
                      {topics.map((i) => {
                        const n = data.nodes.get(i)!
                        const lvl = (data.depth.get(i) ?? 0) - (data.depth.get(modNode!.id) ?? 0)
                        return (
                          <li key={i} style={{ paddingLeft: 6 + (lvl - 1) * 14 }} className={reviewed.has(i) ? 'done' : ''}>
                            <button onClick={() => onFly(i)}>{reviewed.has(i) ? '✓ ' : ''}{n.label}</button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
          </>
        )}
      </div>
      <div className="gh-foot">
        <a className="gh-link" href="https://github.com/JeansRO-0204/WI1103-Sustainability-UTSmindmap" target="_blank" rel="noreferrer">&#9733; GitHub repository</a>
        <details>
          <summary>Clone &amp; query with AI</summary>
          <p>Works offline with any AI tool, no API key.</p>
          <pre>{`git clone https://github.com/JeansRO-0204/WI1103-Sustainability-UTSmindmap.git
cd WI1103-Sustainability-UTSmindmap`}</pre>
          <p><b>Agent tools</b> (Claude Code, Codex, Gemini CLI, Cursor): open the folder and ask. They read <code>AGENTS.md</code>.</p>
          <p><b>Any chat:</b></p>
          <pre>{`python3 tools/query.py "your question" --prompt | pbcopy`}</pre>
          <p>then paste it into any model (use <code>clip</code> on Windows, <code>xclip</code> on Linux).</p>
          <p><b>MCP:</b> <code>.mcp.json</code> registers the search tools.</p>
        </details>
      </div>
    </aside>
  )
}
