import { hierarchy, tree } from 'd3-hierarchy'
import type { Data } from './data'
import type { LayoutMode } from './types'

export const CARD_W = 248
export const CARD_H = 118
const CARD_H_MAX = 180 // cards grow with summary length

export interface Pos { x: number; y: number }

export function visibleIds(d: Data, expanded: Set<string>, cram: boolean): string[] {
  const out: string[] = []
  const w = (id: string) => {
    if (cram && !d.keep3.has(id)) return
    out.push(id)
    if (expanded.has(id)) for (const c of d.children.get(id) ?? []) w(c)
  }
  w(d.rootId)
  return out
}

/** Returns top-left positions of every visible node. */
export function computeLayout(d: Data, vis: string[], mode: LayoutMode): Map<string, Pos> {
  const visSet = new Set(vis)
  type T = { id: string; children?: T[] }
  const build = (id: string): T => {
    const kids = (d.children.get(id) ?? []).filter((c) => visSet.has(c))
    return kids.length ? { id, children: kids.map(build) } : { id }
  }
  const root = hierarchy<T>(build(d.rootId))
  const out = new Map<string, Pos>()

  if (mode === 'lr') {
    tree<T>().nodeSize([CARD_H_MAX + 16, CARD_W + 90])(root)
    root.each((n) => out.set(n.data.id, { x: n.y!, y: n.x! }))
    return out
  }

  // radial
  tree<T>().size([2 * Math.PI, 1]).separation((a, b) => (a.parent === b.parent ? 1 : 1.35) / Math.max(1, a.depth))(root)
  const byDepth = new Map<number, number[]>()
  root.each((n) => { if (!byDepth.has(n.depth)) byDepth.set(n.depth, []); byDepth.get(n.depth)!.push(n.x!) })
  // radius needed so axis-aligned cards at angles a<b don't overlap: the tangent at angle t is
  // (cos t, sin t), so the spacing needed along it is min(W/|cos t|, H/|sin t|)
  const needFor = (a: number, b: number) => {
    let gap = b - a
    if (gap < 0) gap += 2 * Math.PI
    const t = a + gap / 2, c = Math.abs(Math.cos(t)), s = Math.abs(Math.sin(t))
    const span = Math.min(c > 1e-3 ? (CARD_W + 24) / c : Infinity, s > 1e-3 ? (CARD_H_MAX + 24) / s : Infinity)
    return span / (2 * Math.sin(Math.min(Math.PI / 2, Math.max(gap, 0.004) / 2)))
  }
  const STAGGER = 310 // radial offset of the outer sub-ring when a level is staggered
  const radius: number[] = [0]
  const staggered = new Map<number, Map<number, boolean>>() // depth -> angle -> on outer sub-ring
  let prevOuter = 0
  const maxDepth = Math.max(...byDepth.keys())
  for (let dep = 1; dep <= maxDepth; dep++) {
    const angs = byDepth.get(dep)!.slice().sort((a, b) => a - b)
    const k = angs.length
    let adj = 0, skip = 0
    for (let i = 0; i < k; i++) {
      if (k > 1 && (i + 1 < k || k > 2)) adj = Math.max(adj, needFor(angs[i], angs[(i + 1) % k]))
      if (k > 3 && (i + 2 < k || k > 4)) skip = Math.max(skip, needFor(angs[i], angs[(i + 2) % k]))
    }
    const base = prevOuter + (dep === 1 ? 470 : 340)
    // dense level: alternate neighbours between two sub-rings, so same-ring neighbours are 2 apart
    const useStagger = dep > 1 && k > 8 && adj > base * 1.25 && skip + STAGGER < adj
    const r = Math.max(base, Math.min(useStagger ? skip : adj, 9000))
    radius[dep] = r
    if (useStagger) staggered.set(dep, new Map(angs.map((a, i) => [a, i % 2 === 1])))
    prevOuter = r + (useStagger ? STAGGER : 0)
  }
  root.each((n) => {
    const r = radius[n.depth] + (staggered.get(n.depth)?.get(n.x!) ? STAGGER : 0)
    out.set(n.data.id, { x: r * Math.sin(n.x!) - CARD_W / 2, y: -r * Math.cos(n.x!) - CARD_H / 2 })
  })
  return out
}
