import MiniSearch from 'minisearch'
import type { Chunk, GEdge, GModule, GNode, Graph } from './types'

export const BASE = import.meta.env.BASE_URL
export const PALETTE = ['#2563eb', '#d97706', '#059669', '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#dc2626']
export const NEUTRAL = '#475569'

export interface Data {
  graph: Graph
  sample: boolean
  nodes: Map<string, GNode>
  rootId: string
  children: Map<string, string[]>
  depth: Map<string, number>
  modules: GModule[]
  moduleColor: (m?: string | null) => string
  chunks: Chunk[]
  chunkMap: Map<string, Chunk>
  decks: Map<string, Chunk[]>
  edgesOf: Map<string, { edge: GEdge; other: string }[]>
  slideNodes: Map<string, string[]>
  nodeSearch: MiniSearch<any>
  slideSearch: MiniSearch<any>
  keep3: Set<string>
}

export const slideKey = (m: string, s: number) => `${m}-s${s}`

export async function loadData(): Promise<Data> {
  const [graph, chunkText] = await Promise.all([
    fetch(BASE + 'data/graph.json', { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error('graph.json: ' + r.status); return r.json() as Promise<Graph> }),
    fetch(BASE + 'data/chunks.jsonl', { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error('chunks.jsonl: ' + r.status); return r.text() }),
  ])
  const chunks: Chunk[] = chunkText.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
  const nodes = new Map<string, GNode>()
  for (const n of graph.nodes) nodes.set(n.id, n)
  const children = new Map<string, string[]>()
  let rootId = ''
  for (const n of graph.nodes) {
    if (n.parent && nodes.has(n.parent)) {
      if (!children.has(n.parent)) children.set(n.parent, [])
      children.get(n.parent)!.push(n.id)
    } else if (!rootId || n.type === 'root') rootId = n.id
  }
  const depth = new Map<string, number>()
  const walk = (id: string, d: number) => { depth.set(id, d); for (const c of children.get(id) ?? []) walk(c, d + 1) }
  walk(rootId, 0)

  let modules = graph.modules ?? []
  if (!modules.length) {
    const seen = [...new Set(graph.nodes.map((n) => n.module).filter(Boolean) as string[])]
    modules = seen.map((id) => ({ id, title: nodes.get(id.toLowerCase())?.label ?? id }))
  }
  const colors = new Map<string, string>()
  modules.forEach((m, i) => colors.set(m.id, m.color || PALETTE[i % PALETTE.length]))
  const moduleColor = (m?: string | null) => (m && colors.get(m)) || NEUTRAL

  const chunkMap = new Map<string, Chunk>()
  const decks = new Map<string, Chunk[]>()
  for (const c of chunks) {
    chunkMap.set(slideKey(c.module, c.slide), c)
    if (!decks.has(c.module)) decks.set(c.module, [])
    decks.get(c.module)!.push(c)
  }
  for (const d of decks.values()) d.sort((a, b) => a.slide - b.slide)

  const edgesOf = new Map<string, { edge: GEdge; other: string }[]>()
  for (const e of graph.edges ?? []) {
    if (!nodes.has(e.source) || !nodes.has(e.target)) continue
    if (!edgesOf.has(e.source)) edgesOf.set(e.source, [])
    if (!edgesOf.has(e.target)) edgesOf.set(e.target, [])
    edgesOf.get(e.source)!.push({ edge: e, other: e.target })
    edgesOf.get(e.target)!.push({ edge: e, other: e.source })
  }
  const slideNodes = new Map<string, string[]>()
  for (const n of graph.nodes) for (const s of n.sources ?? []) for (const sl of s.slides) {
    const k = slideKey(s.module, sl)
    if (!slideNodes.has(k)) slideNodes.set(k, [])
    slideNodes.get(k)!.push(n.id)
  }

  const nodeSearch = new MiniSearch({
    fields: ['label', 'summary', 'details', 'terms'],
    idField: 'id',
    searchOptions: { prefix: true, fuzzy: 0.2, boost: { label: 3, terms: 2, summary: 1.5 }, combineWith: 'AND' },
  })
  nodeSearch.addAll(graph.nodes.map((n) => ({ id: n.id, label: n.label, summary: n.summary, details: n.details ?? '', terms: (n.keyTerms ?? []).join(' ') })))
  const slideSearch = new MiniSearch({
    fields: ['title', 'text', 'notes'],
    idField: 'id',
    searchOptions: { prefix: true, fuzzy: 0.2, boost: { title: 2 }, combineWith: 'AND' },
  })
  slideSearch.addAll(chunks.map((c) => ({ id: c.id, title: c.title, text: c.text, notes: c.notes ?? '' })))

  // nodes that are importance 3 or have such a descendant
  const keep3 = new Set<string>()
  const mark = (id: string): boolean => {
    let k = nodes.get(id)!.importance >= 3
    for (const c of children.get(id) ?? []) if (mark(c)) k = true
    if (k) keep3.add(id)
    return k
  }
  mark(rootId)
  keep3.add(rootId)

  return { graph, sample: !!graph.meta?.sample, nodes, rootId, children, depth, modules, moduleColor, chunks, chunkMap, decks, edgesOf, slideNodes, nodeSearch, slideSearch, keep3 }
}

export function ancestors(d: Data, id: string): string[] {
  const out: string[] = []
  let cur = d.nodes.get(id)?.parent
  while (cur && d.nodes.has(cur)) { out.unshift(cur); cur = d.nodes.get(cur)!.parent }
  return out
}
export function descendants(d: Data, id: string): string[] {
  const out: string[] = []
  const w = (x: string) => { for (const c of d.children.get(x) ?? []) { out.push(c); w(c) } }
  w(id)
  return out
}

export const imageUrl = (c: Chunk | undefined) => (c?.image ? BASE + c.image : '')
export const thumbUrl = (c: Chunk | undefined) => (c?.thumb ? BASE + c.thumb : '')
export const pdfUrl = (m: string, page?: number) => `${BASE}pdf/${m}.pdf${page ? '#page=' + page : ''}`
export const originalUrl = (mod?: GModule) => (mod?.file ? BASE + 'ppt/' + encodeURIComponent(mod.file.split('/').pop()!) : '')
