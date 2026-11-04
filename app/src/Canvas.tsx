import { memo, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import {
  Background, BackgroundVariant, Controls, Handle, MiniMap, Position, ReactFlow, applyNodeChanges, useInternalNode, useReactFlow,
  type Edge, type EdgeProps, type Node, type NodeChange, type NodeProps,
} from '@xyflow/react'
import { useState } from 'react'
import type { Data } from './data'
import { CARD_H, CARD_W, computeLayout, type Pos } from './layout'
import type { LayoutMode } from './types'
import { ActionsCtx } from './ui'

export type CardData = {
  label: string; summary: string; type: string; color: string; importance: number; slides: number
  nKids: number; expanded: boolean; selected: boolean; reviewed: boolean; dim: boolean; depth: number
}
type CardNode = Node<CardData, 'card'>

const TYPE_LABEL: Record<string, string> = { 'case-study': 'case study' }

const Card = memo(function Card({ id, data }: NodeProps<CardNode>) {
  const act = useContext(ActionsCtx)
  const cls = ['card', `t-${data.type}`, data.selected && 'sel', data.reviewed && 'rev', data.dim && 'dim', data.expanded && 'open'].filter(Boolean).join(' ')
  return (
    <div className={cls} style={{ ['--c' as any]: data.color }}>
      <Handle type="target" position={Position.Left} className="ghost-handle" isConnectable={false} />
      <Handle type="source" position={Position.Right} className="ghost-handle" isConnectable={false} />
      <div className="drag-handle" title="Drag here to move this card">
        <span className="grip">&#8942;&#8942;</span>
        <span className="ty">{TYPE_LABEL[data.type] ?? data.type}</span>
        <span className="imp" title={`Importance ${data.importance}/3`}>
          {[1, 2, 3].map((i) => <i key={i} className={i <= data.importance ? 'on' : ''} />)}
        </span>
        {data.slides > 0 && <span className="sl" title="Cited slides">{data.slides} sl.</span>}
        <button className={'rv nodrag nopan' + (data.reviewed ? ' on' : '')} title="Mark reviewed (R)" onClick={(e) => { e.stopPropagation(); act.review(id) }}>&#10003;</button>
      </div>
      <div
        className="card-body nodrag nopan"
        onClick={() => { if (window.getSelection()?.toString()) return; act.activate(id) }}
      >
        <div className="lbl">{data.label}</div>
        {data.summary && <div className="sum">{data.summary}</div>}
      </div>
      {data.nKids > 0 && (
        <button className="exp nodrag nopan" title={data.expanded ? 'Collapse' : 'Expand'} onClick={(e) => { e.stopPropagation(); act.toggle(id) }}>
          {data.expanded ? '−' : `+${data.nKids}`}
        </button>
      )}
    </div>
  )
})

interface Rect { x: number; y: number; w: number; h: number; cx: number; cy: number }
const rectOf = (n: any): Rect => {
  const w = n.measured?.width ?? CARD_W, h = n.measured?.height ?? CARD_H
  const x = n.internals.positionAbsolute.x, y = n.internals.positionAbsolute.y
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 }
}
const edgePoint = (r: Rect, ox: number, oy: number) => {
  const dx = ox - r.cx, dy = oy - r.cy
  if (!dx && !dy) return { x: r.cx, y: r.cy }
  const k = Math.min(dx ? r.w / 2 / Math.abs(dx) : Infinity, dy ? r.h / 2 / Math.abs(dy) : Infinity)
  return { x: r.cx + dx * k, y: r.cy + dy * k }
}

type EData = { kind: 'tree' | 'cross'; mode: LayoutMode; color: string; hl: boolean; label?: string; etype?: string }
const FloatEdge = memo(function FloatEdge({ source, target, data }: EdgeProps<Edge<EData>>) {
  const s = useInternalNode(source), t = useInternalNode(target)
  if (!s || !t || !data) return null
  const sr = rectOf(s), tr = rectOf(t)
  let d: string, mx: number, my: number
  if (data.kind === 'tree' && data.mode === 'lr' && tr.x >= sr.x + sr.w) {
    const sx = sr.x + sr.w, tx = tr.x, m = (sx + tx) / 2
    d = `M${sx},${sr.cy} C${m},${sr.cy} ${m},${tr.cy} ${tx},${tr.cy}`
    mx = m; my = (sr.cy + tr.cy) / 2
  } else {
    const a = edgePoint(sr, tr.cx, tr.cy), b = edgePoint(tr, sr.cx, sr.cy)
    if (data.kind === 'tree') { d = `M${a.x},${a.y} L${b.x},${b.y}`; mx = (a.x + b.x) / 2; my = (a.y + b.y) / 2 } else {
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1
      const off = Math.min(160, len * 0.22)
      const cx = (a.x + b.x) / 2 - (dy / len) * off, cy = (a.y + b.y) / 2 + (dx / len) * off
      d = `M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`
      mx = 0.25 * a.x + 0.5 * cx + 0.25 * b.x; my = 0.25 * a.y + 0.5 * cy + 0.25 * b.y
    }
  }
  return (
    <g className={`fedge ${data.kind}${data.hl ? ' hl' : ''}`}>
      <path d={d} className="ep" style={{ stroke: data.kind === 'tree' ? data.color : undefined }} />
      {data.kind === 'cross' && <path d={d} className="hit"><title>{`${data.etype}${data.label ? ': ' + data.label : ''}`}</title></path>}
      {data.hl && data.label && <text x={mx} y={my} className="elabel" textAnchor="middle">{data.label}</text>}
    </g>
  )
})

const nodeTypes = { card: Card }
const edgeTypes = { float: FloatEdge }
const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)

export interface CanvasProps {
  data: Data
  vis: string[]
  expanded: Set<string>
  selectedId: string | null
  reviewed: Set<string>
  highlight: Set<string> | null
  mode: LayoutMode
  showLinks: boolean
  overrides: Record<string, Pos>
  focus: { id: string; n: number; zoom?: number } | null
  fitReq: number
  onDragStop: (id: string, p: Pos) => void
  onBackgroundClick: () => void
  children?: React.ReactNode
}

export default function Canvas(p: CanvasProps) {
  const { data, vis, mode } = p
  const rf = useReactFlow()
  const [nodes, setNodes] = useState<CardNode[]>([])
  const curPos = useRef(new Map<string, Pos>())
  const raf = useRef(0)
  const cache = useRef(new Map<string, CardData>())
  const st = useRef(p)
  st.current = p

  const target = useMemo(() => {
    const base = computeLayout(data, vis, mode)
    for (const [id, o] of Object.entries(p.overrides)) if (base.has(id)) base.set(id, o)
    return base
  }, [data, vis, mode, p.overrides])

  const getData = useCallback((id: string): CardData => {
    const s = st.current, n = data.nodes.get(id)!
    const next: CardData = {
      label: n.label, summary: n.summary, type: n.type, color: data.moduleColor(n.module), importance: n.importance,
      slides: (n.sources ?? []).reduce((a, x) => a + x.slides.length, 0),
      nKids: (data.children.get(id) ?? []).length, expanded: s.expanded.has(id), selected: s.selectedId === id,
      reviewed: s.reviewed.has(id), dim: s.highlight ? !s.highlight.has(id) : false, depth: data.depth.get(id) ?? 0,
    }
    const old = cache.current.get(id)
    if (old && (Object.keys(next) as (keyof CardData)[]).every((k) => old[k] === next[k])) return old
    cache.current.set(id, next)
    return next
  }, [data])

  // Layout tween
  useEffect(() => {
    cancelAnimationFrame(raf.current)
    const from = new Map(curPos.current)
    const visSet = new Set(vis)
    const nearest = (id: string): string | undefined => { let c = data.nodes.get(id)?.parent; while (c && !visSet.has(c)) c = data.nodes.get(c)?.parent; return c ?? undefined }
    const startOf = (id: string): Pos => from.get(id) ?? from.get(nearest(id) ?? '') ?? target.get(id)!
    const leaving = [...from.keys()].filter((id) => !visSet.has(id) && data.nodes.has(id))
    const endOf = (id: string): Pos => target.get(nearest(id) ?? '') ?? from.get(id)!
    const big = vis.length > 450
    let moved = false
    for (const id of vis) { const a = startOf(id), b = target.get(id)!; if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 1) { moved = true; break } }
    const t0 = performance.now(), dur = moved && !big && curPos.current.size ? 420 : 0
    const frame = (now: number) => {
      const k = dur ? ease(Math.min(1, (now - t0) / dur)) : 1
      const pos = new Map<string, Pos>()
      for (const id of vis) { const a = startOf(id), b = target.get(id)!; pos.set(id, k >= 1 ? b : { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }) }
      const gone = new Map<string, Pos>()
      if (k < 1) for (const id of leaving) { const a = from.get(id)!, b = endOf(id); gone.set(id, { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }) }
      curPos.current = pos
      setNodes((prev) => {
        const pm = new Map(prev.map((n) => [n.id, n]))
        const mk = (id: string, position: Pos): CardNode => {
          const old = pm.get(id)
          return old ? { ...old, position, data: getData(id) } : { id, type: 'card', position, data: getData(id), dragHandle: '.drag-handle', selectable: false, connectable: false, draggable: true }
        }
        return [...[...gone].map(([id, ps]) => mk(id, ps)), ...vis.map((id) => mk(id, pos.get(id)!))]
      })
      if (k < 1) raf.current = requestAnimationFrame(frame)
    }
    raf.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  // Flag updates without relayout
  useEffect(() => {
    setNodes((prev) => prev.map((n) => { const d = getData(n.id); return d === n.data ? n : { ...n, data: d } }))
  }, [p.selectedId, p.reviewed, p.highlight, p.expanded, getData])

  const onNodesChange = useCallback((ch: NodeChange<CardNode>[]) => {
    for (const c of ch) if (c.type === 'position' && c.position) curPos.current.set(c.id, c.position)
    setNodes((prev) => applyNodeChanges(ch, prev))
  }, [])

  // Fly to a node
  const handled = useRef(0)
  useEffect(() => {
    const f = p.focus
    if (!f || handled.current === f.n) return
    const ps = target.get(f.id)
    if (!ps) return
    handled.current = f.n
    setTimeout(() => rf.setCenter(ps.x + CARD_W / 2, ps.y + CARD_H / 2, { zoom: f.zoom ?? Math.max(rf.getZoom(), 0.85), duration: 700 }), 90)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.focus, target])

  useEffect(() => {
    if (!p.fitReq) return
    const t = setTimeout(() => rf.fitView({ duration: 700, padding: 0.12 }), 480)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.fitReq])

  const edges = useMemo(() => {
    const out: Edge<EData>[] = []
    const visSet = new Set(vis)
    for (const id of vis) {
      const par = data.nodes.get(id)?.parent
      if (par && visSet.has(par)) out.push({ id: `t-${id}`, source: par, target: id, type: 'float', selectable: false, focusable: false, data: { kind: 'tree', mode, color: data.moduleColor(data.nodes.get(id)!.module), hl: p.selectedId === id || p.selectedId === par } })
    }
    if (p.showLinks) data.graph.edges.forEach((e, i) => {
      if (!visSet.has(e.source) || !visSet.has(e.target)) return
      out.push({ id: `x-${i}`, source: e.source, target: e.target, type: 'float', selectable: false, focusable: false, data: { kind: 'cross', mode, color: '#94a3b8', hl: p.selectedId === e.source || p.selectedId === e.target, label: e.label, etype: e.type } })
    })
    return out
  }, [data, vis, mode, p.showLinks, p.selectedId])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onNodeDragStop={(_, n) => p.onDragStop(n.id, n.position)}
      onPaneClick={p.onBackgroundClick}
      minZoom={0.04}
      maxZoom={2.2}
      nodesConnectable={false}
      elementsSelectable={false}
      disableKeyboardA11y
      deleteKeyCode={null}
      selectionKeyCode={null}
      zoomOnDoubleClick={false}
      nodeDragThreshold={3}
      onlyRenderVisibleElements
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={28} size={1.4} color="#d9dee7" />
      <Controls showInteractive={false} position="bottom-left" />
      <MiniMap style={{ width: 170, height: 120 }} pannable zoomable position="bottom-right" nodeColor={(n) => (n.data as CardData).color} nodeStrokeWidth={0} maskColor="rgba(241,245,249,.7)" />
      {p.children}
    </ReactFlow>
  )
}
