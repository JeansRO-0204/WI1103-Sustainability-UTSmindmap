import Markdown from 'react-markdown'
import { aiContext, copyText, outline, plainText } from './copy'
import { ancestors, thumbUrl, slideKey, type Data } from './data'
import { SlideImg } from './ui'
import { profColor, type Agg } from './quizlib'
import { Ring } from './quizui'

interface Props {
  data: Data
  id: string
  reviewed: boolean
  onSelect: (id: string) => void
  onSlide: (module: string, slide: number) => void
  onReview: () => void
  onClose: () => void
  toast: (m: string) => void
  quiz?: { agg?: Agg; onPractice: (kind: 'quiz' | 'cards') => void }
}

export default function Detail({ data, id, reviewed, onSelect, onSlide, onReview, onClose, toast, quiz }: Props) {
  const n = data.nodes.get(id)
  if (!n) return null
  const color = data.moduleColor(n.module)
  const path = [...ancestors(data, id), id]
  const copy = async (what: string, text: string) => toast((await copyText(text)) ? `Copied ${what}` : 'Copy failed')
  const kids = data.children.get(id) ?? []
  const links = data.edgesOf.get(id) ?? []
  const chip = (nid: string, extra?: string, key?: string) => {
    const m = data.nodes.get(nid)!
    return (
      <button key={key ?? nid} className="chip" style={{ ['--c' as any]: data.moduleColor(m.module) }} onClick={() => onSelect(nid)} title={m.summary}>
        {extra && <em>{extra}</em>}{m.label}
      </button>
    )
  }
  return (
    <aside className="detail" style={{ ['--c' as any]: color }}>
      <div className="detail-top">
        <div className="tags">
          <span className="tag" style={{ background: color }}>{n.module ?? 'core'}</span>
          <span className="tag ghost">{n.type}</span>
          <span className="tag ghost" title="Importance">{'●'.repeat(n.importance)}{'○'.repeat(3 - n.importance)}{n.importance === 3 ? ' likely exam' : ''}</span>
        </div>
        <button className="icon" onClick={onClose} title="Close (Esc)">&#10005;</button>
      </div>
      <nav className="crumbs">
        {path.map((p, i) => (
          <span key={p}>
            {i > 0 && <span className="sep">/</span>}
            {p === id ? <b>{data.nodes.get(p)!.label}</b> : <a onClick={() => onSelect(p)}>{data.nodes.get(p)!.label}</a>}
          </span>
        ))}
      </nav>
      <h2>{n.label}</h2>
      <p className="lead">{n.summary}</p>
      <div className="btns">
        <button onClick={() => copy('text', plainText(data, id))}>Copy text</button>
        <button onClick={() => copy('AI context', aiContext(data, id))} title="Node + neighbours + slide text, ready to paste into any AI chat">Copy AI context</button>
        <button onClick={() => copy('branch outline', outline(data, id))}>Copy branch outline</button>
        <button className={reviewed ? 'on' : ''} onClick={onReview}>{reviewed ? '✓ Reviewed' : 'Mark reviewed'}</button>
      </div>
      {quiz && (
        <section className="qprof">
          {quiz.agg ? (
            <>
              <Ring agg={quiz.agg} size={30} />
              <div className="qp-text">
                <b style={{ color: profColor(quiz.agg.p, quiz.agg.tested > 0) }}>{quiz.agg.tested > 0 ? `${quiz.agg.p}%` : 'Not practiced yet'}</b> quiz proficiency
                <span className="muted small"> &middot; {quiz.agg.tested}/{quiz.agg.total} items practiced &middot; {quiz.agg.attempts} attempts</span>
              </div>
              <button onClick={() => quiz.onPractice('quiz')}>Practice this concept</button>
              <button onClick={() => quiz.onPractice('cards')}>Flashcards</button>
            </>
          ) : <span className="muted small">No quiz items are linked to this concept yet.</span>}
        </section>
      )}
      {n.details && <div className="md"><Markdown>{n.details}</Markdown></div>}
      {!!n.keyTerms?.length && (
        <section><h4>Key terms</h4><div className="terms">{n.keyTerms.map((t) => <span key={t} className="term">{t}</span>)}</div></section>
      )}
      {n.examTips && <section className="tip"><h4>Exam tip</h4><p>{n.examTips}</p></section>}
      {!!n.sources?.length && (
        <section>
          <h4>Source slides</h4>
          {n.sources.map((s) => (
            <div key={s.module} className="srcgroup">
              <div className="srcname">{s.module} &middot; slide{s.slides.length > 1 ? 's' : ''} {s.slides.join(', ')}</div>
              <div className="thumbs">
                {s.slides.map((sl) => (
                  <button key={sl} className="thumb" onClick={() => onSlide(s.module, sl)} title={data.chunkMap.get(slideKey(s.module, sl))?.title}>
                    <SlideImg src={thumbUrl(data.chunkMap.get(slideKey(s.module, sl)))} label={`s${sl}`} />
                    <span>{sl}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
      {(n.parent || kids.length > 0 || links.length > 0) && (
        <section>
          <h4>Connected concepts</h4>
          <div className="chips">
            {n.parent && data.nodes.has(n.parent) && chip(n.parent, 'parent')}
            {kids.map((k) => chip(k, 'child'))}
            {links.map(({ edge, other }, i) => chip(other, edge.type, `${other}-${i}`))}
          </div>
          {links.filter((l) => l.edge.label).map(({ edge, other }, i) => (
            <p key={i} className="linknote"><b>{data.nodes.get(other)!.label}</b>: {edge.label}</p>
          ))}
        </section>
      )}
    </aside>
  )
}
