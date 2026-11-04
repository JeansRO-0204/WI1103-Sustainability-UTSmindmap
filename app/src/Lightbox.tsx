import { useEffect } from 'react'
import { imageUrl, originalUrl, pdfUrl, slideKey, type Data } from './data'
import { SlideImg } from './ui'

interface Props { data: Data; module: string; slide: number; onSlide: (s: number) => void; onClose: () => void; onNode: (id: string) => void }

export default function Lightbox({ data, module, slide, onSlide, onClose, onNode }: Props) {
  const deck = data.decks.get(module) ?? []
  const idx = deck.findIndex((c) => c.slide === slide)
  const c = data.chunkMap.get(slideKey(module, slide))
  const go = (d: number) => { const n = deck[idx + d]; if (n) onSlide(n.slide) }
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { go(-1); e.preventDefault() } else if (e.key === 'ArrowRight') { go(1); e.preventDefault() } else if (e.key === 'Escape') { onClose(); e.preventDefault() } else return
      e.stopPropagation()
    }
    window.addEventListener('keydown', h, true)
    return () => window.removeEventListener('keydown', h, true)
  })
  const mod = data.modules.find((m) => m.id === module)
  const nodes = data.slideNodes.get(slideKey(module, slide)) ?? []
  return (
    <div className="lb" onClick={onClose}>
      <div className="lb-card" onClick={(e) => e.stopPropagation()}>
        <div className="lb-head">
          <b style={{ color: data.moduleColor(module) }}>{module}</b>
          <span className="lb-title">{c?.title || `Slide ${slide}`}</span>
          <span className="lb-pos">{slide} / {deck.length || '?'}</span>
          {import.meta.env.DEV && <a href={pdfUrl(module, slide)} target="_blank" rel="noreferrer">Open PDF page</a>}
          {import.meta.env.DEV && mod?.file && <a href={originalUrl(mod)} target="_blank" rel="noreferrer">Original file</a>}
          <button className="icon" onClick={onClose} title="Close (Esc)">&#10005;</button>
        </div>
        <div className="lb-main">
          <button className="nav" disabled={idx <= 0} onClick={() => go(-1)} title="Previous (Left arrow)">&#8249;</button>
          <div className="lb-img"><SlideImg src={imageUrl(c)} label={`Slide image not available (${module} s${slide})`} /></div>
          <button className="nav" disabled={idx < 0 || idx >= deck.length - 1} onClick={() => go(1)} title="Next (Right arrow)">&#8250;</button>
        </div>
        <div className="lb-text">
          {c ? (
            <>
              <pre>{c.text}</pre>
              {c.notes && <><h5>Speaker notes</h5><pre>{c.notes}</pre></>}
            </>
          ) : <em>No text for this slide.</em>}
          {nodes.length > 0 && (
            <div className="lb-nodes"><b>Concepts citing this slide:</b>{' '}
              {nodes.map((id) => <button key={id} className="chip" style={{ ['--c' as any]: data.moduleColor(data.nodes.get(id)!.module) }} onClick={() => onNode(id)}>{data.nodes.get(id)!.label}</button>)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
