import { Fragment, useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import { BASE, slideKey, thumbUrl, type Data } from './data'
import { profColor, type Agg } from './quizlib'
import type { Source } from './types'
import { SlideImg } from './ui'

/** Inline markdown for stems/options: **bold**, *italic*, `code`. Everything else is literal text. */
export function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g)
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <strong key={i}>{p.slice(2, -2)}</strong>
        if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>
        if (p.startsWith('`') && p.endsWith('`') && p.length > 2) return <code key={i}>{p.slice(1, -1)}</code>
        return <Fragment key={i}>{p}</Fragment>
      })}
    </>
  )
}

const SUB = '₀₁₂₃₄₅₆₇₈₉', SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹'
const script = (s: string, map: string) => (/^\d+$/.test(s) ? [...s].map((d) => map[Number(d)]).join('') : null)

/** Turn the lecturer's LaTeX-ish calculation notes ("$1.35 \\times 4 = 5.4$") into readable plain text. */
export function cleanMath(src: string): string {
  let s = src
  for (let i = 0; i < 3; i++) s = s.replace(/\\(?:text|mathrm|mathbf|textbf|operatorname)\{([^{}]*)\}/g, '$1').replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
  s = s.replace(/\$\$?/g, '')
    .replace(/\\(times|cdot|div|approx|neq|leq?|geq?|pm|rightarrow|to)\b/g, (_m, k: string) => ({ times: '×', cdot: '·', div: '÷', approx: '≈', neq: '≠', le: '≤', leq: '≤', ge: '≥', geq: '≥', pm: '±', rightarrow: '→', to: '→' } as Record<string, string>)[k])
    .replace(/_\{([^{}]*)\}|_(\d+)/g, (m, a, b) => script(a ?? b, SUB) ?? m)
    .replace(/\^\{([^{}]*)\}|\^(\d+)/g, (m, a, b) => script(a ?? b, SUP) ?? m)
    .replace(/\\([%_&#])/g, '$1').replace(/\\[,;:! ]/g, ' ').replace(/\\([a-zA-Z]+)/g, '$1')
    .replace(/[{}]/g, '')
  return s.replace(/[ \t]+/g, ' ').trim()
}

export const MD = ({ text }: { text: string }) => <div className="md-q"><Markdown>{text}</Markdown></div>

export function Ring({ agg, size = 16 }: { agg?: Agg; size?: number }) {
  const tested = !!agg && agg.tested > 0
  const p = tested ? agg!.p : 0
  return <span className="pring" style={{ ['--pp' as any]: p, ['--pc' as any]: profColor(p, tested), width: size, height: size }} />
}

export const pct = (a?: Agg) => (a && a.tested > 0 ? `${a.p}%` : '–')

export function Bar({ agg, color }: { agg?: Agg; color?: string }) {
  const tested = !!agg && agg.tested > 0
  return (
    <div className="pbar" title={agg ? `${agg.tested}/${agg.total} items tested` : ''}>
      <div style={{ width: `${tested ? Math.max(2, agg!.p) : 0}%`, background: color ?? profColor(agg?.p, tested) }} />
    </div>
  )
}

export function SourceThumbs({ data, sources, onSlide }: { data: Data; sources?: Source[]; onSlide: (m: string, s: number) => void }) {
  if (!sources?.length) return null
  return (
    <div className="qsrc">
      {sources.map((s) => (
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
    </div>
  )
}

export function ConceptChips({ data, ids, onFly }: { data: Data; ids: string[]; onFly: (id: string) => void }) {
  const ok = ids.filter((i) => data.nodes.has(i))
  if (!ok.length) return null
  return (
    <div className="qchips">
      <span className="lab">Show on map</span>
      {ok.map((id) => {
        const n = data.nodes.get(id)!
        return <button key={id} className="chip" style={{ ['--c' as any]: data.moduleColor(n.module) }} onClick={() => onFly(id)} title={n.summary}>&#8599; {n.label}</button>
      })}
    </div>
  )
}

/** Prevents the button from taking focus on mouse click so global keyboard shortcuts (Enter/Space) never double-fire. */
export const noFocus = { onMouseDown: (e: React.MouseEvent) => e.preventDefault() }

/** Question figure (prediction paper): click to zoom in a simple modal; Esc or click outside closes. */
export function ZoomImg({ src, alt, small }: { src: string; alt: string; small?: boolean }) {
  const [open, setOpen] = useState(false)
  const url = BASE + src
  useEffect(() => {
    if (!open) return
    // capture + stopPropagation so quiz shortcuts (1-9 / Enter) and the lightbox never see keys while zoomed
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); e.preventDefault(); e.stopPropagation() }
    window.addEventListener('keydown', h, true)
    return () => window.removeEventListener('keydown', h, true)
  }, [open])
  return (
    <>
      <button type="button" className={'qimg' + (small ? ' small' : '')} title="Click to zoom"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true) }} {...noFocus}>
        <img src={url} alt={alt} loading="lazy" />
      </button>
      {open && (
        <div className="lb qzoom" role="dialog" aria-label={alt} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false) }}>
          <button type="button" className="icon qzoom-x" title="Close (Esc)" onClick={() => setOpen(false)}>&#10005;</button>
          <img src={url} alt={alt} />
        </div>
      )}
    </>
  )
}

/** Clickable numbered dots (one per question / card). cls(i) gives the colour class; dots beyond `max` are disabled. */
export function Strip({ n, cls, cur, max, onJump, noun }: { n: number; cls: (i: number) => string; cur: number; max: number; onJump: (i: number) => void; noun: string }) {
  return (
    <div className="qstrip" role="group" aria-label={`Jump to ${noun}`}>
      {Array.from({ length: n }, (_, i) => (
        <button key={i} type="button" className={'dot ' + cls(i) + (i === cur ? ' cur' : '')} disabled={i > max} aria-current={i === cur} aria-label={`${noun} ${i + 1}`} title={`${noun} ${i + 1}`} onClick={() => onJump(i)} {...noFocus}>{i + 1}</button>
      ))}
    </div>
  )
}

export function KeyHints({ items }: { items: [string, string][] }) {
  return <div className="kbhint">{items.map(([k, l]) => <span key={l}><kbd>{k}</kbd> {l}</span>)}</div>
}
