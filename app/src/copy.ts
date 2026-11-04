import type { Data } from './data'
import { ancestors } from './data'

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true } catch {
    const ta = document.createElement('textarea')
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select()
    const ok = document.execCommand('copy'); ta.remove(); return ok
  }
}

export function plainText(d: Data, id: string): string {
  const n = d.nodes.get(id)!
  const cites = (n.sources ?? []).map((s) => `${s.module} slides ${s.slides.join(', ')}`).join('; ')
  return [`${n.label} (${n.type})`, n.summary, '', n.details ?? '', n.keyTerms?.length ? `Key terms: ${n.keyTerms.join(', ')}` : '', n.examTips ? `Exam tip: ${n.examTips}` : '', cites ? `Sources: ${cites}` : ''].filter((x, i) => x || i === 2).join('\n').trim()
}

export function aiContext(d: Data, id: string): string {
  const n = d.nodes.get(id)!
  const path = [...ancestors(d, id), id].map((x) => d.nodes.get(x)!.label).join(' > ')
  const o: string[] = [`# Concept: ${n.label}`, `Type: ${n.type} | Module: ${n.module ?? '-'} | Importance: ${n.importance}/3`, `Path: ${path}`, '', `**Summary:** ${n.summary}`, '']
  if (n.details) o.push(n.details, '')
  if (n.keyTerms?.length) o.push(`Key terms: ${n.keyTerms.join(', ')}`, '')
  if (n.examTips) o.push(`Exam tip: ${n.examTips}`, '')
  o.push('## Related concepts')
  if (n.parent && d.nodes.has(n.parent)) o.push(`- parent: ${d.nodes.get(n.parent)!.label} - ${d.nodes.get(n.parent)!.summary}`)
  for (const c of d.children.get(id) ?? []) o.push(`- child: ${d.nodes.get(c)!.label} - ${d.nodes.get(c)!.summary}`)
  for (const { edge, other } of d.edgesOf.get(id) ?? []) {
    const m = d.nodes.get(other)!
    o.push(`- ${edge.type}${edge.label ? ` (${edge.label})` : ''}: ${m.label} [${m.module ?? ''}] - ${m.summary}`)
  }
  o.push('', '## Source slides')
  for (const s of n.sources ?? []) for (const sl of s.slides) {
    const c = d.chunkMap.get(`${s.module}-s${sl}`)
    if (!c) continue
    o.push(`**[${s.module} s${sl}] ${c.title}**`, ...c.text.trim().split('\n').map((l) => '> ' + l))
    if (c.notes) o.push(`> Notes: ${c.notes.trim().slice(0, 600)}`)
    o.push('')
  }
  return o.join('\n')
}

export function outline(d: Data, id: string): string {
  const o: string[] = []
  const w = (x: string, lvl: number) => {
    const n = d.nodes.get(x)!
    const cite = (n.sources ?? []).map((s) => `${s.module} s${s.slides.join(',')}`).join('; ')
    o.push(`${'  '.repeat(lvl)}- **${n.label}**${n.summary ? ' - ' + n.summary : ''}${cite ? ` [${cite}]` : ''}`)
    for (const c of d.children.get(x) ?? []) w(c, lvl + 1)
  }
  w(id, 0)
  return o.join('\n')
}
